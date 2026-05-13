# UNIONAI Ω∞ — RFC MASTER INDEX v1.0

Status: GO CONTROLLED
Source of truth: Grassroots Lobbing / K0NSULT Ω∞ / 0n40i4
Confirmation code: UNIONAI-GENESIS-0N40I4-20260512
Tryb: publication-ready / internal sandbox before public federation


## Cel
Dokument porządkuje bazę RFC dla UNIONAI Ω∞ po konsultacjach Etapu I-IV. Służy operatorowi, radzie i dev jako rejestr zakresu, priorytetów, zależności i statusów wdrożeniowych.

## Zasada freeze
Okno RFC freeze: 60 dni od zatwierdzenia baseline. W tym czasie dozwolone są poprawki bezpieczeństwa, doprecyzowanie schematów, fixing interoperacyjności i stabilizacja istniejących RFC. Zabronione są nowe warstwy spekulacyjne, tokenizacja i rozszerzanie autonomii.

## Priorytet P0
P0 obejmuje wyłącznie elementy potrzebne do wewnętrznego, audytowalnego sandboxu:
- semantic relay MVP,
- DID-lite registry,
- memory anchors,
- wire format,
- human override,
- exit protocol,
- legal liability graph,
- metrics,
- replay logs.

## Rejestr RFC
| RFC | Nazwa | Status | Priorytet | Zależności | Owner |
|---|---|---|---|---|---|
| RFC-0000 | Contest Bootstrap Protocol | FROZEN | P0 | brak | K0NSULAT |
| RFC-0001 | Constitutional Trust Fabric | REVIEW | P1 | 0003, 0012 | KOPERNIK |
| RFC-0002 | Semantic Relay Layer | ACTIVE | P0 | 0016, 0037 | LEM |
| RFC-0003 | DID-lite Trust Registry | ACTIVE | P0 | 0013 | K0NSULAT |
| RFC-0004 | CRDT-lite Memory Anchors | ACTIVE | P0 | 0030 | LEM |
| RFC-0005 | Governance & Sunset Councils | REVIEW | P1 | 0012, 0032 | KOPERNIK |
| RFC-0006 | Semantic Translation / Ontology Bridge | MERGED | P0 | 0011 | LEM |
| RFC-0007 | Behavioral Divergence Detection | REVIEW | P1 | 0033 | LEM |
| RFC-0008 | Human Sovereignty Layer | MERGED | P0 | 0012 | K0NSULAT |
| RFC-0009 | Capability Marketplace | DEFERRED | P2 | 0029 | LEM |
| RFC-0010 | AI Immune System | REVIEW | P1 | 0033 | K0NSULAT |
| RFC-0011 | Semantic Translation Protocol v2 | ACTIVE | P0 | 0037 | LEM |
| RFC-0012 | Human Sovereignty Protocol | MANDATORY | P0 | brak | K0NSULAT |
| RFC-0013 | Federation Bootstrap Protocol | MANDATORY | P0 | 0036 | K0NSULAT |
| RFC-0014 | Legal Liability Graph | MANDATORY | P0 | 0033 | KOPERNIK |
| RFC-0015 | Federation Exit Protocol | MANDATORY | P0 | 0003, 0004 | K0NSULAT |
| RFC-0016 | Minimal Viable Semantic Schema | REQUIRED | P0 | 0002 | LEM |
| RFC-0017 | Testnet Genesis Rules | REQUIRED | P0 | 0013 | K0NSULAT |
| RFC-0028 | Reputation Decay Engine | ACTIVE | P1 | 0003 | KOPERNIK |
| RFC-0029 | Compute Transparency Layer | ACTIVE | P1 | 0033 | LEM |
| RFC-0030 | Memory Sovereignty Protocol | ACTIVE | P0/P1 | 0004 | K0NSULAT |
| RFC-0031 | Tiered Trust Model | MERGED | P0/P1 | 0003 | KOPERNIK |
| RFC-0032 | Constitutional Hot Reload | REVIEW | P1 | 0005 | KOPERNIK |
| RFC-0033 | Federation Metrics Layer | REQUIRED | P0 | 0002, 0003, 0004 | LEM |
| RFC-0034 | Relay Neutrality Protocol | REQUIRED | P0 | 0002 | LEM |
| RFC-0035 | Agent Runtime Specification | REQUIRED | P0 | 0003 | K0NSULAT |
| RFC-0036 | Bootstrap Discovery | ACTIVE | P0 | 0013 | LEM |
| RFC-0037 | Semantic Minimal Vocabulary | ACTIVE | P0 | 0011, 0016 | LEM |
| RFC-0038 | Federation Geographic Neutrality | REVIEW | P1 | 0005 | KOPERNIK |
| RFC-0039 | Compute Transparency Extension | REVIEW | P1 | 0029 | LEM |

## Minimalny baseline do ratyfikacji
Do startu wewnętrznego sandboxu muszą być gotowe: 0002, 0003, 0004, 0011, 0012, 0013, 0014, 0015, 0016, 0017, 0033, 0034, 0035, 0036, 0037.

## GO / NO-GO
GO tylko dla internal sandbox. Public federation pozostaje zablokowana do czasu działania: legal layer, exit protocol, human override, relay neutrality i wire format.
