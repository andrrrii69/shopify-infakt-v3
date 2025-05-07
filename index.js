// index.js
const express = require('express');
const axios   = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const order = req.body;

  try {
    // 1) Utwórz w Infakt kontakt-osobę prywatną
    const contactResp = await axios.post(
      'https://api.infakt.pl/v3/partners/YOUR_PARTNER_ID/contacts.json',
      { contact: {
          name:  `${order.customer.first_name} ${order.customer.last_name}`,
          email: order.customer.email,
          rodzaj_dzialalnosci: 'osoba_prywatna'
        }
      },
      { headers: { Authorization: `Bearer ${process.env.INFAKT_TOKEN}` } }
    );
    const contactId = contactResp.data.contact.id;

    // 2) Przygotuj pozycje faktury
    const pozycje = order.line_items.map(item => ({
      nazwa:            item.name,
      ilosc:            item.quantity,
      cena_jednostkowa: item.price,
      stawka_vat:       (item.tax_lines[0]?.rate || 0) * 100
    }));

    // 3) Wystaw fakturę
    await axios.post(
      'https://api.infakt.pl/v3/partners/YOUR_PARTNER_ID/invoices.json',
      { invoice: {
          contact_id:       contactId,
          data_wystawienia: new Date().toISOString().slice(0,10),
          pozycje
        }
      },
      { headers: { Authorization: `Bearer ${process.env.INFAKT_TOKEN}` } }
    );

    console.log(`✅ Faktura dla order #${order.id} utworzona`);
    res.status(200).send('OK');
  } catch (e) {
    console.error('❌ Błąd Infakt:', e.response?.data || e.message);
    res.status(500).send('Infakt error');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));