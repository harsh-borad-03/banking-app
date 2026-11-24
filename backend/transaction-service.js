const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./transaction_db.sqlite');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, mobileNumber TEXT, type TEXT, description TEXT, amount REAL, date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS deposits (id TEXT PRIMARY KEY, mobileNumber TEXT, type TEXT, amount REAL, duration TEXT, interestRate REAL)`);
    db.run(`CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, mobileNumber TEXT, requestType TEXT, status TEXT, date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS payees (id TEXT PRIMARY KEY, mobileNumber TEXT, payeeName TEXT, payeeAccount TEXT, ifscCode TEXT)`);
});

const dbAll = (sql, params) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const dbRun = (sql, params) => new Promise((resolve, reject) => db.run(sql, params, err => err ? reject(err) : resolve()));

app.get('/api/fetch', async (req, res) => {
    try {
        const { mobileNumber } = req.query;
        const transactions = await dbAll('SELECT * FROM transactions WHERE mobileNumber = ? ORDER BY date DESC LIMIT 10', [mobileNumber]);
        const deposits = await dbAll('SELECT * FROM deposits WHERE mobileNumber = ?', [mobileNumber]);
        const payees = await dbAll('SELECT * FROM payees WHERE mobileNumber = ?', [mobileNumber]);
        const requests = await dbAll('SELECT * FROM requests WHERE mobileNumber = ?', [mobileNumber]);
        res.json({ transactions, deposits, payees, requests });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Internal endpoint used by other microservices
app.post('/api/internal/credit', async (req, res) => {
    try {
        const { mobileNumber, amount, description } = req.body;
        await axios.post('http://localhost:8081/api/updateBalance', { mobileNumber, amount, type: 'CREDIT' });
        await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`, [uuidv4(), mobileNumber, 'CREDIT', description, amount, new Date().toISOString()]);
        res.status(200).json({ message: "Credited" });
    } catch (e) { res.status(400).json({ message: "Failed internal credit" }); }
});

app.post('/api/internal/debit', async (req, res) => {
    try {
        const { mobileNumber, amount, description } = req.body;
        await axios.post('http://localhost:8081/api/updateBalance', { mobileNumber, amount, type: 'DEBIT' });
        await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`, [uuidv4(), mobileNumber, 'DEBIT', description, amount, new Date().toISOString()]);
        res.status(200).json({ message: "Debited" });
    } catch (e) { res.status(400).json({ message: "Failed internal debit" }); }
});

// Public endpoints
app.post('/api/transfer', async (req, res) => {
    try {
        const { mobileNumber, amount, description } = req.body;
        if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
        await axios.post('http://localhost:8081/api/updateBalance', { mobileNumber, amount, type: 'DEBIT' });
        await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`, [uuidv4(), mobileNumber, 'DEBIT', description, amount, new Date().toISOString()]);
        res.status(200).json({ message: "Transfer successful" });
    } catch (e) { res.status(400).json({ message: "Insufficient funds or account not found" }); }
});

app.post('/api/deposit', async (req, res) => {
    try {
        const { mobileNumber, type, amount, duration } = req.body;
        if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
        await axios.post('http://localhost:8081/api/updateBalance', { mobileNumber, amount, type: 'DEBIT' });
        await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`, [uuidv4(), mobileNumber, 'DEBIT', `Opened ${type}`, amount, new Date().toISOString()]);
        await dbRun(`INSERT INTO deposits (id, mobileNumber, type, amount, duration, interestRate) VALUES (?, ?, ?, ?, ?, ?)`, [uuidv4(), mobileNumber, type, amount, duration, 7.5]);
        res.status(200).json({ message: "Deposit created" });
    } catch (e) { res.status(400).json({ message: "Insufficient funds" }); }
});

app.post('/api/paycard', async (req, res) => {
    try {
        const { mobileNumber, amount } = req.body;
        if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
        await axios.post('http://localhost:8081/api/updateBalance', { mobileNumber, amount, type: 'DEBIT' });
        await axios.post('http://localhost:8082/api/payBill', { mobileNumber, amount });
        await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`, [uuidv4(), mobileNumber, 'DEBIT', 'Credit Card Bill Payment', amount, new Date().toISOString()]);
        res.status(200).json({ message: "Credit Card bill paid" });
    } catch (e) { res.status(400).json({ message: "Payment failed" }); }
});

app.post('/api/request', async (req, res) => {
    try {
        const { mobileNumber, requestType } = req.body;
        await dbRun(`INSERT INTO requests (id, mobileNumber, requestType, status, date) VALUES (?, ?, ?, ?, ?)`, [uuidv4(), mobileNumber, requestType, 'PENDING', new Date().toISOString()]);
        res.status(200).json({ message: "Request submitted" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payee', async (req, res) => {
    try {
        const { mobileNumber, payeeName, payeeAccount, ifscCode } = req.body;
        await dbRun(`INSERT INTO payees (id, mobileNumber, payeeName, payeeAccount, ifscCode) VALUES (?, ?, ?, ?, ?)`, [uuidv4(), mobileNumber, payeeName, payeeAccount, ifscCode]);
        res.status(200).json({ message: "Payee added" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(8084, () => console.log('Transaction Microservice running on port 8084'));
