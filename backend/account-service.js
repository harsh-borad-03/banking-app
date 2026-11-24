const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./account_db.sqlite');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS accounts (mobileNumber TEXT PRIMARY KEY, name TEXT, email TEXT, accountType TEXT, balance REAL, accountNumber TEXT, address TEXT, aadhaarNumber TEXT, panNumber TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS pins (mobileNumber TEXT PRIMARY KEY, pin TEXT)`);
});

const dbGet = (sql, params) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbRun = (sql, params) => new Promise((resolve, reject) => db.run(sql, params, err => err ? reject(err) : resolve()));

app.post('/api/create', async (req, res) => {
    try {
        const data = req.body;
        const existing = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [data.mobileNumber]);
        if (existing) return res.status(400).json({ message: "Account already exists." });
        
        const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        await dbRun(`INSERT INTO accounts (mobileNumber, name, email, accountType, balance, accountNumber, address, aadhaarNumber, panNumber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.mobileNumber, data.name, data.email, data.accountType, data.balance, accountNumber, data.address, data.aadhaarNumber, data.panNumber]);
        res.status(201).json({ message: "Account created successfully", accountNumber });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fetch', async (req, res) => {
    try {
        const account = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [req.query.mobileNumber]);
        if (!account) return res.status(404).json({ message: "Account not found" });
        res.json({ name: account.name, email: account.email, mobileNumber: account.mobileNumber, accountsDto: { accountNumber: account.accountNumber, accountType: account.accountType, branchAddress: account.address, balance: account.balance } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/updateBalance', async (req, res) => {
    try {
        const { mobileNumber, amount, type } = req.body;
        const account = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [mobileNumber]);
        if (!account) return res.status(404).json({ message: "Account not found" });
        
        if (type === 'DEBIT' && account.balance < amount) return res.status(400).json({ message: "Insufficient funds" });
        
        const newBalance = type === 'CREDIT' ? account.balance + amount : account.balance - amount;
        await dbRun('UPDATE accounts SET balance = ? WHERE mobileNumber = ?', [newBalance, mobileNumber]);
        res.status(200).json({ message: "Balance updated", newBalance });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/delete', async (req, res) => {
    await dbRun('DELETE FROM accounts WHERE mobileNumber = ?', [req.query.mobileNumber]);
    res.status(200).json({ message: "Account deleted" });
});

app.post('/api/setpin', async (req, res) => {
    await dbRun(`INSERT OR REPLACE INTO pins (mobileNumber, pin) VALUES (?, ?)`, [req.body.mobileNumber, req.body.pin]);
    res.status(200).json({ message: "PIN set successfully" });
});

app.listen(8081, () => console.log('Account Microservice running on port 8081'));
