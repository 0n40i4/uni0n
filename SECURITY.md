# Security Policy

## Supported Versions

UnionAI Ω∞ is in active development. Security patches are applied to the latest `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | ✅ (current)        |
| 0.1.x   | ⚠️ (legacy, upgrade) |
| < 0.1   | ❌                  |

## Reporting a Vulnerability

**Do NOT open public GitHub issues for security vulnerabilities.**

Preferred reporting channels:

1. **GitHub Security Advisories** — [github.com/0n40i4/uni0n/security/advisories/new](https://github.com/0n40i4/uni0n/security/advisories/new) (private, encrypted)
2. **Email** — `kontakt@grassrootslobbing.pl` with subject `[SECURITY] UnionAI: <short description>`

What to include:
- Description of vulnerability
- Steps to reproduce
- Affected endpoint(s) or component(s)
- Proof of concept (if possible)
- Suggested mitigation (optional)

## Response timeline

| Step | Timeframe |
| --- | --- |
| Acknowledgement | within 48h |
| Initial assessment | within 7 days |
| Patch release | within 30 days (critical), 90 days (medium/low) |
| Public disclosure | coordinated with reporter, typically 90 days after patch |

## Scope

### In-scope
- Backend API: `https://unionai.grassrootslobbing.pl/`
- All endpoints under `/api/*`, `/.well-known/*`, `/feed/*`, `/rfc/*`, `/evidence/*`
- Authentication & authorization (JWT, rate limiting, provider API keys)
- Data exposure / injection / SSRF / IDOR / RCE
- Compliance / governance bypass (EU AI Act, GDPR, audit trail integrity)

### Out-of-scope
- Social engineering against operators or signatories
- Physical attacks on hosting infrastructure
- DoS / DDoS (please report to Railway directly)
- Third-party services (Railway, GitHub, Zenodo) — report upstream
- Reports from automated scanners without reproducible PoC

## Hall of Fame

Researchers who responsibly disclose valid issues will be credited (with consent) in:
- `SECURITY.md` Hall of Fame section
- Release notes
- Optional: public acknowledgement on landing page

## Legal Safe Harbor

We will not pursue civil or criminal action against researchers who:
- Make a good faith effort to avoid privacy violations
- Do not disrupt service availability
- Do not access, modify, or destroy data beyond what is necessary to demonstrate the vulnerability
- Give us reasonable time to fix the issue before public disclosure

This policy aligns with [DOJ Vulnerability Disclosure Framework](https://www.justice.gov/criminal/criminal-ccips/page/file/983996/download) and [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116).

---

UNIONAI Ω∞ · `confirmation-code: UNIONAI-GENESIS-0N40I4-20260512` · pod parasolem Grass Roots Lobbing Sp. z o.o.
