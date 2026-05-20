const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/metal-price/:symbol', async (req, res) => {
  const symbol = req.params.symbol?.toUpperCase();
  const allowedSymbols = new Set(['XAU', 'XAG', 'XPT']);

  if (!allowedSymbols.has(symbol)) {
    return res.status(400).json({ error: 'Unsupported metal symbol' });
  }

  try {
    const response = await fetch(`https://api.gold-api.com/price/${symbol}`);
    const data = await response.json();

    if (!response.ok || !Number.isFinite(data.price)) {
      return res.status(502).json({ error: 'Live metal price unavailable' });
    }

    res.json({
      symbol: data.symbol || symbol,
      name: data.name,
      price: data.price,
      currency: data.currency || 'USD',
      updatedAt: data.updatedAt,
      updatedAtReadable: data.updatedAtReadable
    });
  } catch (err) {
    res.status(502).json({ error: 'Live metal price unavailable' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
