const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SITE_NAME = "Claim1.online";
const DATA_FILE = path.join(__dirname, 'data.json');
const DAY_MS = 24 * 60 * 60 * 1000;

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const init = {
      stats: { visitors: 1, revenue: 1 },
      currentKing: {
        title: SITE_NAME + " — Claim the #1 Spot",
        description: "Pay $1 more than #1 to take over this entire screen for 24 hours.",
        url: "https://claim1.online",
        category: "Startup",
        image: "",
        amount: 1,
        clicks: 0,
        claimedAt: Date.now()
      },
      fallenKings: [],
      hallOfFame: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!data.stats) data.stats = { visitors: 1, revenue: data.currentKing.amount };

  if (data.currentKing.amount > 1 && Date.now() - data.currentKing.claimedAt >= DAY_MS) {
    data.hallOfFame.unshift(data.currentKing);
    data.currentKing = {
      title: "Spot is Empty! Claim #1 for $1",
      description: "Previous #1 survived 24h! Take the #1 spot now.",
      url: "https://claim1.online",
      category: "Open",
      image: "",
      amount: 0,
      clicks: 0,
      claimedAt: Date.now()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
  return data;
}

app.get('/api/status', (req, res) => {
  const data = readData();
  data.stats.visitors = (data.stats.visitors || 0) + 1;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  res.json(data);
});

app.post('/api/click', (req, res) => {
  const data = readData();
  data.currentKing.clicks = (data.currentKing.clicks || 0) + 1;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

app.post('/webhook', (req, res) => {
  try {
    const body = req.body;
    const paidUSD = Math.floor(Number(body.price || 0) / 100);
    const custom = body.custom_fields || {};
    const params = body.url_params || {};
    const data = readData();

    data.stats.revenue = (data.stats.revenue || 0) + paidUSD;

    if (paidUSD >= data.currentKing.amount + 1) {
      if (data.currentKing.amount > 0) data.fallenKings.unshift(data.currentKing);
      let siteUrl = custom['Website URL'] || params.url || body.url || "https://claim1.online";
      if (!siteUrl.startsWith('http')) siteUrl = 'https://' + siteUrl;

      data.currentKing = {
        title: custom['Project Name'] || body.full_name || "Anonymous Leader",
        description: custom['Short Description'] || "I own Claim1.online now!",
        url: siteUrl,
        category: custom['Category'] || params.category || "Startup",
        image: custom['Banner Image URL'] || "",
        amount: paidUSD,
        clicks: 0,
        claimedAt: Date.now()
      };
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.status(200).send('OK');
  } catch (e) {
    res.status(400).send('Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on ' + PORT));
