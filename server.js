const express = require('express');
const path = require('path');
const cors = require('cors');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve dashboard explicitly since it's in root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/system-architecture.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'system-architecture.html'));
});

// Helper function to get day name
function getDayName(dateString) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateString);
    return days[date.getDay()];
}

//=============================================================================
// API ENDPOINTS (PostgreSQL version)
//=============================================================================

// GET all trades
app.get('/api/trades', async (req, res) => {
    try {
        const { date, status, type } = req.query;
        let query = 'SELECT * FROM trades';
        const params = [];
        const where = [];
        if (date) { where.push('date = $' + (params.length + 1)); params.push(date); }
        if (status) { where.push('status = $' + (params.length + 1)); params.push(status); }
        if (type) { where.push('type = $' + (params.length + 1)); params.push(type); }
        if (where.length) query += ' WHERE ' + where.join(' AND ');
        query += ' ORDER BY date DESC, time DESC';
        const { rows } = await pool.query(query, params);
        res.json({ success: true, count: rows.length, trades: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET trade statistics
app.get('/api/stats', async (req, res) => {
    try {
        const { rows: trades } = await pool.query('SELECT * FROM trades');
        const closedTrades = trades.filter(t => t.status !== 'PENDING' && t.status !== 'OPEN');
        const totalTrades = closedTrades.length;
        const wins = closedTrades.filter(t => t.status === 'WIN').length;
        const losses = closedTrades.filter(t => t.status === 'LOSS').length;
        const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;
        const totalProfit = closedTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
        const avgWin = wins > 0 ? closedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + Number(t.pnl), 0) / wins : 0;
        const avgLoss = losses > 0 ? closedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + Number(t.pnl), 0) / losses : 0;
        const today = new Date().toISOString().split('T')[0];
        const todayTrades = trades.filter(t => t.date === today);
        const todayPnL = todayTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
        const sortedTrades = [...closedTrades].sort((a, b) =>
            new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)
        );
        let cumulative = 0;
        const equityCurve = sortedTrades.map(t => {
            cumulative += Number(t.pnl || 0);
            return { date: t.date, equity: cumulative };
        });
        res.json({
            success: true,
            stats: {
                totalTrades,
                wins,
                losses,
                winRate: parseFloat(winRate),
                totalProfit: parseFloat(totalProfit.toFixed(2)),
                avgWin: parseFloat(avgWin.toFixed(2)),
                avgLoss: parseFloat(avgLoss.toFixed(2)),
                todayTrades: todayTrades.length,
                todayPnL: parseFloat(todayPnL.toFixed(2)),
                pendingTrades: trades.filter(t => t.status === 'PENDING' || t.status === 'OPEN').length
            },
            equityCurve
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST new trade
app.post('/api/trades', async (req, res) => {
    try {
        const { ticket, date, time, type, symbol, lotSize, entry, sl, tp, status, isBacktest } = req.body;
        if (!ticket || !date || !time || !type || !symbol) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        // Check if trade already exists
        const { rowCount } = await pool.query('SELECT 1 FROM trades WHERE ticket = $1', [ticket]);
        if (rowCount > 0) {
            return res.status(409).json({ success: false, error: 'Trade already exists' });
        }
        const day = getDayName(date);
        const result = await pool.query(
            `INSERT INTO trades (ticket, date, day, time, type, symbol, lotSize, entry, sl, tp, status, isBacktest, createdAt)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) RETURNING *`,
            [ticket, date, day, time, type, symbol, lotSize, entry, sl, tp, status, isBacktest || false]
        );
        res.status(201).json({ success: true, message: 'Trade created successfully', trade: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT update trade
app.put('/api/trades/:ticket', async (req, res) => {
    try {
        const { ticket } = req.params;
        const { exit, pnl, status } = req.body;
        const { rowCount, rows } = await pool.query('SELECT * FROM trades WHERE ticket = $1', [ticket]);
        if (rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Trade not found' });
        }
        const updated = await pool.query(
            `UPDATE trades SET exit = COALESCE($1, exit), pnl = COALESCE($2, pnl), status = COALESCE($3, status), updatedAt = NOW() WHERE ticket = $4 RETURNING *`,
            [exit, pnl, status, ticket]
        );
        res.json({ success: true, message: 'Trade updated successfully', trade: updated.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE trade
app.delete('/api/trades/:ticket', async (req, res) => {
    try {
        const { ticket } = req.params;
        const { rowCount, rows } = await pool.query('SELECT * FROM trades WHERE ticket = $1', [ticket]);
        if (rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Trade not found' });
        }
        await pool.query('DELETE FROM trades WHERE ticket = $1', [ticket]);
        res.json({ success: true, message: 'Trade deleted successfully', trade: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE all trades
app.delete('/api/trades', async (req, res) => {
    try {
        await pool.query('DELETE FROM trades');
        res.json({ success: true, message: 'All trades deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'API is running',
        timestamp: new Date().toISOString()
    });
});

// Database health check
app.get('/api/db-health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() AS db_time');
        res.json({
            success: true,
            status: 'Database is connected',
            dbTime: result.rows[0].db_time,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'Database connection failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

//=============================================================================
// START SERVER
//=============================================================================

initDb().then(() => {
    app.listen(PORT, () => {
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║   Time Based Reverse Strategy - API Server              ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log(`\n✓ Server running on http://localhost:${PORT}`);
        console.log(`✓ API Endpoints:`);
        console.log(`  - GET    /api/trades       - Get all trades`);
        console.log(`  - GET    /api/stats        - Get statistics`);
        console.log(`  - POST   /api/trades       - Create new trade (MT5)`);
        console.log(`  - PUT    /api/trades/:id   - Update trade (MT5)`);
        console.log(`  - DELETE /api/trades/:id   - Delete trade`);
        console.log(`  - DELETE /api/trades       - Delete all trades`);
        console.log(`\n✓ Dashboard: http://localhost:${PORT}/dashboard.html`);
        console.log(`\n⚠ IMPORTANT: In MT5, add this URL to WebRequest whitelist:`);
        console.log(`  https://eausdjpyopposite.onrender.com`);
        console.log(`  (Or http://localhost:${PORT} for local testing)`);
        console.log('\n══════════════════════════════════════════════════════════\n');
    });
});
