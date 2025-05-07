// index.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const BASE_URL = 'https://api.infakt.pl/api/v3';
const CLIENTS_ENDPOINT = `${BASE_URL}/clients.json`;
const INVOICES_ENDPOINT = `${BASE_URL}/invoices.json`;
const HEADERS = {
  'Content-Type': 'application/json',
  'X-InFakt-ApiKey': process.env.INFAKT_API_KEY
};

app.post('/webhook', async (req, res) => {
  try {
    const order = req.body;

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

    const clientData = clientResp.data;
    const clientId = clientData.id 
                   || clientData.client?.id 
                   || (Array.isArray(clientData.clients) && clientData.clients[0]?.id);

    if (!clientId) {
      console.error('Invalid client response', clientData);
      return res.status(500).send('Invalid client creation response');
    }

    // 2) Prepare services: net price and VAT rate
    const services = order.line_items.map(item => {
      const gross = parseFloat(item.price);
      const net = parseFloat((gross / 1.23).toFixed(2));
      const vatRate = (item.tax_lines[0]?.rate || 0) * 100;
      return {
        name:      item.name,
        quantity:  item.quantity,
        unit_cost: net,
        tax_rate:  vatRate
      };
    });

    // 3) Create invoice synchronously
    const invoiceResp = await axios.post(
      INVOICES_ENDPOINT,
      {
        invoice: {
          client_id:  clientId,
          issue_date: new Date().toISOString().split('T')[0],
          services
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
