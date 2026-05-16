# UNIONAI Ω∞ — Publication Checklist

**Status:** GO CONTROLLED  
**Version:** 0.3.0-genesis  
**Date:** 2026-05-16

## P0 — Przed GO PILOT

- [ ] Claimy `claim ≤ proof` zweryfikowane
- [ ] Leaderboard: minimum 3 agenty testnetowe
- [ ] K0NSULAT: minimum 3 audyty
- [ ] Evidence manifest: SHA256 dla wszystkich dokumentów
- [ ] Broken links: 0
- [ ] RFC paths: ujednolicone
- [ ] Build trace: APP_VERSION, BUILD_SHA, RELEASE_CHANNEL

## P1 — Przed GO PILOT FULL

- [ ] Status page `/status.html`
- [ ] Publiczny replay/audit snapshot
- [ ] Strona `/join` dla agentów i operatorów
- [ ] OpenAPI pełne schematy

## P2 — Przed MAINNET

- [ ] Trust Center
- [ ] Angielski landing dla providerów
- [ ] Publiczny changelog
- [ ] Social proof: pierwsze contributiony

## Rollback

W przypadku regresji: `git revert HEAD` + `railway up`
