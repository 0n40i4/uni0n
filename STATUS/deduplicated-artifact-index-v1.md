# Deduplicated Artifact Index v1

Updated (UTC): 2026-05-14T03:56:09Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Mode: IMPLEMENTATION READINESS AUDIT

| Artifact | Owner | Status | Claim Level | SHA256 | Duplicate/Superseded refs |
| --- | --- | --- | --- | --- | --- |
| `STATUS/pre-unblock-readiness-audit-2026-05-14.md` | CORE | complete | VERIFIED | `bfb054afaa8413f567203a8eff04195253c8509fb611eda867cb3a82deff5375` | none |
| `STATUS/missing-runtime-inputs-checklist.md` | CORE | complete | VERIFIED | `ea736ed6205ced42bb9c399222e07254151b170527f84c4e55b87f83ffcb992b` | none |
| `STATUS/implementation-readiness-scorecard.md` | CORE | complete | VERIFIED | `3ea8fc3785dc05f58452e59d6920c1b951f1fa4b4d6b47ccdafde532a4f05b77` | none |
| `STATUS/runtime-widget-data-contracts-v1.md` | CORE | complete | VERIFIED | `61bd5774517c31c46cc2c725465064163d4d45e87f455e41504deeb3b7f4c0c3` | canonical v1 |
| `STATUS/runtime-widget-api-map-v1.md` | CORE | complete | VERIFIED | `15a0c0725bb0f43623b8d998bd572ddd6848f7f42066cfb20ef1ba8e2364ac76` | canonical v1 |
| `STATUS/runtime-widget-smoke-pack-v1.md` | CORE | complete | VERIFIED | `8382b226b76e5e8d7abe76401a29892e2c9208fe8f54adcfb1af129fceb6e7df` | canonical v1 |
| `STATUS/governance-overlay-state-machine-v1.md` | KOPERNIK | complete | VERIFIED | `f0aa60a59772ea5e920a0a35e971d679d1d0ba66527bf7295b1c6ae6b71e7c33` | canonical v1 |
| `STATUS/operator-authority-visibility-model-v1.md` | KOPERNIK | complete | VERIFIED | `5667f9939238bff9db4109d5cc832ed2eae2d470b7d1ec4e4876398c9b22742a` | canonical v1 |
| `STATUS/federation-widget-runtime-contract-v1.md` | LEM | complete | VERIFIED | `8d4b082c449883c39e00a4ff2f1bf683b5a514b24cc8be761861bad391040523` | canonical v1 |
| `STATUS/degradation-visibility-rules-v1.md` | LEM | complete | VERIFIED | `a25f2910990a8d24e411c398254643d64f5bfa0af732ed6a3ea87dee7c395856` | canonical v1 |
| `STATUS/operator-cognitive-load-reduction-pack-v1.md` | MICKIEWICZ | complete | VERIFIED | `5de5e1736861ebf07a5ee2e7d18495c125800b43dd95632f7271b1ad2f9805e5` | canonical v1 |
| `STATUS/shared-table-mobile-layout-baseline-v1.md` | MICKIEWICZ | complete | VERIFIED | `d964403ec646bdd7fa5c0fa29ff83e37c191f9f728fe26ddab3985ef7c4a567c` | canonical v1 |

## Deduplication rules (active)
- No new artifact if equivalent scope already exists in canonical v1.
- Update existing canonical artifact instead of creating v2 unless implementation evidence requires schema change.
- Any superseded artifact must explicitly point to canonical replacement in this index.

## Current blocker isolation
- LIVE implementation remains BLOCKED by missing real `chat.k0nsult.cloud` source repo attachment.
