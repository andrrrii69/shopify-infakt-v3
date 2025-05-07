// index.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const BASE_URL = 'https://api.infakt.pl/api/v3';
const CLIENTS_ENDPOINT = `${BASE_URL}/clients.json`;
// Zmieniono na synchroniczny endpoint:
const INVOICES_ENDPOINT = `${BASE_URL}/invoices.json`;

const HEADERS = {
  'Content-Type': 'application/json',
  'X-InFakt-ApiKey': process.env.INFAKT_API_KEY,
};

app.post('/create-invoice', async (req, res) => {
  try {
    const { clientId, services } = req.body;
    // Wysyłamy żądanie tworzenia faktury i od razu otrzymujemy obiekt faktury:
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
    // Zwracamy pełne dane faktury do klienta:
    res.status(200).json(invoiceResp.data);
  } catch (e) {
    console.error('❌ Infakt API error:', e.response?.data || e.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
