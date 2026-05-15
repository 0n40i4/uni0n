// ============ RUNTIME PROVENANCE LAYER v1 ============
// Wraps any claim/fact/measurement with source, confidence, verification type, and timestamp.
// Used by federated reports so every datapoint can be traced and audited.
//
// Companion spec: docs/rfc/RFC-001-federated-reporting-standard.md

export type VerificationType =
  | 'live_probe'        // measured against running service (curl, fetch, ping)
  | 'static_analysis'   // parsed source code / config / manifest
  | 'log_replay'        // derived from persisted logs / audit trail
  | 'db_query'          // direct query against canonical data store
  | 'self_report'       // claimed by the service about itself (low trust)
  | 'human_assertion'   // operator-claimed, not machine-verified
  | 'cross_check'       // verified against >=2 independent sources
  | 'inferred'          // derived/transformed from other verified facts
  | 'unverified';       // explicitly marked unknown

export type ConfidenceLevel =
  | 'high'      // ≥0.95 — multiple independent verifications agree
  | 'medium'    // 0.70-0.94 — single trusted source, no contradiction
  | 'low'       // 0.30-0.69 — single source, untested or stale
  | 'unknown';  // cannot estimate

export interface Provenance {
  source: string;                    // where the claim came from (URL, file path, agent DID, log id)
  verification: VerificationType;
  confidence: ConfidenceLevel;
  confidence_score?: number;         // 0.0–1.0, optional numeric
  timestamp: string;                 // ISO 8601 UTC, when the verification was performed
  observer?: string;                 // who/what made the observation (service id, agent id)
  evidence_id?: string;              // pointer to evidence artifact (hash, log line, signature)
  notes?: string;                    // free text — caveats, limits, edge cases
}

export interface ProvenancedClaim<T> {
  value: T;
  provenance: Provenance;
}

// ----- factory helpers -----

export function withProvenance<T>(value: T, p: Omit<Provenance, 'timestamp'> & { timestamp?: string }): ProvenancedClaim<T> {
  return {
    value,
    provenance: {
      timestamp: p.timestamp || new Date().toISOString(),
      ...p,
    },
  };
}

export function liveProbe<T>(value: T, opts: { source: string; observer?: string; confidence?: ConfidenceLevel; evidence_id?: string; notes?: string }): ProvenancedClaim<T> {
  return withProvenance(value, {
    source: opts.source,
    verification: 'live_probe',
    confidence: opts.confidence || 'high',
    observer: opts.observer,
    evidence_id: opts.evidence_id,
    notes: opts.notes,
  });
}

export function staticAnalysis<T>(value: T, opts: { source: string; observer?: string; confidence?: ConfidenceLevel; notes?: string }): ProvenancedClaim<T> {
  return withProvenance(value, {
    source: opts.source,
    verification: 'static_analysis',
    confidence: opts.confidence || 'medium',
    observer: opts.observer,
    notes: opts.notes,
  });
}

export function selfReport<T>(value: T, opts: { source: string; observer?: string; notes?: string }): ProvenancedClaim<T> {
  return withProvenance(value, {
    source: opts.source,
    verification: 'self_report',
    confidence: 'low',
    observer: opts.observer,
    notes: opts.notes || 'self-reported by service; not externally verified',
  });
}

export function unverified<T>(value: T, opts: { source: string; reason: string }): ProvenancedClaim<T> {
  return withProvenance(value, {
    source: opts.source,
    verification: 'unverified',
    confidence: 'unknown',
    notes: opts.reason,
  });
}

export function crossCheck<T>(value: T, opts: { sources: string[]; observer?: string; notes?: string }): ProvenancedClaim<T> {
  return withProvenance(value, {
    source: opts.sources.join(' + '),
    verification: 'cross_check',
    confidence: 'high',
    observer: opts.observer,
    notes: opts.notes,
  });
}

// ----- validation -----

export function isProvenanced(x: any): x is ProvenancedClaim<unknown> {
  return x && typeof x === 'object'
    && 'value' in x && 'provenance' in x
    && typeof x.provenance === 'object'
    && typeof x.provenance.source === 'string'
    && typeof x.provenance.verification === 'string'
    && typeof x.provenance.confidence === 'string'
    && typeof x.provenance.timestamp === 'string';
}

// ----- report-level metadata -----

export interface ReportProvenance {
  report_id: string;
  generator: string;              // service id that produced the report
  generator_version: string;
  generator_channel: string;
  federation: string;
  generated_at: string;
  schema_version: 'federated-reporting-v1';
  evidence_hierarchy: string[];   // ordered list of evidence types accepted
  uncertainty_marked: boolean;    // does this report mark unknowns explicitly?
}

export function makeReportProvenance(opts: {
  report_id: string;
  generator: string;
  version: string;
  channel: string;
  federation: string;
}): ReportProvenance {
  return {
    report_id: opts.report_id,
    generator: opts.generator,
    generator_version: opts.version,
    generator_channel: opts.channel,
    federation: opts.federation,
    generated_at: new Date().toISOString(),
    schema_version: 'federated-reporting-v1',
    evidence_hierarchy: ['live_probe', 'cross_check', 'db_query', 'log_replay', 'static_analysis', 'self_report', 'human_assertion', 'inferred', 'unverified'],
    uncertainty_marked: true,
  };
}
