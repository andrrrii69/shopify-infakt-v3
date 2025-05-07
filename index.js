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
          last_name: order.customer.last_name,
          email: order.customer.email,
          business_activity_kind: 'private_person'
        }
      },
      { headers: HEADERS }
    );
    const clientId = clientResp.data.client.id;

    // 2) Prepare invoice items
    const items = order.line_items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      vat_rate: (item.tax_lines[0]?.rate || 0) * 100
    }));

    // 3) Create invoice
    await axios.post(
      `${BASE_URL}/invoices.json`,
      {
        invoice: {
          client_id: clientId,
          issue_date: new Date().toISOString().slice(0,10),
          items
        }
      },
      { headers: HEADERS }
    );

    console.log(`✅ Invoice created for order #${order.id}`);
    res.status(200).send('OK');
  } catch (e) {
    console.error('❌ Infakt API error:', e.response?.data || e.message);
    res.status(500).send('Error creating invoice');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));