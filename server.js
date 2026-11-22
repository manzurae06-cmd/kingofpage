const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');
const DAY_MS = 24 * 60 * 60 * 1000;
const UZS_TO_USD_RATE = 12800; // Agar to'lov UZS da kelsa, dollarga o'girish kursi

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      currentKing: {
        title: "KingOf.page — Own the Internet's Front Page",
        description: "Pay $1 more than the current King to claim the throne. Hold it for 24 hours to enter the Hall of Fame forever.",
        url: "https://kingof.page",
        image: "https://placehold.co",
        amount: 1,
        claimedAt: Date.now()
      },
      fallenKings: [],
      hallOfFame: []
    };
    saveData(initial);
    return initial;
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  // 24 soat o'tganini tekshirish
  if (data.currentKing.amount > 1 && Date.now() - data.currentKing.claimedAt >= DAY_MS) {
    data.hallOfFame.unshift(data.currentKing);
    data.currentKing = {
      title: "Throne is Empty! Claim it for $1",
      description: "The previous King survived 24 hours! Be the next ruler of this page.",
      url: "https://kingof.page",
      image: "https://placehold.co",
      amount: 0,
      claimedAt: Date.now()
    };
    saveData(data);
  }
  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 1. Sayt ma'lumotlarini beruvchi API
app.get('/api/status', (req, res) => {
  res.json(readData());
});

// 2. Polar.sh Webhook (order.created)
app.post('/webhook', (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());

    if (event.type === 'order.created') {
      const order = event.data;
      const rawAmount = (order.amount || order.total_amount || 0) / 100;
      const currency = (order.currency || 'usd').toLowerCase();

      // UZS yoki USD ekanligiga qarab dollarga o'girish
      let paidUSD = rawAmount;
      if (currency === 'uzs') {
        paidUSD = Math.round(rawAmount / UZS_TO_USD_RATE);
      } else {
        paidUSD = Math.floor(rawAmount);
      }

      const meta = order.metadata || {};
      const data = readData();

      // Agar to'langan summa hozirgi Qirolnikidan kamida $1 ko'p bo'lsa
      if (paidUSD >= data.currentKing.amount + 1) {
        if (data.currentKing.amount > 0) {
          data.fallenKings.unshift(data.currentKing);
        }

        data.currentKing = {
          title: meta.title || order.customer?.name || "Anonymous King",
          description: meta.description || "I own KingOf.page now!",
          url: meta.url || "https://kingof.page",
          image: meta.image || "https://placehold.co",
          amount: paidUSD,
          claimedAt: Date.now()
        };

        saveData(data);
        console.log(`👑 Yangi Qirol: ${data.currentKing.title} ($${paidUSD})`);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook xatosi:', err);
    res.status(400).send('Webhook Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`KingOf.page serveri ${PORT}-portda ishlamoqda`));
