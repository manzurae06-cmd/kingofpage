const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');
const DAY_MS = 24 * 60 * 60 * 1000;
const UZS_TO_USD = 12800;

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const init = {
      currentKing: {
        title: "KingOf.page — Own the Throne",
        description: "Pay $1 more than the current King to claim this entire screen.",
        url: "https://kingof.page",
        image: "",
        amount: 1,
        claimedAt: Date.now()
      },
      fallenKings: [],
      hallOfFame: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (data.currentKing.amount > 1 && Date.now() - data.currentKing.claimedAt >= DAY_MS) {
    data.hallOfFame.unshift(data.currentKing);
    data.currentKing = {
      title: "Throne is Empty! Claim it for $1",
      description: "Previous King survived 24h! Be the next ruler.",
      url: "https://kingof.page",
      image: "",
      amount: 0,
      claimedAt: Date.now()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
  return data;
}

// Asosiy sahifa (HTML + Dizayn to'g'ridan-to'g'ri serverdan beriladi)
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KingOf.page — Own the Throne</title>
  <script src="https://jsdelivr.net" defer></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #09090b; color: #fff; font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 24px 16px; min-height: 100vh; }
    .box { width: 100%; max-width: 580px; }
    h1 { text-align: center; color: #fbbf24; font-size: 38px; font-weight: 900; margin-bottom: 6px; }
    .sub { text-align: center; color: #a1a1aa; font-size: 14px; margin-bottom: 24px; }
    .card { background: #18181b; border: 2px solid #f59e0b; border-radius: 18px; padding: 22px; box-shadow: 0 0 40px rgba(245,158,11,0.15); }
    .top { display: flex; justify-content: space-between; background: #09090b; border: 1px solid #27272a; padding: 12px 16px; border-radius: 12px; margin-bottom: 18px; font-size: 14px; }
    .top b { color: #fbbf24; font-size: 16px; }
    .king { text-align: center; text-decoration: none; color: #fff; display: block; }
    .banner { height: 210px; background: linear-gradient(135deg, #272012, #09090b); border: 1px solid #27272a; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 56px; overflow: hidden; margin-bottom: 14px; }
    .banner img { width: 100%; height: 100%; object-fit: cover; }
    .form { margin-top: 22px; padding-top: 20px; border-top: 1px solid #27272a; display: flex; flex-direction: column; gap: 10px; }
    input { width: 100%; background: #09090b; border: 1px solid #27272a; color: #fff; padding: 13px; border-radius: 10px; font-size: 14px; outline: none; }
    input:focus { border-color: #f59e0b; }
    button { background: #f59e0b; color: #09090b; font-weight: 800; padding: 14px; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; margin-top: 4px; }
    button:hover { background: #fbbf24; }
    .list-title { color: #fbbf24; margin-top: 32px; font-size: 18px; font-weight: 700; }
    .item { background: #18181b; border: 1px solid #27272a; padding: 12px 16px; border-radius: 10px; display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; }
    .item a { color: #fff; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="box">
    <h1>👑 KingOf.page</h1>
    <p class="sub">Pay $1 more to take the throne. Survive 24h to enter the Hall of Fame.</p>

    <div class="card">
      <div class="top">
        <span>PRICE: <b id="price">$1</b></span>
        <span>TIME LEFT: <b id="timer">24:00:00</b></span>
      </div>

      <a id="link" href="#" target="_blank" class="king">
        <div class="banner" id="banner">👑</div>
        <h2 id="title" style="margin: 0 0 8px; font-size: 24px;">Loading...</h2>
        <p id="desc" style="color: #a1a1aa; font-size: 14px; margin: 0;"></p>
      </a>

      <div class="form">
        <div style="font-size: 14px; color: #fbbf24;">Min bid: <b id="min">$2</b></div>
        <input id="in-title" placeholder="Project or Your Name *" maxlength="50">
        <input id="in-desc" placeholder="Short description (optional)" maxlength="120">
        <input id="in-url" placeholder="https://yourwebsite.com *">
        <input id="in-img" placeholder="Banner Image URL (optional)">
        <button onclick="pay()">Pay & Claim Throne 👑</button>
      </div>
    </div>

    <div class="list-title">🏛️ Immortal Hall of Fame</div>
    <div id="hof"></div>

    <div class="list-title" style="color: #71717a;">💀 Fallen Kings</div>
    <div id="fallen"></div>
  </div>

  <script>
    let claimedAt = Date.now();
    const CHECKOUT = "https://polar.sh";

    async function load() {
      const r = await fetch('/api/status');
      const d = await r.json();
      const k = d.currentKing;

      document.getElementById('title').innerText = k.title;
      document.getElementById('desc').innerText = k.description;
      document.getElementById('link').href = k.url;
      document.getElementById('price').innerText = '$' + k.amount;
      document.getElementById('min').innerText = '$' + (k.amount + 1);
      claimedAt = k.claimedAt;

      const b = document.getElementById('banner');
      if (k.image && k.image.startsWith('http') && !k.image.includes('placehold.co')) {
        b.innerHTML = '<img src="' + k.image + '">';
      } else {
        b.innerHTML = '👑';
      }

      document.getElementById('hof').innerHTML = d.hallOfFame.map(x =>
        '<div class="item"><a href="' + x.url + '" target="_blank">' + x.title + '</a><b>$' + x.amount + '</b></div>'
      ).join('') || '<p style="color:#52525b;font-size:13px;margin-top:8px">No one has survived 24h yet...</p>';

      document.getElementById('fallen').innerHTML = d.fallenKings.map(x =>
        '<div class="item"><a href="' + x.url + '" target="_blank">' + x.title + '</a><span>$' + x.amount + '</span></div>'
      ).join('') || '<p style="color:#52525b;font-size:13px;margin-top:8px">No fallen kings yet.</p>';
    }

    setInterval(() => {
      const diff = Math.max(0, (claimedAt + 86400000) - Date.now());
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      document.getElementById('timer').innerText = h + ':' + m + ':' + s;
    }, 1000);

    async function pay() {
      const t = document.getElementById('in-title').value.trim();
      let u = document.getElementById('in-url').value.trim();
      if (!t || !u) return alert('Enter Name and URL!');
      if (!u.startsWith('http')) u = 'https://' + u;

      const url = new URL(CHECKOUT);
      url.searchParams.set('metadata[title]', t);
      url.searchParams.set('metadata[description]', document.getElementById('in-desc').value.trim());
      url.searchParams.set('metadata[url]', u);
      url.searchParams.set('metadata', document.getElementById('in-img').value.trim());

      if (window.Polar && window.Polar.EmbedCheckout) {
        const c = await window.Polar.EmbedCheckout.create(url.toString(), 'dark');
        c.addEventListener('success', () => setTimeout(load, 2500));
      } else {
        window.location.href = url.toString();
      }
    }

    load();
    setInterval(load, 10000);
  </script>
</body>
</html>`);
});

app.get('/api/status', (req, res) => {
  res.json(readData());
});

app.post('/webhook', (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    if (event.type === 'order.created') {
      const order = event.data;
      const raw = (order.amount || order.total_amount || 0) / 100;
      const cur = (order.currency || 'usd').toLowerCase();
      const paidUSD = cur === 'uzs' ? Math.round(raw / UZS_TO_USD) : Math.floor(raw);
      const meta = order.metadata || {};
      const data = readData();

      if (paidUSD >= data.currentKing.amount + 1) {
        if (data.currentKing.amount > 0) data.fallenKings.unshift(data.currentKing);
        data.currentKing = {
          title: meta.title || order.customer?.name || "Anonymous King",
          description: meta.description || "I own KingOf.page now!",
          url: meta.url || "https://kingof.page",
          image: meta.image || "",
          amount: paidUSD,
          claimedAt: Date.now()
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      }
    }
    res.status(200).send('OK');
  } catch (e) {
    res.status(400).send('Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on ' + PORT));
