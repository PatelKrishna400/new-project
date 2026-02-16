const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure database file exists
if (!fs.existsSync(DB_FILE)) {
    const initialData = {
        users: {
            "guest": {
                stars: 0,
                levelsCompleted: {}, // { levelId: { stars: 3, blocksUsed: 5 } }
                badges: [],
                streak: 0,
                lastLogin: new Date().toISOString()
            }
        }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

// Helper to read DB
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
// Helper to write DB
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- API Endpoints ---

// Get User Progress
app.get('/api/progress/:userId', (req, res) => {
    const db = readDB();
    const userId = req.params.userId || 'guest';
    const user = db.users[userId] || { stars: 0, levelsCompleted: {}, badges: [] };
    res.json(user);
});

// Update Progress (Level Complete)
app.post('/api/progress/:userId', (req, res) => {
    const db = readDB();
    const userId = req.params.userId || 'guest';
    const { levelId, stars, blocksUsed } = req.body;

    if (!db.users[userId]) {
        db.users[userId] = { stars: 0, levelsCompleted: {}, badges: [], streak: 0 };
    }

    const user = db.users[userId];

    // Update stars if better score or first time
    if (!user.levelsCompleted[levelId] || user.levelsCompleted[levelId].stars < stars) {
        const oldStars = user.levelsCompleted[levelId] ? user.levelsCompleted[levelId].stars : 0;
        user.stars += (stars - oldStars);
        user.levelsCompleted[levelId] = { stars, blocksUsed };
    }

    // Check for Badges (Simple logic for now)
    if (user.stars >= 50 && !user.badges.includes('Star Collector')) {
        user.badges.push('Star Collector');
    }
    if (Object.keys(user.levelsCompleted).length >= 5 && !user.badges.includes('High Five')) {
        user.badges.push('High Five');
    }

    writeDB(db);
    res.json(user);
});

// Get Levels (Simple passthrough or load from file if needed)
// For now, levels are in public/js/levels.js, so user can load them directly via script tag,
// but an API is good for future expansion.
app.get('/api/levels', (req, res) => {
    // We could read levels.js here if we converted it to JSON, 
    // but for now frontend loads it. 
    res.json({ message: "Load levels from /js/levels.js" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
