// index.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
// Parse JSON bodies
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`🔍 Incoming request: ${req.method} ${req.url}`, req.body || {});
  next();
});

const BASE_URL = 'https://api.infakt.pl/api/v3';
const CLIENTS_ENDPOINT = `${BASE_URL}/clients.json`;
// Synchronic endpoint for invoices
const INVOICES_ENDPOINT = `${BASE_URL}/invoices.json`;

const HEADERS = {
  'Content-Type': 'application/json',
  'X-InFakt-ApiKey': process.env.INFAKT_API_KEY,
};

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  console.log('🔔 Webhook payload:', req.body);
  try {
    const { clientId, services } = req.body;
    // Create invoice synchronously and get full object
    const invoiceResp = await axios.post(
      INVOICES_ENDPOINT,
      {
        invoice: {
          client_id: clientId,
          issue_date: new Date().toISOString().slice(0, 10),
          services,
        },
      },
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
