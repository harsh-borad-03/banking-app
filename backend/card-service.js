const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./card_db.sqlite');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS cards (mobileNumber TEXT PRIMARY KEY, cardNumber TEXT, totalLimit REAL, availableAmount REAL, amountUsed REAL)`);
});

const dbGet = (sql, params) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbRun = (sql, params) => new Promise((resolve, reject) => db.run(sql, params, err => err ? reject(err) : resolve()));

app.post('/api/create', async (req, res) => {
    try {
        const { mobileNumber } = req.query;
        const existing = await dbGet('SELECT * FROM cards WHERE mobileNumber = ?', [mobileNumber]);
        if (existing) return res.status(400).json({ message: "Card already exists." });
        
        const cardNumber = Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
        await dbRun(`INSERT INTO cards (mobileNumber, cardNumber, totalLimit, availableAmount, amountUsed) VALUES (?, ?, ?, ?, ?)`, 
            [mobileNumber, cardNumber, 100000, 100000, 0]);
        res.status(201).json({ message: "Card issued successfully" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fetch', async (req, res) => {
    try {
        const card = await dbGet('SELECT * FROM cards WHERE mobileNumber = ?', [req.query.mobileNumber]);
        res.json(card || null);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payBill', async (req, res) => {
    try {
        const { mobileNumber, amount } = req.body;
        await dbRun('UPDATE cards SET amountUsed = amountUsed - ?, availableAmount = availableAmount + ? WHERE mobileNumber = ?', [amount, amount, mobileNumber]);
        res.status(200).json({ message: "Card bill updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/delete', async (req, res) => {
    try {
        const { mobileNumber } = req.query;
        const card = await dbGet('SELECT * FROM cards WHERE mobileNumber = ?', [mobileNumber]);
        if (card && card.amountUsed > 0) return res.status(400).json({ message: "Clear outstanding dues before blocking card." });
        await dbRun('DELETE FROM cards WHERE mobileNumber = ?', [mobileNumber]);
        res.status(200).json({ message: "Card deleted" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(8082, () => console.log('Card Microservice running on port 8082'));
