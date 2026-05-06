const mysql = require('mysql2/promise');

/* ── Training DB pool ─────────────────────────────────── */
const trainingPool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'training',
  waitForConnections: true,
  connectionLimit: 15,
  charset: 'utf8mb4',
});

/* ── Credenciales DB pool (read-only) ─────────────────── */
const credPool = mysql.createPool({
  host:     process.env.CRED_DB_HOST     || 'localhost',
  port:     process.env.DB_PORT          || 3306,
  user:     process.env.CRED_DB_USER     || 'root',
  password: process.env.CRED_DB_PASSWORD || '',
  database: process.env.CRED_DB_NAME     || 'credenciales',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

module.exports = { trainingPool, credPool };
