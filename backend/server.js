const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

let currentStatus = 'DISCONNECTED';
let qrCodeData = null;

// The Global Memory Registry to prevent duplicate sends
let sentRegistry = new Set();

// Background Campaign State
let campaignState = {
    isRunning: false,
    queue: [],
    sentCount: 0,
    totalCount: 0,
    delayInterval: 30
};

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', async (qr) => {
    currentStatus = 'PAIRING';
    qrCodeData = await qrcode.toDataURL(qr);
    console.log('[NODE] Engine ready. Waiting for QR scan...');
});

client.on('ready', () => {
    currentStatus = 'CONNECTED';
    qrCodeData = null;
    console.log('[NODE] WhatsApp Client is connected and ready!');
});

client.on('disconnected', (reason) => {
    currentStatus = 'DISCONNECTED';
    campaignState.isRunning = false; 
    console.log('[NODE] Client disconnected:', reason);
});

client.initialize();

// ==========================================
// API ROUTES
// ==========================================
app.get('/api/status', (req, res) => {
    res.json({ status: currentStatus, qr: qrCodeData });
});

app.get('/api/campaign', (req, res) => {
    res.json({ ...campaignState, memoryCount: sentRegistry.size });
});

app.post('/api/abort', (req, res) => {
    if (campaignState.isRunning) {
        campaignState.isRunning = false;
        console.log('[NODE] Received abort signal. Campaign stopped.');
        return res.json({ message: 'Campaign aborted successfully.' });
    }
    res.json({ message: 'No campaign is currently running.' });
});

app.post('/api/reset-memory', (req, res) => {
    sentRegistry.clear();
    console.log('[NODE] Sent history memory has been wiped.');
    res.json({ message: 'Memory cleared.' });
});

app.post('/api/send', async (req, res) => {
    if (currentStatus !== 'CONNECTED') {
        return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }
    if (campaignState.isRunning) {
        return res.status(400).json({ error: 'A campaign is already running in the background.' });
    }
    
    const { queue, delayInterval } = req.body;
    if (!queue || !Array.isArray(queue)) {
        return res.status(400).json({ error: 'Invalid queue data.' });
    }

    campaignState = {
        isRunning: true,
        queue: queue,
        sentCount: 0,
        totalCount: queue.length,
        delayInterval: delayInterval || 30
    };

    res.json({ message: 'Campaign handed over to Background Server successfully.' });

    // Execute background loop asynchronously with fully randomized logic
    (async () => {
        while (campaignState.isRunning && currentStatus === 'CONNECTED') {
            
            // 1. Find all indices of items that are still 'pending'
            const pendingIndices = campaignState.queue
                .map((item, index) => item.status === 'pending' ? index : -1)
                .filter(index => index !== -1);

            // If no pending items left, break the loop
            if (pendingIndices.length === 0) {
                console.log('[NODE] All tasks processed.');
                break;
            }

            // 2. Pick a COMPLETELY RANDOM pending contact
            const randomIndex = pendingIndices[Math.floor(Math.random() * pendingIndices.length)];
            const item = campaignState.queue[randomIndex];

            // AUTO-SKIP LOGIC: Prevent duplicates
            if (sentRegistry.has(item.number)) {
                console.log(`[NODE] Skipping ${item.number} - Already in Sent History.`);
                campaignState.queue[randomIndex].status = 'skipped';
                campaignState.sentCount++;
                continue; // Skip the delay and instantly jump to the next random number
            }
            
            try {
                const chatId = `${item.number}@c.us`;
                await client.sendMessage(chatId, item.message);
                console.log(`[NODE] Successfully sent to ${item.number} (Randomly picked)`);
                
                campaignState.queue[randomIndex].status = 'sent';
                campaignState.sentCount++;
                
                sentRegistry.add(item.number);
            } catch (err) {
                console.error(`[NODE] Failed to send to ${item.number}`, err);
                campaignState.queue[randomIndex].status = 'failed';
            }

            // 3. FULLY RANDOM DELAY LOGIC
            if (pendingIndices.length > 1 && campaignState.isRunning) {
                const maxMs = campaignState.delayInterval * 1000;
                const minMs = 2000; // Hard minimum of 2 seconds to avoid instant API block
                
                // Picks any random time between 2s and the Max selected time
                const randomizedDelay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
                
                console.log(`[NODE] Random Gap Selected: Resting for ${(randomizedDelay / 1000).toFixed(1)} seconds...`);
                await new Promise(resolve => setTimeout(resolve, randomizedDelay));
            }
        }
        
        console.log('[NODE] Background campaign sequence finished or aborted.');
        campaignState.isRunning = false;
    })();
});

app.post('/api/logout', async (req, res) => {
    await client.logout();
    currentStatus = 'DISCONNECTED';
    campaignState.isRunning = false;
    sentRegistry.clear(); 
    client.initialize(); 
    res.json({ message: 'Logged out successfully.' });
});

// ==========================================
// STATIC FRONTEND SERVING
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`WhatsApp Node Engine Running!`);
    console.log(`Listening on port ${PORT}`);
    console.log(`=================================`);
});
