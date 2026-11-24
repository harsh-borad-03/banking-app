import React, { useState, useEffect } from 'react';
import { 
  Building2, LogOut, Search, ChevronRight, RefreshCw, Wallet, CreditCard, Landmark, 
  FileText, Smartphone, Shield, FileCheck, PiggyBank, ArrowRightLeft, UserPlus, 
  Calculator, Receipt, CheckCircle, AlertCircle, Lock
} from 'lucide-react';
import api from './services/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [topNav, setTopNav] = useState('Accounts');
  const [sidebarMenu, setSidebarMenu] = useState('Account Summary');
  const [mobileNumber, setMobileNumber] = useState('4354437687');
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({});

  const formatINR = (amount) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
  };

  const showMsg = (msg, isError = false) => {
    if (isError) setError(msg);
    else setSuccessMsg(msg);
    setTimeout(() => { setError(''); setSuccessMsg(''); }, 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!mobileNumber) return;
    setLoading(true);
    try {
      const response = await api.gateway.fetchCustomerDetails(mobileNumber).catch(() => api.accounts.fetch(mobileNumber));
      setCustomerData(response.data);
      setIsLoggedIn(true);
      showMsg("Authentication Successful.");
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Let new users in so they can create an account!
        setCustomerData(null);
        setIsLoggedIn(true);
        showMsg("Welcome! Please open an account to get started.");
      } else {
        showMsg('Network error. Please try again.', true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCustomerData(null);
    setMobileNumber('');
    showMsg("You have securely logged out.");
  };

  // Keep ability to refresh data silently
  const fetchCustomerData = async (num = mobileNumber) => {
    if (!num) return;
    try {
      const response = await api.gateway.fetchCustomerDetails(num).catch(() => api.accounts.fetch(num));
      setCustomerData(response.data);
    } catch (err) {
      // silently fail if it's a background refresh
    }
  };

  const handleInput = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleAction = async (actionFunction, successMessage, resetKeys = [], refreshNumber = mobileNumber) => {
    setLoading(true);
    try {
      await actionFunction();
      showMsg(successMessage);
      fetchCustomerData(refreshNumber);
      const newFormData = { ...formData };
      resetKeys.forEach(k => delete newFormData[k]);
      setFormData(newFormData);
    } catch (err) {
      showMsg(err.response?.data?.message || "Operation failed", true);
    }
    setLoading(false);
  };

  const navMenus = {
    'Accounts': ['Account Summary', 'Open Savings Account', 'Fixed Deposit', 'Recurring Deposit', 'Cheque Book Request', 'View Statements'],
    'Fund Transfer': ['IMPS (Instant)', 'NEFT / RTGS', 'Manage Payees', 'Transfer History'],
    'BillPay & Recharge': ['Pay Utility Bills', 'Mobile / DTH Recharge', 'FASTag Recharge'],
    'Cards': ['Credit Card Summary', 'Apply for Credit Card', 'Pay Credit Card Bill', 'Block/Hotlist Card', 'Debit Card Services'],
    'Loans': ['Active Loans', 'Apply for New Loan', 'Foreclose Loan', 'EMI Calculator']
  };

  const handleNavClick = (nav) => {
    setTopNav(nav);
    setSidebarMenu(navMenus[nav][0]);
  };

  const renderContent = () => {
    if (sidebarMenu === 'Account Summary') {
      return (
        <>
          <h2 className="page-title">Account Summary</h2>
          {customerData?.accountsDto ? (
            <div className="corporate-card">
              <div className="card-header">
                <div><Wallet size={18} style={{display:'inline', marginRight:'8px', verticalAlign:'text-bottom', color:'var(--accent-primary)'}}/> Operative Accounts</div>
                <span className="pill-badge pill-success">Active</span>
              </div>
              <div className="card-body" style={{borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)'}}>
                 <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Available Balance</div>
                 <div className="highlight-balance">{formatINR(customerData.accountsDto.balance)}</div>
              </div>
              <table className="corp-table">
                <thead><tr><th>Account No.</th><th>Account Type</th><th>Branch / Address</th></tr></thead>
                <tbody>
                  <tr>
                    <td style={{fontFamily: 'var(--font-display)', fontSize: '1.1rem'}}>{customerData.accountsDto.accountNumber}</td>
                    <td>{customerData.accountsDto.accountType}</td>
                    <td>{customerData.accountsDto.branchAddress}</td>
                  </tr>
                </tbody>
              </table>
              <div className="action-bar">
                <button className="corp-btn corp-btn-danger" onClick={() => handleAction(() => api.accounts.delete(mobileNumber), "Account closed successfully")}>Close Account</button>
              </div>
            </div>
          ) : (
            <div className="corporate-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{display:'inline-flex', padding:'1.5rem', background:'rgba(59,130,246,0.1)', borderRadius:'50%', marginBottom:'1.5rem'}}>
                <PiggyBank size={48} color="var(--accent-primary)" />
              </div>
              <h3 style={{fontSize:'1.5rem', marginBottom:'0.5rem', color:'white'}}>No Active Accounts</h3>
              <p style={{color:'var(--text-secondary)', marginBottom:'2rem'}}>Begin your financial journey with Bharat Premier Bank today.</p>
              <button className="corp-btn corp-btn-primary" onClick={() => setSidebarMenu('Open Savings Account')}>Open Account Now</button>
            </div>
          )}

          <h2 className="page-title" style={{ marginTop: '3rem' }}>Quick Actions</h2>
          <div className="quick-links">
             <div className="quick-link-box" onClick={() => handleNavClick('Fund Transfer')}>
                <div className="quick-link-icon"><ArrowRightLeft size={24} /></div>
                <div className="quick-link-text">Transfer Money</div>
             </div>
             <div className="quick-link-box" onClick={() => handleNavClick('BillPay & Recharge')}>
                <div className="quick-link-icon"><Smartphone size={24} /></div>
                <div className="quick-link-text">Pay Bills</div>
             </div>
             <div className="quick-link-box" onClick={() => handleNavClick('Cards')}>
                <div className="quick-link-icon"><CreditCard size={24} /></div>
                <div className="quick-link-text">Manage Cards</div>
             </div>
             <div className="quick-link-box" onClick={() => handleNavClick('Loans')}>
                <div className="quick-link-icon"><Landmark size={24} /></div>
                <div className="quick-link-text">Apply for Loan</div>
             </div>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'Open Savings Account') {
      return (
        <>
          <h2 className="page-title">Digital Account Opening</h2>
          <div className="corporate-card">
            <div className="card-header">e-KYC Verification Details</div>
            <div className="card-body">
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                handleAction(async () => {
                  await api.accounts.create({...formData, accountType: 'Savings', balance: parseFloat(formData.initialDeposit)||0});
                  setMobileNumber(formData.mobileNumber);
                }, "Account Created Successfully!", [], formData.mobileNumber); 
              }} className="corp-form">
                <div className="form-group"><label className="form-label">Full Name as per Aadhaar</label><input required className="corp-input" value={formData.name || ''} onChange={e => handleInput('name', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Mobile Number</label><input required className="corp-input" value={formData.mobileNumber || ''} onChange={e => handleInput('mobileNumber', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Email ID</label><input required type="email" className="corp-input" value={formData.email || ''} onChange={e => handleInput('email', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Initial Funding (₹)</label><input required type="number" className="corp-input" value={formData.initialDeposit || ''} onChange={e => handleInput('initialDeposit', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Aadhaar Number</label><input required maxLength="12" className="corp-input" value={formData.aadhaarNumber || ''} onChange={e => handleInput('aadhaarNumber', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">PAN Number</label><input required maxLength="10" className="corp-input" value={formData.panNumber || ''} onChange={e => handleInput('panNumber', e.target.value)} /></div>
                <div className="form-group full"><label className="form-label">Communication Address</label><input required className="corp-input" value={formData.address || ''} onChange={e => handleInput('address', e.target.value)} /></div>
                <div className="action-bar full"><button type="submit" className="corp-btn corp-btn-primary" disabled={loading}>Submit e-KYC</button></div>
              </form>
            </div>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'Fixed Deposit' || sidebarMenu === 'Recurring Deposit') {
      const type = sidebarMenu;
      return (
        <>
          <h2 className="page-title">Term Deposits</h2>
          <div className="corporate-card">
            <div className="card-header">Open New {type}</div>
            <div className="card-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAction(() => api.advanced.deposit({ mobileNumber, type, amount: parseFloat(formData.depositAmount), duration: formData.duration }), `${type} Opened!`, ['depositAmount', 'duration']); }} className="corp-form">
                <div className="form-group"><label className="form-label">Principal Amount (₹)</label><input required type="number" className="corp-input" value={formData.depositAmount || ''} onChange={e => handleInput('depositAmount', e.target.value)} /></div>
                <div className="form-group">
                  <label className="form-label">Select Term</label>
                  <select required className="corp-input" value={formData.duration || ''} onChange={e => handleInput('duration', e.target.value)}>
                    <option value="">Select Duration</option>
                    <option value="1 Year">1 Year @ 7.5% p.a.</option>
                    <option value="3 Years">3 Years @ 7.8% p.a.</option>
                    <option value="5 Years">5 Years @ 8.0% p.a.</option>
                  </select>
                </div>
                <div className="action-bar full"><button type="submit" className="corp-btn corp-btn-primary" disabled={loading}>Open Deposit</button></div>
              </form>
            </div>
          </div>

          {customerData?.deposits?.filter(d => d.type === type).length > 0 && (
            <div className="corporate-card">
              <div className="card-header">Your Active {type}s</div>
              <table className="corp-table">
                <thead><tr><th>Deposit ID</th><th>Term</th><th>Interest Rate</th><th className="text-right">Principal</th></tr></thead>
                <tbody>
                  {customerData.deposits.filter(d => d.type === type).map(d => (
                    <tr key={d.id}><td style={{fontFamily:'var(--font-display)'}}>{d.id.slice(0,8).toUpperCase()}</td><td>{d.duration}</td><td><span className="pill-badge pill-primary">{d.interestRate}%</span></td><td className="text-right amount credit">{formatINR(d.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      );
    }

    if (sidebarMenu === 'Cheque Book Request') {
      return (
        <>
          <h2 className="page-title">Service Requests</h2>
          <div className="corporate-card">
            <div className="card-header">Cheque Book Delivery</div>
            <div className="card-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>A new 25-leaf cheque book will be dispatched to your registered communication address via secure courier within 3-5 working days.</p>
              <button onClick={() => handleAction(() => api.advanced.request({ mobileNumber, requestType: 'Cheque Book' }), "Request submitted.")} className="corp-btn corp-btn-primary" disabled={loading}>Submit Request</button>
            </div>
          </div>
          {customerData?.requests?.length > 0 && (
            <div className="corporate-card">
              <div className="card-header">Track Requests</div>
              <table className="corp-table">
                <thead><tr><th>Request ID</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {customerData.requests.map(r => (
                    <tr key={r.id}>
                      <td style={{fontFamily:'var(--font-display)'}}>{r.id.slice(0,8).toUpperCase()}</td>
                      <td>{r.requestType}</td>
                      <td><span className="pill-badge pill-danger">{r.status}</span></td>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      );
    }

    if (sidebarMenu === 'View Statements' || sidebarMenu === 'Transfer History') {
      return (
        <>
          <h2 className="page-title">Account Ledger</h2>
          <div className="corporate-card">
            <div className="card-header">Recent Transactions</div>
            <table className="corp-table">
              <thead><tr><th>Date & Time</th><th>Reference ID</th><th>Narration</th><th className="text-right">Amount (₹)</th></tr></thead>
              <tbody>
                {customerData?.transactions?.length > 0 ? customerData.transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{color:'var(--text-secondary)'}}>{new Date(t.date).toLocaleString()}</td>
                    <td style={{fontFamily:'var(--font-display)', color:'var(--text-secondary)'}}>{t.id.slice(0,8).toUpperCase()}</td>
                    <td style={{fontWeight:'500'}}>{t.description}</td>
                    <td className={`text-right amount ${t.type === 'CREDIT' ? 'credit' : 'debit'}`}>{t.type === 'CREDIT' ? '+' : '-'}{formatINR(t.amount)}</td>
                  </tr>
                )) : <tr><td colSpan="4" className="text-center" style={{padding:'3rem', color:'var(--text-secondary)'}}>No transactions found in the ledger.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'IMPS (Instant)' || sidebarMenu === 'NEFT / RTGS' || sidebarMenu === 'Pay Utility Bills' || sidebarMenu === 'Mobile / DTH Recharge' || sidebarMenu === 'FASTag Recharge') {
      const isBill = sidebarMenu.includes('Bill') || sidebarMenu.includes('Recharge');
      return (
        <>
          <h2 className="page-title">{sidebarMenu}</h2>
          <div className="corporate-card">
            <div className="card-header">Payment Initiation</div>
            <div className="card-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAction(() => api.advanced.transfer({ mobileNumber, amount: parseFloat(formData.transferAmount), description: `${sidebarMenu} to ${formData.payeeInfo}` }), "Payment Processed Successfully!", ['transferAmount', 'payeeInfo']); }} className="corp-form">
                <div className="form-group full" style={{background:'rgba(255,255,255,0.02)', padding:'1rem 1.5rem', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)'}}>
                   <span style={{color:'var(--text-secondary)', fontSize:'0.85rem'}}>Available Funds:</span>
                   <span style={{color:'white', fontWeight:'600', marginLeft:'1rem'}}>{formatINR(customerData?.accountsDto?.balance)}</span>
                </div>
                <div className="form-group"><label className="form-label">{isBill ? "Biller / Registration ID" : "Beneficiary / Account Number"}</label><input required className="corp-input" value={formData.payeeInfo || ''} onChange={e => handleInput('payeeInfo', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Transfer Amount (₹)</label><input required type="number" className="corp-input" value={formData.transferAmount || ''} onChange={e => handleInput('transferAmount', e.target.value)} /></div>
                <div className="action-bar full"><button type="submit" className="corp-btn corp-btn-primary" disabled={loading}>Authorize Payment</button></div>
              </form>
            </div>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'Manage Payees') {
      return (
        <>
          <h2 className="page-title">Beneficiary Directory</h2>
          <div className="corporate-card">
            <div className="card-header">Register New Beneficiary</div>
            <div className="card-body">
              <form onSubmit={(e) => { e.preventDefault(); handleAction(() => api.advanced.payee({ mobileNumber, payeeName: formData.payeeName, payeeAccount: formData.payeeAccount, ifscCode: formData.ifscCode }), "Beneficiary Registered Successfully!", ['payeeName', 'payeeAccount', 'ifscCode']); }} className="corp-form">
                <div className="form-group full"><label className="form-label">Beneficiary Name</label><input required className="corp-input" value={formData.payeeName || ''} onChange={e => handleInput('payeeName', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Account Number</label><input required className="corp-input" value={formData.payeeAccount || ''} onChange={e => handleInput('payeeAccount', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Bank IFSC Code</label><input required className="corp-input" value={formData.ifscCode || ''} onChange={e => handleInput('ifscCode', e.target.value)} /></div>
                <div className="action-bar full"><button type="submit" className="corp-btn corp-btn-primary" disabled={loading}>Register Beneficiary</button></div>
              </form>
            </div>
          </div>
          {customerData?.payees?.length > 0 && (
            <div className="corporate-card">
              <div className="card-header">Directory List</div>
              <table className="corp-table">
                <thead><tr><th>Name</th><th>Account No.</th><th>IFSC Code</th></tr></thead>
                <tbody>
                  {customerData.payees.map(p => (
                    <tr key={p.id}>
                      <td style={{fontWeight:'500'}}>{p.payeeName}</td>
                      <td style={{fontFamily:'var(--font-display)'}}>{p.payeeAccount}</td>
                      <td style={{color:'var(--text-secondary)'}}>{p.ifscCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      );
    }

    if (sidebarMenu === 'Credit Card Summary') {
      return (
        <>
          <h2 className="page-title">Credit Card Dashboard</h2>
          {customerData?.cardsDto ? (
            <div className="corporate-card">
              <div className="card-header">Active Credit Lines</div>
              <div className="card-body" style={{borderBottom: '1px solid var(--border-color)', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'2rem', background:'rgba(0,0,0,0.1)'}}>
                 <div><div style={{color:'var(--text-secondary)', fontSize:'0.85rem'}}>Total Limit</div><div className="amount">{formatINR(customerData.cardsDto.totalLimit)}</div></div>
                 <div><div style={{color:'var(--text-secondary)', fontSize:'0.85rem'}}>Available Credit</div><div className="amount credit">{formatINR(customerData.cardsDto.availableAmount)}</div></div>
                 <div><div style={{color:'var(--text-secondary)', fontSize:'0.85rem'}}>Outstanding Dues</div><div className="amount debit">{formatINR(customerData.cardsDto.amountUsed)}</div></div>
              </div>
              <table className="corp-table">
                <thead><tr><th>Card Identifier</th><th>Network</th><th>Status</th></tr></thead>
                <tbody>
                  <tr>
                    <td style={{fontFamily:'var(--font-display)', fontSize:'1.1rem', letterSpacing:'2px'}}>**** **** **** {customerData.cardsDto.cardNumber.slice(-4)}</td>
                    <td><span className="pill-badge pill-primary">VISA Infinite</span></td>
                    <td><span className="pill-badge pill-success">Active</span></td>
                  </tr>
                </tbody>
              </table>
              <div className="action-bar">
                <button className="corp-btn corp-btn-primary" onClick={() => setSidebarMenu('Pay Credit Card Bill')}>Settle Dues</button>
              </div>
            </div>
          ) : (
             <div className="corporate-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{display:'inline-flex', padding:'1.5rem', background:'rgba(59,130,246,0.1)', borderRadius:'50%', marginBottom:'1.5rem'}}>
                <CreditCard size={48} color="var(--accent-primary)" />
              </div>
              <h3 style={{fontSize:'1.5rem', marginBottom:'0.5rem', color:'white'}}>No Active Credit Cards</h3>
              <p style={{color:'var(--text-secondary)', marginBottom:'2rem'}}>Experience premium rewards and zero lifestyle borders.</p>
              <button className="corp-btn corp-btn-primary" onClick={() => setSidebarMenu('Apply for Credit Card')}>Apply Now</button>
            </div>
          )}
        </>
      );
    }

    if (sidebarMenu === 'Apply for Credit Card') {
      return (
        <>
          <h2 className="page-title">Credit Card Application</h2>
          <div className="corporate-card">
            <div className="card-header">Pre-approved Premium Card</div>
            <div className="card-body" style={{textAlign:'center', padding:'3rem 2rem'}}>
              <h3 style={{fontSize:'1.5rem', marginBottom:'1rem', color:'white'}}>Bharat Infinite Metal Card</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth:'500px', margin:'0 auto 2rem' }}>Enjoy lifetime free access, unlimited lounge visits, and 5% flat cashback on all lifestyle spends. Issued instantly to your mobile number.</p>
              <button onClick={() => handleAction(() => api.cards.create(mobileNumber), "Metal Card Issued!")} className="corp-btn corp-btn-primary" disabled={loading}>Accept Offer & Issue Card</button>
            </div>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'Block/Hotlist Card') {
      return (
        <>
          <h2 className="page-title">Security Center</h2>
          <div className="corporate-card">
            <div className="card-header" style={{ color: 'var(--danger-color)' }}><Shield size={18} style={{display:'inline', marginRight:'8px', verticalAlign:'text-bottom'}}/> Emergency Hotlist</div>
            <div className="card-body">
              <p style={{ color:'var(--text-secondary)', marginBottom: '2rem' }}>If you suspect fraudulent activity or have lost your physical card, immediately block it. This action is irreversible.</p>
              {customerData?.cardsDto ? (
                <button onClick={() => handleAction(() => api.cards.delete(mobileNumber), "Card Blocked Permanently")} className="corp-btn corp-btn-danger" disabled={loading}>Hotlist Card **** {customerData.cardsDto.cardNumber.slice(-4)}</button>
              ) : <p>No active cards to secure.</p>}
            </div>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'Pay Credit Card Bill') {
      return (
        <>
          <h2 className="page-title">Bill Settlement</h2>
          <div className="corporate-card">
            <div className="card-header">Clear Outstanding Dues</div>
            <div className="card-body">
              {customerData?.cardsDto ? (
                <form onSubmit={(e) => { e.preventDefault(); handleAction(() => api.advanced.paycard({ mobileNumber, amount: parseFloat(formData.cardPaymentAmount) }), "Dues Settled Successfully!", ['cardPaymentAmount']); }} className="corp-form">
                  <div className="form-group full" style={{background:'rgba(255,255,255,0.02)', padding:'1.5rem', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                       <div style={{color:'var(--text-secondary)', fontSize:'0.85rem', marginBottom:'0.25rem'}}>Total Outstanding Statement</div>
                       <div className="highlight-balance" style={{fontSize:'2rem'}}>{formatINR(customerData.cardsDto.amountUsed)}</div>
                    </div>
                    {customerData.cardsDto.amountUsed === 0 && <span className="pill-badge pill-success">Fully Paid</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Amount (₹)</label>
                    <input required type="number" max={customerData.cardsDto.amountUsed} className="corp-input" value={formData.cardPaymentAmount || ''} onChange={e => handleInput('cardPaymentAmount', e.target.value)} disabled={customerData.cardsDto.amountUsed <= 0}/>
                  </div>
                  <div className="action-bar full"><button type="submit" className="corp-btn corp-btn-primary" disabled={loading || customerData.cardsDto.amountUsed <= 0}>Authorize Payment</button></div>
                </form>
              ) : <p style={{color:'var(--text-secondary)'}}>No active cards associated with this profile.</p>}
            </div>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'Debit Card Services') {
      return (
        <>
          <h2 className="page-title">ATM Security</h2>
          <div className="corporate-card">
            <div className="card-header">Generate Green PIN</div>
            <div className="card-body">
              <p style={{ color:'var(--text-secondary)', marginBottom: '2rem' }}>Instantly generate or change your physical Debit Card ATM PIN securely using 256-bit encryption.</p>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (formData.pin1 !== formData.pin2) return showMsg("PINs do not match", true);
                if (!formData.pin1 || formData.pin1.length !== 4) return showMsg("PIN must be 4 digits", true);
                handleAction(() => api.advanced.setpin({ mobileNumber, pin: formData.pin1 }), "Green PIN Generated Successfully! You can now transact at ATMs.", ['pin1', 'pin2']); 
              }} className="corp-form">
                <div className="form-group"><label className="form-label">Enter New 4-Digit PIN</label><input required type="password" maxLength="4" className="corp-input" style={{fontFamily:'monospace', letterSpacing:'5px'}} value={formData.pin1 || ''} onChange={e => handleInput('pin1', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Confirm PIN</label><input required type="password" maxLength="4" className="corp-input" style={{fontFamily:'monospace', letterSpacing:'5px'}} value={formData.pin2 || ''} onChange={e => handleInput('pin2', e.target.value)} /></div>
                <div className="action-bar full" style={{marginTop:'1rem', padding:'1.5rem 0 0 0', background:'transparent'}}>
                   <button type="submit" className="corp-btn corp-btn-primary" disabled={loading}>Set New PIN</button>
                </div>
              </form>
            </div>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'Active Loans') {
      return (
        <>
          <h2 className="page-title">Loan Dashboard</h2>
          {customerData?.loansDto ? (
            <div className="corporate-card">
              <div className="card-header">Your Active Credit Facilities</div>
              <div className="card-body" style={{borderBottom: '1px solid var(--border-color)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem', background:'rgba(0,0,0,0.1)'}}>
                 <div><div style={{color:'var(--text-secondary)', fontSize:'0.85rem'}}>Total Sanctioned Principal</div><div className="amount">{formatINR(customerData.loansDto.totalLoan)}</div></div>
                 <div><div style={{color:'var(--text-secondary)', fontSize:'0.85rem'}}>Outstanding Principal</div><div className="amount debit">{formatINR(customerData.loansDto.outstandingAmount)}</div></div>
              </div>
              <table className="corp-table">
                <thead><tr><th>Loan Account No.</th><th>Facility Type</th><th>Status</th></tr></thead>
                <tbody>
                  <tr>
                    <td style={{fontFamily:'var(--font-display)', fontSize:'1.1rem'}}>{customerData.loansDto.loanNumber}</td>
                    <td>{customerData.loansDto.loanType}</td>
                    <td><span className="pill-badge pill-success">Standard / Regular</span></td>
                  </tr>
                </tbody>
              </table>
              <div className="action-bar">
                <button className="corp-btn corp-btn-primary" onClick={() => setSidebarMenu('Foreclose Loan')}>Initiate Foreclosure</button>
              </div>
            </div>
          ) : (
            <div className="corporate-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{display:'inline-flex', padding:'1.5rem', background:'rgba(59,130,246,0.1)', borderRadius:'50%', marginBottom:'1.5rem'}}>
                <Landmark size={48} color="var(--accent-primary)" />
              </div>
              <h3 style={{fontSize:'1.5rem', marginBottom:'0.5rem', color:'white'}}>No Active Loans</h3>
              <p style={{color:'var(--text-secondary)', marginBottom:'2rem'}}>Achieve your dreams faster with our instant pre-approved loans.</p>
              <button className="corp-btn corp-btn-primary" onClick={() => setSidebarMenu('Apply for New Loan')}>View Loan Offers</button>
            </div>
          )}
        </>
      );
    }

    if (sidebarMenu === 'Apply for New Loan') {
      return (
        <>
          <h2 className="page-title">Credit Facility Application</h2>
          <div className="corporate-card">
            <div className="card-header">Instant Personal Loan</div>
            <div className="card-body" style={{textAlign:'center', padding:'3rem 2rem'}}>
              <h3 style={{fontSize:'1.5rem', marginBottom:'1rem', color:'white'}}>Pre-Approved: ₹5,00,000</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth:'500px', margin:'0 auto 2rem' }}>Based on your relationship value, you are eligible for an instant, paperless personal loan disbursed in 3 seconds to your savings account.</p>
              <button onClick={() => handleAction(() => api.loans.create(mobileNumber), "Loan Approved & Disbursed!")} className="corp-btn corp-btn-primary" disabled={loading}>Accept Terms & Disburse</button>
            </div>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'Foreclose Loan') {
      return (
        <>
          <h2 className="page-title">Loan Foreclosure</h2>
          <div className="corporate-card">
            <div className="card-header">Pre-closure Settlement</div>
            <div className="card-body">
              {customerData?.loansDto ? (
                <>
                  <div style={{background:'rgba(255,255,255,0.02)', padding:'1.5rem', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', marginBottom:'2rem'}}>
                     <div style={{color:'var(--text-secondary)', fontSize:'0.85rem', marginBottom:'0.25rem'}}>Total Settlement Amount</div>
                     <div className="highlight-balance" style={{fontSize:'2.5rem'}}>{formatINR(customerData.loansDto.outstandingAmount)}</div>
                  </div>
                  <button onClick={() => handleAction(() => api.loans.delete(mobileNumber), "Loan Foreclosed Successfully")} className="corp-btn corp-btn-danger" disabled={loading}>Authorize Foreclosure</button>
                </>
              ) : <p style={{color:'var(--text-secondary)'}}>No active loans eligible for foreclosure.</p>}
            </div>
          </div>
        </>
      );
    }

    if (sidebarMenu === 'EMI Calculator') {
      const p = parseFloat(formData.emiPrincipal) || 100000;
      const r = parseFloat(formData.emiRate) || 10;
      const n = parseFloat(formData.emiTenure) || 12;
      const rMonthly = r / (12 * 100);
      const emi = (p * rMonthly * Math.pow(1 + rMonthly, n)) / (Math.pow(1 + rMonthly, n) - 1);
      
      return (
        <>
          <h2 className="page-title">Financial Tools</h2>
          <div className="corporate-card">
            <div className="card-header"><Calculator size={18} style={{display:'inline', marginRight:'8px', verticalAlign:'text-bottom'}}/> EMI Calculator</div>
            <div className="card-body corp-form">
              <div className="form-group"><label className="form-label">Principal Amount (₹)</label><input type="number" className="corp-input" value={formData.emiPrincipal || ''} placeholder="100000" onChange={e => handleInput('emiPrincipal', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Interest Rate (% p.a.)</label><input type="number" className="corp-input" value={formData.emiRate || ''} placeholder="10" onChange={e => handleInput('emiRate', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Tenure (Months)</label><input type="number" className="corp-input" value={formData.emiTenure || ''} placeholder="12" onChange={e => handleInput('emiTenure', e.target.value)} /></div>
              <div className="form-group" style={{ background: 'rgba(59,130,246,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'0.5rem' }}>Your Monthly EMI</p>
                <div className="highlight-balance" style={{ fontSize: '2.5rem' }}>{formatINR(emi || 0)}</div>
              </div>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  if (!isLoggedIn) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)'}}>
         <div className="corporate-card" style={{width: '100%', maxWidth: '450px', padding: '3rem 2.5rem', textAlign: 'center', animation: 'fadeIn 0.5s ease'}}>
            <div style={{display:'inline-flex', marginBottom: '2rem'}}>
               <div className="bank-logo-icon" style={{width: '64px', height: '64px', borderRadius: '20px'}}>
                 <Building2 size={32} />
               </div>
            </div>
            <h1 style={{fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '0.5rem'}}>Bharat Premier</h1>
            <p style={{color: 'var(--text-secondary)', marginBottom: '2.5rem'}}>Secure NetBanking Portal</p>

            <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
               {error && <div className="alert alert-error" style={{marginBottom: 0, padding: '0.75rem', fontSize: '0.85rem'}}><AlertCircle size={16}/> {error}</div>}
               {successMsg && <div className="alert alert-success" style={{marginBottom: 0, padding: '0.75rem', fontSize: '0.85rem'}}><CheckCircle size={16}/> {successMsg}</div>}
               
               <div className="form-group" style={{textAlign: 'left'}}>
                  <label className="form-label">Registered Mobile Number</label>
                  <div style={{position: 'relative'}}>
                     <input required className="corp-input" style={{width: '100%', paddingLeft: '2.5rem'}} value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="e.g. 4354437687"/>
                     <Smartphone size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}}/>
                  </div>
               </div>
               <div className="form-group" style={{textAlign: 'left'}}>
                  <label className="form-label">Secure PIN / Password</label>
                  <div style={{position: 'relative'}}>
                     <input type="password" required className="corp-input" style={{width: '100%', paddingLeft: '2.5rem'}} placeholder="••••••••" defaultValue="password"/>
                     <Lock size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}}/>
                  </div>
               </div>
               <button type="submit" className="corp-btn corp-btn-primary" style={{width: '100%', padding: '1rem', marginTop: '0.5rem'}} disabled={loading}>
                 {loading ? <RefreshCw size={20} className="animate-spin" /> : 'Secure Login'}
               </button>
            </form>
         </div>
      </div>
    )
  }

  return (
    <>
      <header className="bank-header">
        <div className="bank-logo">
          <div className="bank-logo-icon"><Building2 size={24} /></div>
          Bharat Premier Bank
        </div>
        <div className="header-right">
          <div className="user-profile-info">
            <div className="welcome-text">Welcome, {customerData?.name ? customerData.name : 'Guest'}</div>
            <div className="last-login">Last login: {new Date().toLocaleString()} | IP: 192.168.1.1</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}><LogOut size={16} /> Logout</button>
        </div>
      </header>

      <nav className="top-nav">
        {Object.keys(navMenus).map(nav => (
          <div key={nav} className={`top-nav-item ${topNav === nav ? 'active' : ''}`} onClick={() => handleNavClick(nav)}>{nav}</div>
        ))}
      </nav>

      <div className="app-body">
        <aside className="sidebar-menu">
          <div className="sidebar-header">{topNav} Menu</div>
          <ul className="sidebar-list">
            {navMenus[topNav].map(item => (
              <li key={item} className={sidebarMenu === item ? 'active' : ''} onClick={() => setSidebarMenu(item)}>
                {sidebarMenu === item ? <ChevronRight size={16} /> : <div style={{width:'16px'}}></div>}
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <main className="main-content">
          {error && <div className="alert alert-error"><AlertCircle size={20}/> {error}</div>}
          {successMsg && <div className="alert alert-success"><CheckCircle size={20}/> {successMsg}</div>}

          {renderContent()}
        </main>
      </div>
    </>
  );
}

export default App;
