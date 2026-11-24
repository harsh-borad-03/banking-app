const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.json());

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const db = new sqlite3.Database('./enterprise_banking.db', (err) => {
    if (err) console.error('Error connecting to database:', err.message);
    else console.log('Connected to robust SQLite enterprise database.');
});

// Initialize advanced schema
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS accounts (
        mobileNumber TEXT PRIMARY KEY, name TEXT, email TEXT, accountType TEXT, balance REAL, accountNumber TEXT, address TEXT, aadhaarNumber TEXT, panNumber TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS cards (
        mobileNumber TEXT PRIMARY KEY, cardNumber TEXT, totalLimit REAL, availableAmount REAL, amountUsed REAL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS loans (
        mobileNumber TEXT PRIMARY KEY, loanNumber TEXT, loanType TEXT, totalLoan REAL, amountPaid REAL, outstandingAmount REAL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY, mobileNumber TEXT, type TEXT, description TEXT, amount REAL, date TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS deposits (
        id TEXT PRIMARY KEY, mobileNumber TEXT, type TEXT, amount REAL, duration TEXT, interestRate REAL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY, mobileNumber TEXT, requestType TEXT, status TEXT, date TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS payees (
        id TEXT PRIMARY KEY, mobileNumber TEXT, payeeName TEXT, payeeAccount TEXT, ifscCode TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS pins (
        mobileNumber TEXT PRIMARY KEY, pin TEXT
    )`);
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, result) => err ? reject(err) : resolve(result)));
const dbAll = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const dbRun = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this) }));

// ==========================
// CORE SERVICES
// ==========================
app.post('/accounts/api/create', asyncHandler(async (req, res) => {
    const data = req.body;
    const existing = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [data.mobileNumber]);
    if (existing) return res.status(400).json({ message: "Account already exists." });
    
    const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    await dbRun(
        `INSERT INTO accounts (mobileNumber, name, email, accountType, balance, accountNumber, address, aadhaarNumber, panNumber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.mobileNumber, data.name, data.email, data.accountType, data.balance, accountNumber, data.address, data.aadhaarNumber, data.panNumber]
    );
    
    if (data.balance > 0) {
        await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), data.mobileNumber, 'CREDIT', 'Initial Funding', data.balance, new Date().toISOString()]);
    }
    
    res.status(201).json({ message: "Account created successfully", accountNumber });
}));

app.get('/accounts/api/fetch', asyncHandler(async (req, res) => {
    const { mobileNumber } = req.query;
    const account = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [mobileNumber]);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ name: account.name, email: account.email, mobileNumber: account.mobileNumber, accountsDto: { accountNumber: account.accountNumber, accountType: account.accountType, branchAddress: account.address, balance: account.balance } });
}));

app.delete('/accounts/api/delete', asyncHandler(async (req, res) => {
    const { mobileNumber } = req.query;
    const card = await dbGet('SELECT * FROM cards WHERE mobileNumber = ?', [mobileNumber]);
    if (card && card.amountUsed > 0) return res.status(400).json({ message: "Clear credit card dues before closing account." });
    
    const loan = await dbGet('SELECT * FROM loans WHERE mobileNumber = ?', [mobileNumber]);
    if (loan) return res.status(400).json({ message: "Foreclose active loans before closing account." });

    await dbRun('DELETE FROM accounts WHERE mobileNumber = ?', [mobileNumber]);
    await dbRun('DELETE FROM cards WHERE mobileNumber = ?', [mobileNumber]);
    await dbRun('DELETE FROM loans WHERE mobileNumber = ?', [mobileNumber]);
    await dbRun('DELETE FROM deposits WHERE mobileNumber = ?', [mobileNumber]);
    res.status(200).json({ message: "Account deleted successfully" });
}));

app.post('/cards/api/create', asyncHandler(async (req, res) => {
    const { mobileNumber } = req.query;
    const existing = await dbGet('SELECT * FROM cards WHERE mobileNumber = ?', [mobileNumber]);
    if (existing) return res.status(400).json({ message: "Card already exists." });
    const cardNumber = Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
    await dbRun(`INSERT INTO cards (mobileNumber, cardNumber, totalLimit, availableAmount, amountUsed) VALUES (?, ?, ?, ?, ?)`, [mobileNumber, cardNumber, 100000, 100000, 0]);
    res.status(201).json({ message: "Card issued successfully" });
}));

app.delete('/cards/api/delete', asyncHandler(async (req, res) => {
    const { mobileNumber } = req.query;
    const card = await dbGet('SELECT * FROM cards WHERE mobileNumber = ?', [mobileNumber]);
    if (card && card.amountUsed > 0) return res.status(400).json({ message: "Clear outstanding dues before blocking card." });
    
    await dbRun('DELETE FROM cards WHERE mobileNumber = ?', [mobileNumber]);
    res.status(200).json({ message: "Card deleted successfully" });
}));

app.post('/loans/api/create', asyncHandler(async (req, res) => {
    const { mobileNumber } = req.query;
    const account = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [mobileNumber]);
    if (!account) return res.status(400).json({ message: "Savings account required to disburse loan." });
    
    const existing = await dbGet('SELECT * FROM loans WHERE mobileNumber = ?', [mobileNumber]);
    if (existing) return res.status(400).json({ message: "Loan already exists." });
    
    const loanNumber = "LN" + Math.floor(10000000 + Math.random() * 90000000).toString();
    await dbRun(`INSERT INTO loans (mobileNumber, loanNumber, loanType, totalLoan, amountPaid, outstandingAmount) VALUES (?, ?, ?, ?, ?, ?)`, [mobileNumber, loanNumber, 'Personal Loan', 500000, 0, 500000]);
    
    // Disburse loan to account
    await dbRun('UPDATE accounts SET balance = balance + ? WHERE mobileNumber = ?', [500000, mobileNumber]);
    await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), mobileNumber, 'CREDIT', 'Loan Disbursal', 500000, new Date().toISOString()]);
        
    res.status(201).json({ message: "Loan approved successfully" });
}));

app.delete('/loans/api/delete', asyncHandler(async (req, res) => {
    const { mobileNumber } = req.query;
    const loan = await dbGet('SELECT * FROM loans WHERE mobileNumber = ?', [mobileNumber]);
    if (!loan) return res.status(400).json({ message: "No active loans found." });
    
    const account = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [mobileNumber]);
    if (!account || account.balance < loan.outstandingAmount) return res.status(400).json({ message: "Insufficient funds in Savings Account for foreclosure." });
    
    // Deduct foreclosure amount
    await dbRun('UPDATE accounts SET balance = balance - ? WHERE mobileNumber = ?', [loan.outstandingAmount, mobileNumber]);
    await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), mobileNumber, 'DEBIT', 'Loan Foreclosure Payment', loan.outstandingAmount, new Date().toISOString()]);
        
    await dbRun('DELETE FROM loans WHERE mobileNumber = ?', [mobileNumber]);
    res.status(200).json({ message: "Loan deleted successfully" });
}));

// ==========================
// ADVANCED FEATURES API
// ==========================
app.post('/api/transfer', asyncHandler(async (req, res) => {
    const { mobileNumber, amount, description } = req.body;
    const account = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [mobileNumber]);
    if (!account) return res.status(404).json({ message: "Account not found" });
    if (account.balance < amount) return res.status(400).json({ message: "Insufficient funds" });
    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    
    await dbRun('UPDATE accounts SET balance = balance - ? WHERE mobileNumber = ?', [amount, mobileNumber]);
    await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), mobileNumber, 'DEBIT', description, amount, new Date().toISOString()]);
        
    res.status(200).json({ message: "Transfer successful" });
}));

app.post('/api/deposit', asyncHandler(async (req, res) => {
    const { mobileNumber, type, amount, duration } = req.body;
    const account = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [mobileNumber]);
    if (!account || account.balance < amount) return res.status(400).json({ message: "Insufficient funds to open deposit" });
    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    
    await dbRun('UPDATE accounts SET balance = balance - ? WHERE mobileNumber = ?', [amount, mobileNumber]);
    await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), mobileNumber, 'DEBIT', `Opened ${type}`, amount, new Date().toISOString()]);
    await dbRun(`INSERT INTO deposits (id, mobileNumber, type, amount, duration, interestRate) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), mobileNumber, type, amount, duration, 7.5]);
        
    res.status(200).json({ message: "Deposit created successfully" });
}));

app.post('/api/paycard', asyncHandler(async (req, res) => {
    const { mobileNumber, amount } = req.body;
    const account = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [mobileNumber]);
    if (!account || account.balance < amount) return res.status(400).json({ message: "Insufficient funds" });
    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    
    await dbRun('UPDATE accounts SET balance = balance - ? WHERE mobileNumber = ?', [amount, mobileNumber]);
    await dbRun('UPDATE cards SET amountUsed = amountUsed - ?, availableAmount = availableAmount + ? WHERE mobileNumber = ?', [amount, amount, mobileNumber]);
    await dbRun(`INSERT INTO transactions (id, mobileNumber, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), mobileNumber, 'DEBIT', 'Credit Card Bill Payment', amount, new Date().toISOString()]);
        
    res.status(200).json({ message: "Credit Card bill paid successfully" });
}));

app.post('/api/request', asyncHandler(async (req, res) => {
    const { mobileNumber, requestType } = req.body;
    await dbRun(`INSERT INTO requests (id, mobileNumber, requestType, status, date) VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), mobileNumber, requestType, 'PENDING', new Date().toISOString()]);
    res.status(200).json({ message: "Request submitted successfully" });
}));

app.post('/api/payee', asyncHandler(async (req, res) => {
    const { mobileNumber, payeeName, payeeAccount, ifscCode } = req.body;
    await dbRun(`INSERT INTO payees (id, mobileNumber, payeeName, payeeAccount, ifscCode) VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), mobileNumber, payeeName, payeeAccount, ifscCode]);
    res.status(200).json({ message: "Payee added successfully" });
}));

app.post('/api/setpin', asyncHandler(async (req, res) => {
    const { mobileNumber, pin } = req.body;
    await dbRun(`INSERT OR REPLACE INTO pins (mobileNumber, pin) VALUES (?, ?)`, [mobileNumber, pin]);
    res.status(200).json({ message: "PIN set successfully" });
}));

// ==========================
// AGGREGATOR
// ==========================
app.get('/gateway/eazybank/accounts/api/fetchCustomerDetails', asyncHandler(async (req, res) => {
    const { mobileNumber } = req.query;
    
    const account = await dbGet('SELECT * FROM accounts WHERE mobileNumber = ?', [mobileNumber]);
    if (!account) return res.status(404).json({ message: "Customer not found" });

    const card = await dbGet('SELECT * FROM cards WHERE mobileNumber = ?', [mobileNumber]);
    const loan = await dbGet('SELECT * FROM loans WHERE mobileNumber = ?', [mobileNumber]);
    const transactions = await dbAll('SELECT * FROM transactions WHERE mobileNumber = ? ORDER BY date DESC LIMIT 10', [mobileNumber]);
    const deposits = await dbAll('SELECT * FROM deposits WHERE mobileNumber = ?', [mobileNumber]);
    const payees = await dbAll('SELECT * FROM payees WHERE mobileNumber = ?', [mobileNumber]);
    const requests = await dbAll('SELECT * FROM requests WHERE mobileNumber = ?', [mobileNumber]);

    res.json({
        name: account.name,
        email: account.email,
        mobileNumber: account.mobileNumber,
        accountsDto: {
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            branchAddress: account.address,
            balance: account.balance
        },
        cardsDto: card || null,
        loansDto: loan || null,
        transactions,
        deposits,
        payees,
        requests
    });
}));

app.use((err, req, res, next) => {
    console.error("Backend Error:", err);
    res.status(500).json({ message: "Enterprise Server Error: " + err.message });
});

app.listen(PORT, () => {
    console.log(`Enterprise Banking Backend with Advanced Features running on port ${PORT}`);
});
