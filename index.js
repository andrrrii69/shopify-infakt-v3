// index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
// Parse JSON bodies
app.use(express.json());
// Logging middleware
app.use((req, res, next) => {
  console.log(`🔍 Incoming request: ${req.method} ${req.url}`, req.body);
  next();
});

const BASE_URL = 'https://api.infakt.pl/api/v3';
const CLIENTS_ENDPOINT = `${BASE_URL}/clients.json`;
const INVOICES_ENDPOINT = `${BASE_URL}/invoices.json`;
const HEADERS = {
  'Content-Type': 'application/json',
  'X-InFakt-ApiKey': process.env.INFAKT_API_KEY
};

app.post('/webhook', async (req, res) => {
  console.log('🔔 Webhook payload:', req.body);
  try {
    const { contact_email, billing_address, line_items } = req.body;

    // 1. Create a new client in Infakt
    const fullName = billing_address
      ? `${billing_address.first_name || ''} ${billing_address.last_name || ''}`.trim()
      : contact_email;

    const newClientPayload = {
      client: {
        company_name: fullName,
        first_name: billing_address?.first_name,
        last_name: billing_address?.last_name,
        email: contact_email,
        phone: billing_address?.phone,
        address: billing_address?.address1,
        city: billing_address?.city,
        zip: billing_address?.zip,
        country: billing_address?.country
      }
    };

    const clientResp = await axios.post(
      CLIENTS_ENDPOINT,
      newClientPayload,
      { headers: HEADERS }
    );

    const clientId = clientResp.data.id || clientResp.data.client?.id;
    if (!clientId) {
      console.error('❌ Brak client.id w odpowiedzi Infakt:', clientResp.data);
      return res.status(500).json({ error: 'Nie udało się utworzyć klienta' });
    }

    // 2. Map Shopify line items to Infakt services
    const vatRate = process.env.INFAKT_DEFAULT_TAX_RATE || '23';
    const flatRate = process.env.INFAKT_DEFAULT_FLAT_RATE || '3';
    const services = line_items.map(item => {
      const netValue = parseFloat(item.price) * item.quantity;
      const taxValue = +(netValue * parseFloat(vatRate) / 100).toFixed(2);
      return {
        name: item.title,
        quantity: item.quantity,
        unit_cost: parseFloat(item.price),
        gross: netValue,
        tax: vatRate,
        tax_values: [
          {
            tax_id: vatRate,
            base: netValue,
            value: taxValue
          }
        ],
        flat_rate: flatRate
      };
    });

    // 3. Create invoice synchronously with Ryczałt and VAT
    const invoicePayload = {
      invoice: {
        client_id: clientId,
        issue_date: new Date().toISOString().slice(0, 10),
        settlement_kind: 'ryczalt',
        settlement_rate: flatRate,
        services
      }
    };

    const invoiceResp = await axios.post(
      INVOICES_ENDPOINT,
      invoicePayload,
      { headers: HEADERS }
    );

    console.log('✅ Faktura utworzona:', invoiceResp.data);
    res.status(200).json(invoiceResp.data);
  } catch (e) {
    console.error('❌ Błąd Infakt API:', e.response?.data || e.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
