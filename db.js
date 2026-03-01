// db.js
// PostgreSQL connection and helpers for trades
const { Pool } = require('pg');

const isRender = Boolean(process.env.RENDER);
const databaseUrl = process.env.DATABASE_URL;

if (isRender && !databaseUrl) {
    throw new Error('DATABASE_URL is missing on Render. Attach a Render PostgreSQL database or set DATABASE_URL in service environment variables.');
}

const pool = new Pool({
    connectionString: databaseUrl || 'postgresql://postgres:password@localhost:5432/tbtrs',
    ssl: databaseUrl ? { rejectUnauthorized: false } : false
});

async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS trades (
            id SERIAL PRIMARY KEY,
            ticket VARCHAR(64) UNIQUE NOT NULL,
            date DATE NOT NULL,
            day VARCHAR(16),
            time VARCHAR(16) NOT NULL,
            type VARCHAR(8) NOT NULL,
            symbol VARCHAR(16) NOT NULL,
            lotSize NUMERIC(12,2) NOT NULL,
            entry NUMERIC(16,5) NOT NULL,
            exit NUMERIC(16,5),
            sl NUMERIC(16,5) NOT NULL,
            tp NUMERIC(16,5) NOT NULL,
            pnl NUMERIC(16,2) DEFAULT 0,
            status VARCHAR(16) NOT NULL,
            isBacktest BOOLEAN DEFAULT false,
            createdAt TIMESTAMP DEFAULT NOW(),
            updatedAt TIMESTAMP
        );
    `);
}

module.exports = {
    pool,
    initDb
};
