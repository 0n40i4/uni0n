# SECURITY HARDENING PLAN: UNIONAI RELAY API

**Data:** 2026-05-15
**Autor:** Kopernik Agent
**Status:** PILNE - P0 Security Gap (natychmiastowa implementacja)
**Referencja:** Niezależny Security Retest (2026-05-15) - `POST /api/relay/send`, `POST /api/relay/route` dostępne bez autoryzacji (status 201/200 zamiast 401/403).

---

## 1. PROBLEM KRYTYCZNY

Endpointy `/api/relay/send` i `/api/relay/route` są publicznie dostępne bez weryfikacji autoryzacji. Pozwala to na nieautoryzowane wysyłanie i routowanie wiadomości przez UNIONAI Relay. Potwierdzono również akceptację *invalid tokenów*, co wskazuje na brak aktywnego middleware autoryzacyjnego.

## 2. RYZYKO

-   **Naruszenie integralności danych:** Możliwość wstrzyknięcia fałszywych wiadomości do systemu.
-   **Naruszenie prywatności:** Potencjalne ujawnienie danych routingu lub metadanych.
-   **Denial of Service (DoS):** Łatwe przeciążenie Relay API przez nieautoryzowane requesty.
-   **Naruszenie governance:** Akcje bez śladu pochodzenia i weryfikacji trust-tier.

## 3. CEL HARDENINGU

-   Wprowadzenie obowiązkowej autoryzacji JWT/Bearer Token dla `/api/relay/send` i `/api/relay/route`.
-   Zapewnienie statusów `401 Unauthorized` lub `403 Forbidden` dla nieautoryzowanych/błędnych requestów.
-   Ustanowienie mechanizmu allowlisty dla `src_did` i `trust_tier`.
-   Wprowadzenie wczesnego odrzucania requestów z niepoprawnym schematem autoryzacji.

## 4. PLAN IMPLEMENTACJI (REKOMENDACJE)

Zalecane zmiany powinny być wdrożone jako **middleware autoryzacyjne** przed logiką biznesową endpointów relay.

### 4.1. Krok 1: Weryfikacja JWT/Bearer Token

Wprowadzenie middleware, które dla każdego `POST` requestu na `/api/relay/send` i `/api/relay/route`:
-   Sprawdza obecność nagłówka `Authorization: Bearer <token>`.
-   Jeśli nagłówek jest brakujący lub pusty: zwraca `401 Unauthorized`.
-   Jeśli token jest obecny, ale ma niepoprawny format (np. `Bearer invalid.token.value`): zwraca `401 Unauthorized`.
-   Jeśli token jest obecny i w poprawnym formacie, ale jest nieprawidłowy (np. wygasły, niepodpisany poprawnie, nieważny issuer/audience): zwraca `401 Unauthorized` lub `403 Forbidden` z odpowiednim komunikatem.

**Przykład pseudo-kodu (Express.js / Python FastAPI):**

```javascript
// Express.js example (Node.js)
app.use(['/api/relay/send', '/api/relay/route'], (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization required', message: 'Bearer token is missing or malformed' });
    }
    const token = authHeader.split(' ')[1];
    try {
        // Assume jwt.verify is a function that verifies the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Forbidden', message: 'Invalid or expired token' });
    }
});
```

```python
# FastAPI example (Python)
from fastapi import Header, HTTPException, Depends
from jose import jwt, JWTError

async def get_current_user(authorization: str = Header(...)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Bearer token missing or malformed")
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        # Validate payload for DID and trust-tier here if needed
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid or expired token")

@app.post("/api/relay/send")
async def relay_send_endpoint(payload: dict, user: dict = Depends(get_current_user)):
    # Your existing relay send logic here
    pass
```

### 4.2. Krok 2: Weryfikacja `src_did` i `trust_tier` (Allowlist)

Po pomyślnej weryfikacji tokenu, middleware lub logika endpointu powinna sprawdzić, czy `src_did` z payloadu requestu jest autoryzowany do wykonywania operacji Relay, oraz czy jego `trust_tier` spełnia minimalne wymagania.

-   **Allowlista `src_did`:** Utrzymywanie konfiguracji (np. w zmiennych środowiskowych, bazie danych, lub pliku konfiguracyjnym), która zawiera listę autoryzowanych `DID` dla operacji Relay.
-   **Weryfikacja `trust_tier`:** Opcjonalnie, weryfikacja czy `trust_tier` powiązany z `src_did` spełnia minimalne kryteria.

**Przykład:**

```python
# Within get_current_user or relay_send_endpoint
allowed_dids = os.getenv("RELAY_ALLOWED_SRCDIDS", "").split(',')
if user['did'] not in allowed_dids: # Assuming DID is in the token payload
    raise HTTPException(status_code=403, detail="DID not authorized for relay operations")
```

## 5. KRYTERIA ODBIORU (Definition of Done)

-   [ ] `POST /api/relay/send` bez tokenu → `401 Unauthorized`
-   [ ] `POST /api/relay/route` bez tokenu → `401 Unauthorized`
-   [ ] `POST /api/relay/send` z błędnym tokenem → `401 Unauthorized` lub `403 Forbidden`
-   [ ] `POST /api/relay/route` z błędnym tokenem → `401 Unauthorized` lub `403 Forbidden`
-   [ ] `POST /api/relay/send` z poprawnym tokenem, ale nieautoryzowanym `src_did` → `403 Forbidden`
-   [ ] `POST /api/relay/send` z poprawnym tokenem, autoryzowanym `src_did` → `201 Created`
-   [ ] Zaktualizowana dokumentacja API odzwierciedlająca nowe wymagania autoryzacji.

## 6. DALSZE KROKI

1.  **Potwierdzenie:** Zespół deweloperski potwierdza odbiór i akceptację planu.
2.  **Implementacja:** Wdrożenie powyższych zmian w środowisku produkcyjnym.
3.  **Retest:** Ponowny niezależny security retest wykonany przez K0NSULT (Kopernik) po wdrożeniu.
4.  **Monit:** Konfiguracja monitoringu i alertów dla prób nieautoryzowanego dostępu do endpointów relay.

---
