const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

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

// Database file
const DB_FILE = path.join(__dirname, 'trades.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ trades: [] }, null, 2));
}

// Helper function to read trades
function readTrades() {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

// Helper function to write trades
function writeTrades(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Helper function to get day name
function getDayName(dateString) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateString);
    return days[date.getDay()];
}

//=============================================================================
// API ENDPOINTS
//=============================================================================

// GET all trades
app.get('/api/trades', (req, res) => {
    try {
        const db = readTrades();
        const { date, status, type } = req.query;

        let filteredTrades = db.trades;

        // Filter by date
        if (date) {
            filteredTrades = filteredTrades.filter(t => t.date === date);
        }

        // Filter by status
        if (status) {
            filteredTrades = filteredTrades.filter(t => t.status === status);
        }

        // Filter by type
        if (type) {
            filteredTrades = filteredTrades.filter(t => t.type === type);
        }

        res.json({
            success: true,
            count: filteredTrades.length,
            trades: filteredTrades
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET trade statistics
app.get('/api/stats', (req, res) => {
    try {
        const db = readTrades();
        const trades = db.trades;

        const closedTrades = trades.filter(t => t.status !== 'PENDING' && t.status !== 'OPEN');
        const totalTrades = closedTrades.length;
        const wins = closedTrades.filter(t => t.status === 'WIN').length;
        const losses = closedTrades.filter(t => t.status === 'LOSS').length;
        const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;

        const totalProfit = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const avgWin = wins > 0 ? closedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / wins : 0;
        const avgLoss = losses > 0 ? closedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / losses : 0;

        // Today's stats
        const today = new Date().toISOString().split('T')[0];
        const todayTrades = trades.filter(t => t.date === today);
        const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

        // Get equity curve data
        const sortedTrades = [...closedTrades].sort((a, b) =>
            new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)
        );

        let cumulative = 0;
        const equityCurve = sortedTrades.map(t => {
            cumulative += t.pnl || 0;
            return {
                date: t.date,
                equity: cumulative
            };
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

// POST new trade (from MT5)
app.post('/api/trades', (req, res) => {
    try {
        const { ticket, date, time, type, symbol, lotSize, entry, sl, tp, status, isBacktest } = req.body;

        if (!ticket || !date || !time || !type || !symbol) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const db = readTrades();

        // Check if trade already exists
        const existingIndex = db.trades.findIndex(t => t.ticket === ticket);

        if (existingIndex !== -1) {
            return res.status(409).json({
                success: false,
                error: 'Trade already exists'
            });
        }

        const newTrade = {
            id: db.trades.length + 1,
            ticket,
            date,
            day: getDayName(date),
            time,
            type,
            symbol,
            lotSize,
            entry: parseFloat(entry),
            exit: null,
            sl: parseFloat(sl),
            tp: parseFloat(tp),
            pnl: 0,
            status,
            isBacktest: isBacktest || false,
            createdAt: new Date().toISOString()
        };

        db.trades.push(newTrade);
        writeTrades(db);

        console.log(`✓ New ${isBacktest ? 'BACKTEST' : 'LIVE'} trade received: ${type} ${symbol} @ ${entry} | Ticket: ${ticket}`);

        res.status(201).json({
            success: true,
            message: 'Trade created successfully',
            trade: newTrade
        });
    } catch (error) {
        console.error('Error creating trade:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT update trade (when closed)
app.put('/api/trades/:ticket', (req, res) => {
    try {
        const { ticket } = req.params;
        const { exit, pnl, status } = req.body;

        const db = readTrades();
        const tradeIndex = db.trades.findIndex(t => t.ticket == ticket);

        if (tradeIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Trade not found'
            });
        }

        // Update trade
        db.trades[tradeIndex].exit = exit ? parseFloat(exit) : db.trades[tradeIndex].exit;
        db.trades[tradeIndex].pnl = pnl !== undefined ? parseFloat(pnl) : db.trades[tradeIndex].pnl;
        db.trades[tradeIndex].status = status || db.trades[tradeIndex].status;
        db.trades[tradeIndex].updatedAt = new Date().toISOString();

        writeTrades(db);

        console.log(`✓ Trade updated: Ticket ${ticket} | Exit: ${exit} | P&L: $${pnl} | Status: ${status}`);

        res.json({
            success: true,
            message: 'Trade updated successfully',
            trade: db.trades[tradeIndex]
        });
    } catch (error) {
        console.error('Error updating trade:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE trade
app.delete('/api/trades/:ticket', (req, res) => {
    try {
        const { ticket } = req.params;
        const db = readTrades();
        const tradeIndex = db.trades.findIndex(t => t.ticket == ticket);

        if (tradeIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Trade not found'
            });
        }

        const deletedTrade = db.trades.splice(tradeIndex, 1)[0];
        writeTrades(db);

        console.log(`✓ Trade deleted: Ticket ${ticket}`);

        res.json({
            success: true,
            message: 'Trade deleted successfully',
            trade: deletedTrade
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE all trades (reset database)
app.delete('/api/trades', (req, res) => {
    try {
        writeTrades({ trades: [] });
        console.log('✓ All trades deleted');

        res.json({
            success: true,
            message: 'All trades deleted successfully'
        });
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

//=============================================================================
// START SERVER
//=============================================================================

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
    console.log(`  Tools -> Options -> Expert Advisors -> Allow WebRequest:`);
    console.log(`  http://localhost:${PORT}`);
    console.log('\n══════════════════════════════════════════════════════════\n');
});
