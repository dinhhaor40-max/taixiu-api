const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { initDB, upsertPhien, getHistory, getLatest } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SOURCE_API = 'https://betvip-q9wd.onrender.com/taixiumd5';

app.use(cors());
app.use(express.json());

// GET /latest - dữ liệu mới nhất từ nguồn + lưu DB
app.get('/latest', async (req, res) => {
  try {
    const r = await fetch(SOURCE_API);
    const data = await r.json();
    await upsertPhien(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /history?limit=50 - lịch sử từ DB
app.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const rows = await getHistory(limit);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /stats - thống kê tổng hợp
app.get('/stats', async (req, res) => {
  try {
    const rows = await getHistory(1000);
    const verified = rows.filter(r => r.dung_sai !== 'pending');
    const dung = verified.filter(r => r.dung_sai === 'dung').length;
    res.json({
      total: rows.length,
      verified: verified.length,
      dung,
      sai: verified.length - dung,
      accuracy: verified.length > 0 ? Math.round(dung / verified.length * 100) + '%' : '--'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Tự động fetch mỗi 10 giây
async function autoFetch() {
  try {
    const r = await fetch(SOURCE_API);
    const data = await r.json();
    await upsertPhien(data);
    console.log(`[${new Date().toLocaleTimeString()}] Synced phien ${data.phien}`);
  } catch (e) {
    console.error('Auto fetch error:', e.message);
  }
}

// Khởi động
initDB().then(() => {
  autoFetch();
  setInterval(autoFetch, 10000);

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
