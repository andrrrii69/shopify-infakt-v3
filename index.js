require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const order = req.body;

    // Map Shopify line items to Infakt services
    const services = order.line_items.map(item => {
      const grossUnit = parseFloat(item.price); // price including VAT (23%)
      const netUnit = parseFloat((grossUnit / 1.23).toFixed(2));
      return {
        description: item.name,
        quantity: item.quantity,
        unit_cost: netUnit,                                            // netto
        gross: parseFloat((grossUnit * item.quantity).toFixed(2)),     // brutto × qty
        tax: 3                                                        // ryczałt 3%
      };
    });

    // Add shipping as a service if present
    const shippingGross = parseFloat(order.current_shipping_price_set.shop_money.amount);
    if (shippingGross > 0) {
      const shippingNet = parseFloat((shippingGross / 1.23).toFixed(2));
      services.push({
        description: 'Shipping',
        quantity: 1,
        unit_cost: shippingNet,
        gross: shippingGross,
        tax: 3
      });
    }

    // Build Infakt invoice payload
    const payload = {
      document_kind: 'FV',
      contact: {
        company_name: order.billing_address.company || `${order.billing_address.first_name} ${order.billing_address.last_name}`,
        street: order.billing_address.address1,
        city: order.billing_address.city,
        postal_code: order.billing_address.zip,
        country: order.billing_address.country_code
      },
      issue_date: new Date().toISOString().split('T')[0],
      payment_date: new Date().toISOString().split('T')[0],
      value: {
        tax_values: []
      },
      services
    };

    // Send to Infakt
    const response = await axios.post(
      'https://api.infakt.pl/v3/invoices.json',
      payload,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INFAKT_TOKEN}`
        }
      }
    );

    console.log('Infakt response:', response.data);
    res.status(200).send('Invoice created');
  } catch (error) {
    console.error('Infakt API error:', error.response?.data || error.message);
    res.status(500).send('Error creating invoice');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
