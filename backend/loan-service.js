const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./loan_db.sqlite');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS loans (mobileNumber TEXT PRIMARY KEY, loanNumber TEXT, loanType TEXT, totalLoan REAL, amountPaid REAL, outstandingAmount REAL)`);
});

const dbGet = (sql, params) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbRun = (sql, params) => new Promise((resolve, reject) => db.run(sql, params, err => err ? reject(err) : resolve()));

app.post('/api/create', async (req, res) => {
    try {
        const { mobileNumber } = req.query;
        
        // Microservice communication: Verify Account exists
        try {
            await axios.get(`http://localhost:8081/api/fetch?mobileNumber=${mobileNumber}`);
        } catch (err) {
            return res.status(400).json({ message: "Savings account required to disburse loan." });
        }

        const existing = await dbGet('SELECT * FROM loans WHERE mobileNumber = ?', [mobileNumber]);
        if (existing) return res.status(400).json({ message: "Loan already exists." });
        
        const loanNumber = "LN" + Math.floor(10000000 + Math.random() * 90000000).toString();
        await dbRun(`INSERT INTO loans (mobileNumber, loanNumber, loanType, totalLoan, amountPaid, outstandingAmount) VALUES (?, ?, ?, ?, ?, ?)`, 
            [mobileNumber, loanNumber, 'Personal Loan', 500000, 0, 500000]);
            
        // Microservice orchestration: Disburse funds to account via Transaction service
        await axios.post(`http://localhost:8084/api/internal/credit`, { mobileNumber, amount: 500000, description: "Loan Disbursal" });
            
        res.status(201).json({ message: "Loan approved successfully" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fetch', async (req, res) => {
    try {
        const loan = await dbGet('SELECT * FROM loans WHERE mobileNumber = ?', [req.query.mobileNumber]);
        res.json(loan || null);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/delete', async (req, res) => {
    try {
        const { mobileNumber } = req.query;
        const loan = await dbGet('SELECT * FROM loans WHERE mobileNumber = ?', [mobileNumber]);
        if (!loan) return res.status(400).json({ message: "No active loans found." });
        
        // Microservice orchestration: Deduct foreclosure amount
        try {
            await axios.post(`http://localhost:8084/api/internal/debit`, { mobileNumber, amount: loan.outstandingAmount, description: "Loan Foreclosure Payment" });
        } catch (err) {
            return res.status(400).json({ message: "Insufficient funds in Savings Account for foreclosure." });
        }
        
        await dbRun('DELETE FROM loans WHERE mobileNumber = ?', [mobileNumber]);
        res.status(200).json({ message: "Loan foreclosed successfully" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(8083, () => console.log('Loan Microservice running on port 8083'));
