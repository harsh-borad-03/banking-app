const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');

const app = express();
app.use(cors());

// Aggregator Pattern Endpoint
app.get('/gateway/eazybank/accounts/api/fetchCustomerDetails', async (req, res) => {
    try {
        const { mobileNumber } = req.query;
        
        // Parallel requests to Microservices
        const [accountRes, cardRes, loanRes, txRes] = await Promise.allSettled([
            axios.get(`http://localhost:8081/api/fetch?mobileNumber=${mobileNumber}`),
            axios.get(`http://localhost:8082/api/fetch?mobileNumber=${mobileNumber}`),
            axios.get(`http://localhost:8083/api/fetch?mobileNumber=${mobileNumber}`),
            axios.get(`http://localhost:8084/api/fetch?mobileNumber=${mobileNumber}`)
        ]);

        if (accountRes.status === 'rejected' && accountRes.reason.response?.status === 404) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const account = accountRes.value?.data || {};
        const card = cardRes.value?.data || null;
        const loan = loanRes.value?.data || null;
        const txData = txRes.value?.data || { transactions: [], deposits: [], payees: [], requests: [] };

        res.json({
            name: account.name,
            email: account.email,
            mobileNumber: account.mobileNumber,
            accountsDto: account.accountsDto,
            cardsDto: card,
            loansDto: loan,
            transactions: txData.transactions,
            deposits: txData.deposits,
            payees: txData.payees,
            requests: txData.requests
        });
    } catch (e) {
        res.status(500).json({ message: "Gateway Aggregation Error" });
    }
});

// Proxy routes
app.use('/accounts-api', createProxyMiddleware({ target: 'http://localhost:8081', pathRewrite: { '^/accounts-api': '' }, changeOrigin: true }));
app.use('/cards-api', createProxyMiddleware({ target: 'http://localhost:8082', pathRewrite: { '^/cards-api': '' }, changeOrigin: true }));
app.use('/loans-api', createProxyMiddleware({ target: 'http://localhost:8083', pathRewrite: { '^/loans-api': '' }, changeOrigin: true }));
app.use('/gateway/api', createProxyMiddleware({ target: 'http://localhost:8084', pathRewrite: { '^/gateway/api': '/api' }, changeOrigin: true }));
app.use('/accounts/api', createProxyMiddleware({ target: 'http://localhost:8081', pathRewrite: { '^/accounts/api': '/api' }, changeOrigin: true }));

app.listen(8080, () => console.log('API Gateway running on port 8080'));
