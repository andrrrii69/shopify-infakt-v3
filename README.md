# Shopify → Infakt Integration (v3 API)

This integration listens for Shopify `orders/create` webhooks and creates an invoice in Infakt for a private person client using the Infakt API v3.

## Files

- `index.js` – main Express server
- `.env.example` – example environment variables file
- `README.md` – this instructions file

## Setup

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Edit `.env` and set your Infakt API key:
   ```
   INFAKT_API_KEY=your_actual_infakt_api_key
   ```

3. Install dependencies:
   ```
   npm install express axios dotenv
   ```

4. (Optional) Initialize Git and push to GitHub:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YourUser/shopify-infakt.git
   git push -u origin main
   ```

5. Deploy to Render.com:
   - In Render.com dashboard click **New → Web Service**.
   - Connect your GitHub repo, select `main` branch.
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Add environment variable:
     - `INFAKT_API_KEY`

6. In Shopify Admin, create a webhook:
   - Go to **Settings → Notifications → Webhooks → Create webhook**.
   - Event: **Order creation** (`orders/create`)
   - URL: `https://<YOUR_RENDER_URL>/webhook`
   - Format: **JSON**

7. Test:
   - Place a test order in Shopify.
   - Check Render logs and Infakt for new client and invoice.

## Notes

- This version **does not** verify Shopify webhook HMAC, so keep the endpoint URL secret.
