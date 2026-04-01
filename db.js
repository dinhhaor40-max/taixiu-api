const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS history (
      id SERIAL PRIMARY KEY,
      phien INTEGER UNIQUE,
      du_doan VARCHAR(10),
      ty_le VARCHAR(10),
      ket_qua VARCHAR(10),
      tong INTEGER,
      xuc_xac_1 INTEGER,
      xuc_xac_2 INTEGER,
      xuc_xac_3 INTEGER,
      ly_do TEXT,
      trang_thai_ai TEXT,
      dung_sai VARCHAR(10) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ DB ready');
}

async function upsertPhien(data) {
  // Thêm phiên dự đoán mới (phien_hien_tai)
  await pool.query(`
    INSERT INTO history (phien, du_doan, ty_le, ly_do, trang_thai_ai)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (phien) DO NOTHING
  `, [data.phien_hien_tai, data.du_doan, data.ty_le, data.ly_do, data.trang_thai_ai]);

  // Cập nhật kết quả thực tế cho phiên vừa xong
  const res = await pool.query(
    `SELECT du_doan FROM history WHERE phien = $1`, [data.phien]
  );
  if (res.rows.length > 0) {
    const dung_sai = res.rows[0].du_doan === data.ket_qua ? 'dung' : 'sai';
    await pool.query(`
      UPDATE history SET
        ket_qua = $1,
        tong = $2,
        xuc_xac_1 = $3,
        xuc_xac_2 = $4,
        xuc_xac_3 = $5,
        dung_sai = $6
      WHERE phien = $7
    `, [data.ket_qua, data.tong, data.xuc_xac_1, data.xuc_xac_2, data.xuc_xac_3, dung_sai, data.phien]);
  }
}

async function getHistory(limit = 50) {
  const res = await pool.query(
    `SELECT * FROM history ORDER BY phien DESC LIMIT $1`, [limit]
  );
  return res.rows;
}

async function getLatest() {
  const res = await pool.query(
    `SELECT * FROM history ORDER BY phien DESC LIMIT 1`
  );
  return res.rows[0] || null;
}

module.exports = { initDB, upsertPhien, getHistory, getLatest };
