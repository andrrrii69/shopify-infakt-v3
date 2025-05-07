// index.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const BASE_URL = 'https://api.infakt.pl/api/v3';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-InFakt-ApiKey': process.env.INFAKT_API_KEY
};

app.post('/webhook', async (req, res) => {
  const { customer, line_items, id: orderId } = req.body;

  try {
    // 1) Create client as private person
    const clientResp = await axios.post(
      `${BASE_URL}/clients.json`,
      {
        client: {
          first_name: customer.first_name,
          last_name:  customer.last_name,
          email:      customer.email,
          business_activity_kind: 'private_person'
        }
      },
      { headers: HEADERS }
    );

    const clientData = clientResp.data;
    const clientId = clientData.id 
                   || clientData.client?.id 
                   || clientData.clients?.[0]?.id;
    if (!clientId) {
      throw new Error('Nie udało się odczytać client.id');
    }

    // 2) Prepare services: net price and VAT rate
    const services = line_items.map(item => {
      const grossPrice = parseFloat(item.price);
      const netPrice = grossPrice / 1.23; // remove 23% VAT
      const vatRate = (item.tax_lines[0]?.rate || 0) * 100; // e.g. 23

      return {
        name:      item.name,
        quantity:  item.quantity,
        unit_cost: parseFloat(netPrice.toFixed(2)), // net price
        tax_rate:  vatRate                         // VAT rate
      };
    });

    // 3) Create invoice synchronously
    const invoiceResp = await axios.post(
      `${BASE_URL}/invoices.json`,
      {
        invoice: {
          client_id:  clientId,
          issue_date: new Date().toISOString().split('T')[0],
          services
        }
      },
      { headers: HEADERS }
    );

    console.log(`✅ Invoice created for order #${orderId}`, invoiceResp.data);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Infakt API error:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
