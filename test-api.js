const API_URL = 'https://eausdjpyopposite.onrender.com/api';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   API Test Script - Sending Sample Trades               ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Sample trades data
const sampleTrades = [
    {
        ticket: 100001,
        date: '2024-02-10',
        time: '15:25',
        type: 'BUY',
        symbol: 'EURUSD',
        lotSize: 0.10,
        entry: 1.0850,
        sl: 1.0840,
        tp: 1.0890,
        status: 'OPEN',
        isBacktest: false
    },
    {
        ticket: 100002,
        date: '2024-02-11',
        time: '15:25',
        type: 'SELL',
        symbol: 'EURUSD',
        lotSize: 0.10,
        entry: 1.0875,
        sl: 1.0885,
        tp: 1.0835,
        status: 'OPEN',
        isBacktest: false
    },
    {
        ticket: 100003,
        date: '2024-02-12',
        time: '15:25',
        type: 'BUY',
        symbol: 'EURUSD',
        lotSize: 0.10,
        entry: 1.0860,
        sl: 1.0850,
        tp: 1.0900,
        status: 'OPEN',
        isBacktest: false
    }
];

// Trade updates (simulate closed trades)
const tradeUpdates = [
    { ticket: 100001, exit: 1.0890, pnl: 40.00, status: 'WIN' },
    { ticket: 100002, exit: 1.0885, pnl: -10.00, status: 'LOSS' },
    { ticket: 100003, exit: 1.0900, pnl: 40.00, status: 'WIN' }
];

async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();

        if (data.success) {
            console.log('✓ API is running');
            console.log(`  Status: ${data.status}`);
            console.log(`  Time: ${data.timestamp}\n`);
            return true;
        }
    } catch (error) {
        console.error('✗ API is not running!');
        console.error('  Please start the server first: npm start\n');
        return false;
    }
}

async function sendTrade(trade) {
    try {
        const response = await fetch(`${API_URL}/trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(trade)
        });

        const data = await response.json();

        if (data.success) {
            console.log(`✓ Trade created: ${trade.type} ${trade.symbol} | Ticket: ${trade.ticket}`);
            return true;
        } else {
            console.error(`✗ Failed to create trade: ${data.error}`);
            return false;
        }
    } catch (error) {
        console.error(`✗ Error sending trade: ${error.message}`);
        return false;
    }
}

async function updateTrade(update) {
    try {
        const response = await fetch(`${API_URL}/trades/${update.ticket}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(update)
        });

        const data = await response.json();

        if (data.success) {
            console.log(`✓ Trade updated: Ticket ${update.ticket} | P&L: $${update.pnl} | Status: ${update.status}`);
            return true;
        } else {
            console.error(`✗ Failed to update trade: ${data.error}`);
            return false;
        }
    } catch (error) {
        console.error(`✗ Error updating trade: ${error.message}`);
        return false;
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('Step 1: Checking API health...\n');
    const isHealthy = await checkAPIHealth();

    if (!isHealthy) {
        console.log('Exiting...');
        return;
    }

    console.log('Step 2: Sending sample trades...\n');

    for (const trade of sampleTrades) {
        await sendTrade(trade);
        await delay(500); // Wait 500ms between trades
    }

    console.log('\nStep 3: Waiting 2 seconds before updating trades...\n');
    await delay(2000);

    console.log('Step 4: Updating trades (simulating closes)...\n');

    for (const update of tradeUpdates) {
        await updateTrade(update);
        await delay(500);
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   Test Completed Successfully!                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\nCheck the dashboard at: https://eausdjpyopposite.onrender.com/dashboard.html');
    console.log('You should see 3 trades with results.\n');
}

// Run the test
runTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
