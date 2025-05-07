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
  const order = req.body;

  try {
    // 1) Create client as private person
    const clientResp = await axios.post(
      `${BASE_URL}/clients.json`,
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
    let clientId;

    // Handle various response shapes from Infakt API
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

    // 2) Prepare invoice services (items)
    const services = order.line_items.map(item => ({
      name:        item.name,
      quantity:    item.quantity,
      unit_price:  item.price,
      vat_rate:    (item.tax_lines[0]?.rate || 0) * 100
    }));

    // 3) Create invoice
    const invoiceResp = await axios.post(
      `${BASE_URL}/invoices.json`,
      {
        invoice: {
          client_id:   clientId,
          issue_date:  new Date().toISOString().slice(0,10),
          services:    services
        }
      },
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
