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

function calculateNetAndTaxAmount(priceGross, vatRate) {
  const gross = parseFloat(priceGross);
  const rate = parseFloat(vatRate) / 100;
  const net = +(gross / (1 + rate)).toFixed(2);
  const tax = +(gross - net).toFixed(2);
  return { net, tax, gross };
}

app.post('/webhook', async (req, res) => {
  const order = req.body;
  try {
    // Create client
    const clientResp = await axios.post(
      `${BASE_URL}/clients.json`,
      {
        client: {
          first_name: order.customer.first_name,
          last_name: order.customer.last_name,
          email: order.customer.email,
          business_activity_kind: 'private_person'
        }
      },
      { headers: HEADERS }
    );

    const data = clientResp.data;
    let clientId;
    if (typeof data.id === 'number') {
      clientId = data.id;
    } else if (data.client && typeof data.client.id === 'number') {
      clientId = data.client.id;
    } else if (Array.isArray(data.clients) && data.clients[0]?.id) {
      clientId = data.clients[0].id;
    } else {
      console.error('Unexpected create client response:', JSON.stringify(data));
      return res.status(500).send('Invalid client creation response');
    }

    // Prepare services and tax values
    const services = [];
    const tax_values = {};

    order.line_items.forEach(item => {
      const vatRatePercent = (item.tax_lines[0]?.rate || 0) * 100;
      const { net, tax, gross } = calculateNetAndTaxAmount(item.price, vatRatePercent);
      services.push({
        name: item.name,
        quantity: item.quantity,
        unit_cost: net,
        tax: vatRatePercent,
        gross: gross
      });
      const key = `${vatRatePercent}`;
      tax_values[key] = (tax_values[key] || 0) + tax * item.quantity;
    });

    const invoicePayload = {
      invoice: {
        client_id: clientId,
        issue_date: new Date().toISOString().slice(0, 10),
        services,
        value: {
          tax_values: tax_values
        }
      }
    };

    const invoiceResp = await axios.post(
      `${BASE_URL}/invoices.json`,
      invoicePayload,
      { headers: HEADERS }
    );
    console.log(`✅ Invoice created for order #${order.id}`, invoiceResp.data);
    res.sendStatus(200);
  } catch (e) {
    console.error('❌ Infakt API error:', e.response?.data || e.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
