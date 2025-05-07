# Shopify → Infakt Integration

## Pliki

- `index.js` – główny serwer HTTP nasłuchujący webhooka.
- `.env.example` – wzór pliku środowiskowego.

## Instrukcja

1. Skopiuj `.env.example` do `.env`:
   ```
   cp .env.example .env
   ```
2. Uzupełnij w `.env`:
   ```
   INFAKT_TOKEN=twój_infakt_token
   ```
3. Zainstaluj zależności:
   ```
   npm install express axios dotenv
   ```
4. (Opcjonalnie) zainicjuj repozytorium Git:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   ```
5. Skonfiguruj zdalne repozytorium i wypchnij:
   ```
   git remote add origin https://github.com/TwojeKonto/shopify-infakt.git
   git push -u origin main
   ```
6. Na Render.com:
   - Zaloguj się i kliknij **New → Web Service**.
   - Wybierz repo `shopify-infakt`, branch `main`.
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Dodaj zmienną środowiskową `INFAKT_TOKEN`.
   - Deploy.

7. W Shopify Admin:
   - Ustaw w **Settings → Notifications → Webhooks** URL:
     ```
     https://<YOUR_RENDER_URL>/webhook
     ```
   - (Bez weryfikacji HMAC w tym wariancie).

8. Złóż testowe zamówienie i sprawdź:
   - Render → **Logs**
   - Infakt → **Kontakty** i **Faktury**

---

**Uwaga**: nie weryfikujemy HMAC – upewnij się, że URL jest ukryty i bezpieczny.