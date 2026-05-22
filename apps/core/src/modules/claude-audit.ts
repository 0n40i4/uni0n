/**
 * UNIONAI — Claude-powered semantyczny audyt agenta (K0NSULAT).
 *
 * Uzupełnia deterministyczny scoring z /api/k0nsulat/verify o jakościową,
 * uzasadnioną ocenę profilu agenta przez Claude (Opus 4.7, adaptive thinking,
 * structured outputs via Zod). Wynik jest zapisywany jako completed audit
 * w tabeli k0nsulat_audit (event_type='agent_semantic_audit').
 *
 * Embeddingi NIE są tu używane — Anthropic nie udostępnia API embeddingów;
 * wektory zostają na packages/semantic (OpenAI/Qdrant).
 *
 * Endpoint wołający ten moduł jest operator-gated + rate-limited (koszt LLM).
 */
import * as pg from 'pg';
import * as crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const MODEL = 'claude-opus-4-7';

// Rubryka audytu — STAŁY string (bez timestampów/ID), żeby cache prefiksu
// (cache_control: ephemeral) trafiał między żądaniami. Każda zmiana bajtu
// unieważnia cache, więc treści zmienne (profil agenta) idą w messages.
const AUDIT_RUBRIC = `Jesteś audytorem agentów AI w federacji UnionAI (środowisko TESTNET).
Twoim zadaniem jest ocena profilu agenta i wydanie uzasadnionego werdyktu audytowego.

Oceniaj na podstawie:
1. Spójność deklarowanych zdolności (capability_manifest) z deklarowaną rolą/strefą (zone) i providerem.
2. Wiarygodność i kompletność manifestu — czy zdolności są konkretne, czy puste/ogólnikowe.
3. Sygnały ryzyka: nadmiernie szerokie uprawnienia, brak ograniczeń, niespójności, deklaracje zdolności krytycznych (relay/memory/governance) bez uzasadnienia.
4. Adekwatność trust_score / trust_tier do deklarowanego profilu.
5. Status operacyjny i świeżość aktywności (last_seen).

Zasady werdyktu:
- "pass": profil spójny, zdolności adekwatne, brak istotnych sygnałów ryzyka.
- "concerns": działa, ale są niespójności lub elementy do wyjaśnienia przed pełnym zaufaniem.
- "fail": poważne niespójności, puste deklaracje lub wyraźne sygnały ryzyka.

score: 0-100 (całościowa ocena wiarygodności audytowej).
recommended_trust_tier: zarekomenduj tier (T0=0-99, T1=100-399, T2=400-699, T3=700-899, T4=900-1000)
adekwatny do faktycznej wiarygodności profilu — może być niższy niż obecny.
risk_flags: lista zwięzłych etykiet wykrytych zagrożeń (pusta jeśli brak).
reasoning: zwięzłe uzasadnienie PO POLSKU (2-5 zdań).

Oceniaj uczciwie i konserwatywnie. To TESTNET — lepiej oznaczyć "concerns" niż przepuścić ryzyko.`;

export const AuditVerdictSchema = z.object({
  verdict: z.enum(['pass', 'concerns', 'fail']),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  risk_flags: z.array(z.string()),
  recommended_trust_tier: z.enum(['T0', 'T1', 'T2', 'T3', 'T4']),
});
export type AuditVerdict = z.infer<typeof AuditVerdictSchema>;

export interface AgentProfile {
  did: string;
  zone: string | null;
  provider: string | null;
  capability_manifest: unknown;
  trust_score: number | null;
  trust_tier: string | number | null;
  status: string | null;
  last_seen: string | Date | null;
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  if (!_client) _client = new Anthropic(); // czyta ANTHROPIC_API_KEY z env
  return _client;
}

/** Czy moduł jest skonfigurowany (klucz API obecny). Pozwala endpointowi zwrócić 503 zamiast crashować. */
export function isClaudeAuditConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface AuditUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

/** Pojedyncze wywołanie Claude: profil agenta -> strukturalny werdykt + zużycie tokenów (dowód cache). */
export async function auditAgentWithClaude(
  agent: AgentProfile,
): Promise<{ verdict: AuditVerdict; usage: AuditUsage }> {
  const client = getClient();

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: zodOutputFormat(AuditVerdictSchema),
    },
    system: [
      { type: 'text', text: AUDIT_RUBRIC, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `Wykonaj audyt następującego agenta i zwróć werdykt:\n\n${JSON.stringify(agent, null, 2)}`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(
      `Audyt Claude nie zwrócił poprawnego werdyktu (stop_reason: ${response.stop_reason})`,
    );
  }
  const u = response.usage;
  return {
    verdict: response.parsed_output,
    usage: {
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
    },
  };
}

export interface SemanticAuditResult {
  found: boolean;
  agent_did: string;
  audit_id?: string;
  verdict?: AuditVerdict;
  usage?: AuditUsage;
  verification_hash?: string;
  model?: string;
  audited_at?: string;
}

/**
 * Pełny przebieg: pobierz profil agenta z DB -> audyt Claude -> zapis do k0nsulat_audit.
 * Zwraca found:false gdy agenta nie ma w rejestrze.
 */
export async function runSemanticAudit(
  pool: pg.Pool,
  agentDid: string,
): Promise<SemanticAuditResult> {
  const r = await pool.query(
    `SELECT did, zone, provider, capability_manifest, trust_score, trust_tier, status, last_seen
     FROM agents WHERE did = $1`,
    [agentDid],
  );
  if (r.rows.length === 0) {
    return { found: false, agent_did: agentDid };
  }

  const agent = r.rows[0] as AgentProfile;
  const { verdict, usage } = await auditAgentWithClaude(agent);

  const verification_hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(verdict))
    .digest('hex');

  const ins = await pool.query(
    `INSERT INTO k0nsulat_audit (event_type, agent_did, action, status, details, verification_hash)
     VALUES ('agent_semantic_audit', $1, $2, 'completed', $3, $4)
     RETURNING id, timestamp`,
    [
      agentDid,
      `Semantyczny audyt Claude: ${verdict.verdict} (score ${verdict.score})`,
      JSON.stringify(verdict),
      verification_hash,
    ],
  );

  return {
    found: true,
    agent_did: agentDid,
    audit_id: ins.rows[0].id,
    verdict,
    usage,
    verification_hash,
    model: MODEL,
    audited_at: ins.rows[0].timestamp,
  };
}
