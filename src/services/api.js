import axios from 'axios';

const isDevelopment = import.meta.env.DEV;

// Pointing to the API Gateway on port 8080 (or through Vite proxy)
const ACCOUNTS_BASE = isDevelopment ? '/accounts-api' : 'http://localhost:8080/accounts-api';
const CARDS_BASE = isDevelopment ? '/cards-api' : 'http://localhost:8080/cards-api';
const LOANS_BASE = isDevelopment ? '/loans-api' : 'http://localhost:8080/loans-api';
const GATEWAY_BASE = isDevelopment ? '/gateway' : 'http://localhost:8080/gateway';
const ADVANCED_BASE = isDevelopment ? '/gateway' : 'http://localhost:8080/gateway';

const api = {
  accounts: {
    create: (data) => axios.post(`${ACCOUNTS_BASE}/api/create`, data),
    fetch: (mobileNumber) => axios.get(`${ACCOUNTS_BASE}/api/fetch`, { params: { mobileNumber } }),
    delete: (mobileNumber) => axios.delete(`${ACCOUNTS_BASE}/api/delete`, { params: { mobileNumber } }),
  },
  cards: {
    create: (mobileNumber) => axios.post(`${CARDS_BASE}/api/create`, {}, { params: { mobileNumber } }),
    fetch: (mobileNumber) => axios.get(`${CARDS_BASE}/api/fetch`, { params: { mobileNumber } }),
    delete: (mobileNumber) => axios.delete(`${CARDS_BASE}/api/delete`, { params: { mobileNumber } }),
  },
  loans: {
    create: (mobileNumber) => axios.post(`${LOANS_BASE}/api/create`, {}, { params: { mobileNumber } }),
    fetch: (mobileNumber) => axios.get(`${LOANS_BASE}/api/fetch`, { params: { mobileNumber } }),
    delete: (mobileNumber) => axios.delete(`${LOANS_BASE}/api/delete`, { params: { mobileNumber } }),
  },
  gateway: {
    fetchCustomerDetails: (mobileNumber) => axios.get(`${GATEWAY_BASE}/eazybank/accounts/api/fetchCustomerDetails`, { params: { mobileNumber } }),
  },
  advanced: {
    transfer: (data) => axios.post(`${ADVANCED_BASE}/api/transfer`, data),
    deposit: (data) => axios.post(`${ADVANCED_BASE}/api/deposit`, data),
    paycard: (data) => axios.post(`${ADVANCED_BASE}/api/paycard`, data),
    request: (data) => axios.post(`${ADVANCED_BASE}/api/request`, data),
    payee: (data) => axios.post(`${ADVANCED_BASE}/api/payee`, data),
    setpin: (data) => axios.post(`${ACCOUNTS_BASE}/api/setpin`, data),
  }
};

export default api;
