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
    // Create client as private person
    const clientResp = await axios.post(\`\${BASE_URL}/clients.json\`, {
      client: {
        first_name: order.customer.first_name,
        last_name:  order.customer.last_name,
        email:      order.customer.email,
        business_activity_kind: 'private_person'
      }
    }, { headers: HEADERS });

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

    // Prepare services array and tax aggregation
    const services = [];
    const taxValuesMap = {}; // ratePercent -> totalTaxValue

    for (const item of order.line_items) {
      const grossPrice = parseFloat(item.price);
      const quantity = item.quantity;
      const rateFraction = item.tax_lines[0]?.rate || 0;
      const ratePercent = Math.round(rateFraction * 100);

      // Calculate net unit price
      const netPrice = +(grossPrice / (1 + rateFraction)).toFixed(2);
      // Calculate tax amount per unit
      const taxPerUnit = +(grossPrice - netPrice).toFixed(2);

      // Accumulate tax values
      taxValuesMap[ratePercent] = (taxValuesMap[ratePercent] || 0) + taxPerUnit * quantity;

      services.push({
        name:       item.name,
        quantity:   quantity,
        unit_cost:  netPrice,
        tax:        ratePercent,
        gross:      grossPrice
      });
    }

    // Build tax_values array
    const tax_values = Object.entries(taxValuesMap).map(([rate, value]) => ({
      rate:  parseInt(rate),
      value: +value.toFixed(2)
    }));

    // Create invoice with services and tax_values
    const invoicePayload = {
      invoice: {
        client_id:  clientId,
        issue_date: new Date().toISOString().slice(0,10),
        services:   services,
        value: {
          tax_values: tax_values
        }
      }
    };

    const invoiceResp = await axios.post(\`\${BASE_URL}/invoices.json\`, invoicePayload, { headers: HEADERS });

    console.log(\`✅ Invoice created for order #\${order.id}\`, invoiceResp.data);
    res.sendStatus(200);

  } catch (e) {
    console.error('❌ Infakt API error:', e.response?.data || e.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(\`🚀 Server listening on port \${PORT}\`));