# Time Based Reverse Strategy - Real-Time Trading System

Complete trading system with MT5 EA, REST API, and live dashboard for real-time trade monitoring and backtesting.

## 📋 System Overview

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   MT5 EA    │ ──HTTP─→│  Node.js    │ ──JSON─→│  Dashboard  │
│  (Live/BT)  │         │  API Server │         │  (Browser)  │
└─────────────┘         └─────────────┘         └─────────────┘
     ↓                         ↓                        ↑
  Trades                 PostgreSQL DB               Auto-refresh
  Execute                   Storage                  Every 5s
```

## 🚀 Quick Start Guide

### Step 1: Setup API Server

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Version 16 or higher recommended

2. **Install Dependencies**
   ```bash
   cd /path/to/project
   npm install
   ```

3. **Start the Server**
   ```bash
   npm start
   ```
   
   You should see:
   ```
   ╔══════════════════════════════════════════════════════════╗
   ║   Time Based Reverse Strategy - API Server              ║
   ╚══════════════════════════════════════════════════════════╝
   
   ✓ Server running on https://eausdjpyopposite.onrender.com
   ✓ Dashboard: https://eausdjpyopposite.onrender.com/dashboard.html
   ```

### Step 2: Setup MT5 EA

1. **Copy EA File**
   - Copy `TimeBasedReverseStrategy_API.mq5` to:
     `C:\Users\[YourName]\AppData\Roaming\MetaQuotes\Terminal\[BrokerID]\MQL5\Experts\`

2. **Enable WebRequest in MT5**
   - Open MT5
   - Go to: `Tools → Options → Expert Advisors`
   - Check: ✅ `Allow WebRequest for listed URL:`
   - Add: `https://eausdjpyopposite.onrender.com`
   - Click `OK`

3. **Compile the EA**
   - Open MetaEditor (F4 in MT5)
   - Open `TimeBasedReverseStrategy_API.mq5`
   - Click `Compile` (F7)
   - Check for errors in the `Toolbox` tab

4. **Attach EA to Chart**
   - Open a M5 (5-minute) chart in MT5
   - Drag and drop the EA onto the chart
   - In EA settings, verify:
     - `API_URL`: `https://eausdjpyopposite.onrender.com/api/trades`
     - `LotSize`: `0.10` (or your preference)
     - `TradeHour`: `15`
     - `TradeMinute`: `25`
   - Enable AutoTrading (click the `AutoTrading` button)

### Step 3: Open Dashboard

1. Open your browser and go to:
   ```
   https://eausdjpyopposite.onrender.com/dashboard.html
   ```

2. You should see:
   - ✅ Green "API Connected" status
   - Real-time statistics
   - Equity curve chart
   - Trade history table

## 📊 Dashboard Features

### Real-Time Updates
- Auto-refreshes every 5 seconds
- Live connection status indicator
- Last update timestamp

### Statistics Cards
- **Total Trades**: Number of completed trades
- **Win Rate**: Percentage of winning trades
- **Total Profit**: Cumulative P&L
- **Today's P&L**: Profit/loss for current day

### Equity Curve
- Visual representation of account growth
- Interactive chart with Chart.js

### Trade History Table
Columns:
- Ticket, Date, Day (Monday, Tuesday, etc.)
- Time, Type (BUY/SELL), Symbol
- Lot Size, Entry, Exit, SL, TP
- Profit/Loss, Status (WIN/LOSS/PENDING/OPEN)
- Backtest indicator badge

### Controls
- **Filter by Date**: Show trades for specific date
- **Clear Filter**: Show all trades
- **Refresh**: Manual data refresh
- **Clear All**: Delete all trades (with confirmation)

## 🔧 API Endpoints

### GET Endpoints

#### Get All Trades
```http
GET https://eausdjpyopposite.onrender.com/api/trades
```

Query Parameters:
- `date` - Filter by date (YYYY-MM-DD)
- `status` - Filter by status (WIN/LOSS/PENDING/OPEN)
- `type` - Filter by type (BUY/SELL)

Example:
```http
GET https://eausdjpyopposite.onrender.com/api/trades?date=2024-02-14&type=BUY
```

#### Get Statistics
```http
GET https://eausdjpyopposite.onrender.com/api/stats
```

Returns:
```json
{
  "success": true,
  "stats": {
    "totalTrades": 10,
    "wins": 7,
    "losses": 3,
    "winRate": 70.0,
    "totalProfit": 150.00,
    "avgWin": 40.00,
    "avgLoss": -10.00,
    "todayTrades": 1,
    "todayPnL": 40.00,
    "pendingTrades": 0
  },
  "equityCurve": [...]
}
```

### POST Endpoint (Used by MT5 EA)

#### Create New Trade
```http
POST https://eausdjpyopposite.onrender.com/api/trades
Content-Type: application/json

{
  "ticket": 123456789,
  "date": "2024-02-14",
  "time": "15:25",
  "type": "BUY",
  "symbol": "EURUSD",
  "lotSize": 0.10,
  "entry": 1.0850,
  "sl": 1.0840,
  "tp": 1.0890,
  "status": "OPEN",
  "isBacktest": false
}
```

### PUT Endpoint (Used by MT5 EA)

#### Update Trade (When Closed)
```http
PUT https://eausdjpyopposite.onrender.com/api/trades/123456789
Content-Type: application/json

{
  "exit": 1.0890,
  "pnl": 40.00,
  "status": "WIN"
}
```

### DELETE Endpoints

#### Delete Single Trade
```http
DELETE https://eausdjpyopposite.onrender.com/api/trades/123456789
```

#### Delete All Trades
```http
DELETE https://eausdjpyopposite.onrender.com/api/trades
```

## 🧪 Testing with Backtest

1. **Open MT5 Strategy Tester**
   - Press `Ctrl+R` or go to `View → Strategy Tester`

2. **Configure Backtest**
   - Expert Advisor: `TimeBasedReverseStrategy_API`
   - Symbol: `EURUSD` (or your choice)
   - Period: `M5`
   - Date Range: Select your range
   - Optimization: Disabled

3. **Important Settings**
   - Go to: `Settings → Expert Properties`
   - Enable: ✅ `Allow WebRequest`
   - Add URL: `https://eausdjpyopposite.onrender.com`

4. **Start Backtest**
   - Click `Start`
   - Watch trades appear in the dashboard in real-time!
   - Trades will be marked with "BACKTEST" badge

## 📁 File Structure

```
project/
├── TimeBasedReverseStrategy_API.mq5  # MT5 Expert Advisor
├── server.js                          # Node.js API Server
├── dashboard.html                     # Real-time Dashboard
├── package.json                       # Node.js Dependencies
├── db.js                              # PostgreSQL setup + connection
└── README.md                          # This file
```

## 🔍 How It Works

### 1. Trade Execution (MT5)
- EA monitors time every tick
- At 15:25, checks previous M5 candle
- If bullish (close > open) → Opens SELL
- If bearish (close < open) → Opens BUY

### 2. API Communication
- On trade open: EA sends POST request to API
- On trade close: EA sends PUT request to API
- API stores all data in PostgreSQL (`trades` table)

### 3. Dashboard Display
- Dashboard fetches data every 5 seconds
- Displays statistics, charts, and trade history
- Updates in real-time as trades execute

## ⚙️ Configuration

### EA Settings (MT5)
```mql5
input string  API_URL = "https://eausdjpyopposite.onrender.com/api/trades";
input double  LotSize = 0.10;
input int     TradeHour = 15;
input int     TradeMinute = 25;
input int     StopLossPips = 10;
input int     TakeProfitPips = 40;
```

### Server Settings (server.js)
```javascript
const PORT = 3000;  // Change if needed
```

## 🐛 Troubleshooting

### Problem: "WebRequest error" in MT5
**Solution**: 
- Go to `Tools → Options → Expert Advisors`
- Add `https://eausdjpyopposite.onrender.com` to allowed URLs
- Restart MT5

### Problem: Dashboard shows "API Offline"
**Solution**:
- Check if server is running: `npm start`
- Check console for errors
- Verify URL: https://eausdjpyopposite.onrender.com/api/health

### Problem: Trades not appearing
**Solution**:
- Check MT5 Expert tab for errors
- Verify EA is attached and running
- Check AutoTrading is enabled
- Verify time is 15:25 on M5 chart

### Problem: CORS error in browser
**Solution**:
- Server already has CORS enabled
- Try different browser
- Check browser console for specific error

## 📈 Performance Tips

1. **For Live Trading**:
   - Use small lot sizes initially (0.01)
   - Test on demo account first
   - Monitor during trading hours

2. **For Backtesting**:
   - Use quality tick data
   - Run on "Every tick" mode
   - Review results in dashboard

3. **Database Management**:
   - Backup/export PostgreSQL data regularly
   - Archive old data monthly
   - Use "Clear All" to reset database

## 🔐 Security Notes

⚠️ **Important**: This system is designed for **local use only**.

- API has no authentication
- Database is PostgreSQL (managed DB on Render recommended)
- Add authentication before production deployment
- For production, consider:
  - Adding authentication (JWT tokens)
  - Restricting DB access and rotating credentials
  - Implementing HTTPS
  - Adding rate limiting

## 📞 Support

If you encounter issues:
1. Check MT5 Expert tab for errors
2. Check server console for logs
3. Check browser console (F12)
4. Verify all URLs are correctly configured

## 📄 License

MIT License - Free to use and modify

---

**Ready to trade!** 🚀

Start the server, attach the EA, and watch your trades in real-time on the dashboard!
