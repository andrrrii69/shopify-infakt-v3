// index.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const BASE_URL = 'https://api.infakt.pl/api/v3';
const CLIENTS_ENDPOINT = `${BASE_URL}/clients.json`;
const INVOICES_ENDPOINT = `${BASE_URL}/async/invoices.json`;
const HEADERS = {
  'Content-Type': 'application/json',
  'X-InFakt-ApiKey': process.env.INFAKT_API_KEY
};

app.post('/webhook', async (req, res) => {
  const order = req.body;

  try {
    // 1) Create client
    const clientResp = await axios.post(
      CLIENTS_ENDPOINT,
      {
        client: {
          first_name: order.customer.first_name,
          last_name:  order.customer.last_name,
          email:      order.customer.email,
          business_activity_kind: 'private_person'
        }
      },
      { headers: HEADERS }
    );

    const data = clientResp.data;
    const clientId = data.id || data.client?.id || (Array.isArray(data.clients) && data.clients[0]?.id);

    if (!clientId) {
      console.error('Invalid client response', data);
      return res.status(500).send('Invalid client creation response');
    }

    // 2) Prepare services with gross prices
    const services = order.line_items.map(item => ({
      name:       item.name,
      quantity:   item.quantity,
      gross_price: parseFloat(item.price),
      tax_rate:   (item.tax_lines[0]?.rate || 0) * 100
    }));

    // 3) Create invoice asynchronously
    const invoiceTask = await axios.post(
      INVOICES_ENDPOINT,
      {
        invoice: {
          client_id:   clientId,
          issue_date:  new Date().toISOString().slice(0,10),
          services
        }
      },
      { headers: HEADERS }
    );

    console.log('✅ Invoice task created:', invoiceTask.data);
    res.sendStatus(200);
  } catch (e) {
    console.error('❌ Infakt API error:', e.response?.data || e.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));