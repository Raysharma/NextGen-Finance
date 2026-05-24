import { useEffect, useMemo, useState } from 'react'
import { API_URL, downloadFile, request } from './api'

const authDefaults = { email: '', password: '' }
const registerDefaults = {
  full_name: '',
  email: '',
  phone_number: '',
  address: '',
  city: '',
  pincode: '',
  date_of_birth: '',
  password: '',
}
const accountDefaults = { account_type: 'savings', initial_deposit: '0' }
const depositDefaults = { account_number: '', amount: '', description: 'Cash deposit' }
const withdrawDefaults = { account_number: '', amount: '', description: 'Cash withdrawal' }
const transferDefaults = { source_account_number: '', destination_account_number: '', amount: '', description: 'Account transfer' }

function App() {
  const [token, setToken] = useState(localStorage.getItem('rn_bank_token') || '')
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [adminAccounts, setAdminAccounts] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking')
  const [authMode, setAuthMode] = useState('login')
  const [activeSection, setActiveSection] = useState('overview')
  const [loginForm, setLoginForm] = useState(authDefaults)
  const [registerForm, setRegisterForm] = useState(registerDefaults)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountForm, setAccountForm] = useState(accountDefaults)
  const [depositForm, setDepositForm] = useState(depositDefaults)
  const [withdrawForm, setWithdrawForm] = useState(withdrawDefaults)
  const [transferForm, setTransferForm] = useState(transferDefaults)
  const [profileForm, setProfileForm] = useState({ full_name: '', phone_number: '', address: '', city: '', pincode: '' })
  const [otpCode, setOtpCode] = useState('')
  const [otpHint, setOtpHint] = useState('')
  const [statementAccount, setStatementAccount] = useState('all')

  const isAdmin = user?.role === 'admin'
  const profileVerified = Boolean(user?.profile_update_verified)

  useEffect(() => {
    if (token) {
      localStorage.setItem('rn_bank_token', token)
      boot()
    } else {
      localStorage.removeItem('rn_bank_token')
      resetData()
    }
  }, [token])

  useEffect(() => {
    let mounted = true
    async function checkHealth() {
      try {
        const response = await fetch(`${API_URL}/health`)
        if (mounted) setApiStatus(response.ok ? 'online' : 'offline')
      } catch {
        if (mounted) setApiStatus('offline')
      }
    }
    checkHealth()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        city: user.city || '',
        pincode: user.pincode || '',
      })
    }
  }, [user])

  useEffect(() => {
    if (accounts.length && statementAccount === 'all') {
      setStatementAccount(accounts[0].account_number)
    }
    if (!accounts.length) {
      setStatementAccount('all')
    }
  }, [accounts, statementAccount])

  const stats = useMemo(() => {
    const balance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0)
    return {
      accounts: accounts.length,
      transactions: transactions.length,
      balance,
    }
  }, [accounts, transactions])

  const recentTransactions = transactions.slice(0, 5)

  function resetData() {
    setUser(null)
    setAccounts([])
    setTransactions([])
    setAdminUsers([])
    setAdminAccounts([])
    setOtpCode('')
    setOtpHint('')
    setActiveSection('overview')
  }

  async function boot() {
    setBusy(true)
    setMessage('')
    try {
      const me = await request('/auth/me', { token })
      setUser(me)
      await refreshDashboard(token)
      setMessage('Session restored successfully.')
    } catch (error) {
      setMessage(error.message)
      setToken('')
    } finally {
      setBusy(false)
    }
  }

  async function refreshDashboard(authToken = token) {
    const [myAccounts, myTransactions, activeUser] = await Promise.all([
      request('/accounts/me', { token: authToken }),
      request('/transactions/me', { token: authToken }),
      request('/auth/me', { token: authToken }),
    ])

    setAccounts(myAccounts)
    setTransactions(myTransactions)
    setUser(activeUser)

    if (activeUser.role === 'admin') {
      const [users, adminManagedAccounts] = await Promise.all([
        request('/admin/users', { token: authToken }),
        request('/admin/accounts', { token: authToken }),
      ])
      setAdminUsers(users)
      setAdminAccounts(adminManagedAccounts)
    } else {
      setAdminUsers([])
      setAdminAccounts([])
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        form: { username: loginForm.email, password: loginForm.password },
      })
      setToken(data.access_token)
      setMessage('Login successful.')
      setLoginForm(authDefaults)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRegister(event) {
    event.preventDefault()
    setBusy(true)
    try {
      if (registerForm.password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }
      await request('/auth/register', {
        method: 'POST',
        body: registerForm,
      })
      setMessage('Account created. Please sign in.')
      setAuthMode('login')
      setRegisterForm(registerDefaults)
      setConfirmPassword('')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateAccount(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await request('/accounts', {
        method: 'POST',
        token,
        body: accountForm,
      })
      setAccountForm(accountDefaults)
      await refreshDashboard()
      setMessage('New account opened successfully.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeposit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await request('/transactions/deposit', {
        method: 'POST',
        token,
        body: depositForm,
      })
      setDepositForm(depositDefaults)
      await refreshDashboard()
      setMessage('Deposit completed.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleWithdraw(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await request('/transactions/withdraw', {
        method: 'POST',
        token,
        body: withdrawForm,
      })
      setWithdrawForm(withdrawDefaults)
      await refreshDashboard()
      setMessage('Withdrawal completed.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleTransfer(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await request('/transactions/transfer', {
        method: 'POST',
        token,
        body: transferForm,
      })
      setTransferForm(transferDefaults)
      await refreshDashboard()
      setMessage('Transfer completed.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSendOtp() {
    setBusy(true)
    try {
      const response = await request('/auth/profile/send-otp', { method: 'POST', token })
      setOtpHint(response.debug_otp ? `Demo OTP: ${response.debug_otp}` : response.message)
      setMessage(response.message)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleVerifyOtp() {
    setBusy(true)
    try {
      await request('/auth/profile/verify-otp', {
        method: 'POST',
        token,
        body: { otp_code: otpCode },
      })
      setOtpCode('')
      setOtpHint('Profile verified. You can update your details now.')
      await refreshDashboard()
      setMessage('OTP verified successfully.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleProfileUpdate(event) {
    event.preventDefault()
    setBusy(true)
    try {
      if (!profileVerified) {
        throw new Error('Verify your profile with OTP before updating')
      }
      const updated = await request('/auth/me', {
        method: 'PATCH',
        token,
        body: profileForm,
      })
      setUser(updated)
      setMessage('Profile updated successfully.')
      setOtpHint('Profile updated. Request a new OTP before the next sensitive update.')
      await refreshDashboard()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDownloadStatement() {
    setBusy(true)
    try {
      const query = statementAccount === 'all' ? '' : `?account_number=${encodeURIComponent(statementAccount)}`
      const { blob, filename } = await downloadFile(`/statements/me.pdf${query}`, { token })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setMessage('Statement downloaded.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleAdminStatus(accountNumber, status) {
    setBusy(true)
    try {
      await request(`/admin/accounts/${accountNumber}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      })
      await refreshDashboard()
      setMessage(`Account ${accountNumber} updated.`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  function handleLogout() {
    setToken('')
    setUser(null)
    setMessage('Logged out.')
  }

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'banking', label: 'Banking' },
    { id: 'profile', label: 'Settings' },
    { id: 'statements', label: 'Statements' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : []),
  ]

  const sectionMeta = {
    overview: { title: 'Portfolio Overview', description: 'Balance, accounts, and recent activity in one glance.' },
    banking: { title: 'Banking Operations', description: 'Open accounts and run deposits, withdrawals, and transfers.' },
    profile: { title: 'Settings & OTP Verification', description: 'Verify first, then update sensitive profile details.' },
    statements: { title: 'Statements & Downloads', description: 'Download a professional PDF statement for interviews or demos.' },
    admin: { title: 'Administration', description: 'Manage users and control account status like a bank operator.' },
  }

  const publicNav = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'security', label: 'Security' },
    { id: 'support', label: 'Support' },
    { id: 'online-banking', label: 'Online Banking' },
  ]

  return (
    <div className="page-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="noise-grid" />

      {!user ? (
        <div className="public-shell">
          <header className="public-nav surface">
            <div className="brand-mark">
              <div className="brand-badge">NG</div>
              <div>
                <strong>NextGen Finance</strong>
                <span>Personal, family, and business banking</span>
              </div>
            </div>
            <nav className="top-nav">
              {publicNav.map((item) => (
                <a key={item.id} href={`#${item.id}`}>
                  {item.label}
                </a>
              ))}
            </nav>
            <a className="nav-cta" href="#online-banking">
              Online Banking
            </a>
          </header>

          <section id="home" className="hero-panel surface">
            <div className="hero-copy">
              <p className="eyebrow">Trusted everyday banking</p>
              <h1>Banking that feels clear, secure, and personal.</h1>
              <p className="hero-text">
                Manage accounts, send money, download statements, and keep your profile up to date with one clean
                online banking experience.
              </p>
              <div className="hero-pills">
                <span className="pill success">24/7 digital banking</span>
                <span className="pill">Money transfers</span>
                <span className="pill">Account statements</span>
                <span className="pill">Customer support</span>
              </div>
            </div>
            <div className="hero-side">
              <div className={`status-chip ${apiStatus}`}>
                <span className={`status-dot ${apiStatus}`}></span>
                <span>{apiStatus === 'online' ? 'Bank services available' : 'Service status unavailable'}</span>
              </div>
              <div className="hero-card-mini">
                <span>Member services</span>
                <strong>Accounts, cards, transfers, and statements in one place</strong>
                <p>Designed to look and behave like a real modern finance site.</p>
              </div>
            </div>
          </section>

          <section id="about" className="info-grid">
            <div className="surface info-card">
              <p className="eyebrow">About us</p>
              <h2>Built around convenience and trust</h2>
              <p>
                NextGen Finance is a digital banking experience focused on simple onboarding, easy account management, and
                a clean customer journey from registration to statement download.
              </p>
            </div>
            <div className="surface info-card">
              <p className="eyebrow">Why customers choose us</p>
              <ul className="feature-list compact">
                <li>Transparent account activity</li>
                <li>Fast support and profile updates</li>
                <li>Secure access to every banking task</li>
              </ul>
            </div>
            <div className="surface info-card">
              <p className="eyebrow">Branch hours</p>
              <h2>Open Monday to Saturday</h2>
              <p>Customer care and online assistance are available throughout the day.</p>
            </div>
          </section>

          <section id="services" className="cards-grid">
            <div className="surface service-card">
              <h3>Savings Accounts</h3>
              <p>Grow your funds securely with an easy-to-manage savings account.</p>
            </div>
            <div className="surface service-card">
              <h3>Current Accounts</h3>
              <p>Built for daily business payments, transfers, and regular banking.</p>
            </div>
            <div className="surface service-card">
              <h3>Digital Transfers</h3>
              <p>Send money instantly to your own or another account.</p>
            </div>
            <div className="surface service-card">
              <h3>Statements</h3>
              <p>Download professional PDF statements whenever you need them.</p>
            </div>
          </section>

          <section id="security" className="cards-grid two-col-layout">
            <div className="surface service-card large">
              <p className="eyebrow">Security</p>
              <h2>Protection for every customer journey</h2>
              <p>
                The bank uses secure login, verified profile updates, and role-based controls so sensitive actions
                stay protected.
              </p>
            </div>
            <div className="surface service-card large">
              <p className="eyebrow">Need help?</p>
              <h2>Talk to support</h2>
              <p>Use the online banking portal or contact branch support for account assistance.</p>
            </div>
          </section>

          <section id="support" className="cards-grid two-col-layout">
            <div className="surface service-card large">
              <p className="eyebrow">Contact us</p>
              <h2>Customer care</h2>
              <p>Email: support@nextgenfinance.local</p>
              <p>Phone: +91 90000 00000</p>
            </div>
            <div className="surface service-card large">
              <p className="eyebrow">Find us</p>
              <h2>Branches and service desks</h2>
              <p>Available in major cities with extended customer hours.</p>
            </div>
          </section>

          <section id="online-banking" className="auth-grid">
            <div className="surface feature-panel">
              <p className="eyebrow">Online banking</p>
              <h2>Open an account or sign in to manage your money</h2>
              <ul className="feature-list">
                <li>Fill in full personal details during registration</li>
                <li>Use OTP verification before updating your profile</li>
                <li>Download statements as PDF after login</li>
                <li>Manage accounts and transfers from one secure portal</li>
              </ul>
            </div>

            <div className="surface auth-panel">
              <div className="auth-tabs">
                <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
                <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button>
              </div>

              {authMode === 'login' ? (
                <form className="form-grid" onSubmit={handleLogin}>
                  <div className="field-group full">
                    <label>Customer ID / Email</label>
                    <input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="you@example.com" required />
                  </div>
                  <div className="field-group full">
                    <label>Password</label>
                    <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Enter password" required />
                  </div>
                  <button className="primary-button full" disabled={busy}>Sign In</button>
                </form>
              ) : (
                <form className="form-grid registration-form" onSubmit={handleRegister}>
                  <div className="form-section full">
                    <h3>Personal Details</h3>
                    <div className="two-col">
                      <div className="field-group">
                        <label>Full Name</label>
                        <input value={registerForm.full_name} onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })} placeholder="Your full name" required />
                      </div>
                      <div className="field-group">
                        <label>Date of Birth</label>
                        <input type="date" value={registerForm.date_of_birth} onChange={(e) => setRegisterForm({ ...registerForm, date_of_birth: e.target.value })} required />
                      </div>
                    </div>
                  </div>

                  <div className="form-section full">
                    <h3>Contact Details</h3>
                    <div className="two-col">
                      <div className="field-group">
                        <label>Email</label>
                        <input type="email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} placeholder="you@example.com" required />
                      </div>
                      <div className="field-group">
                        <label>Phone Number</label>
                        <input value={registerForm.phone_number} onChange={(e) => setRegisterForm({ ...registerForm, phone_number: e.target.value })} placeholder="10-digit mobile" required />
                      </div>
                    </div>
                    <div className="two-col">
                      <div className="field-group wide">
                        <label>Address</label>
                        <input value={registerForm.address} onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })} placeholder="House no., street, area" required />
                      </div>
                      <div className="field-group">
                        <label>City</label>
                        <input value={registerForm.city} onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })} placeholder="City" required />
                      </div>
                    </div>
                    <div className="two-col">
                      <div className="field-group">
                        <label>Pincode</label>
                        <input value={registerForm.pincode} onChange={(e) => setRegisterForm({ ...registerForm, pincode: e.target.value })} placeholder="Postal code" required />
                      </div>
                      <div className="field-group">
                        <label>Password</label>
                        <input type="password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="At least 8 characters" required />
                      </div>
                    </div>
                  </div>

                  <div className="auth-note full">
                    Provide accurate information so your banking profile is complete from the start.
                  </div>
                  <button className="primary-button full" disabled={busy}>Create Account</button>
                </form>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="dashboard-shell">
          <header className="bank-header surface">
            <div>
              <p className="eyebrow">Digital banking dashboard</p>
              <h1>Welcome back, {user.full_name.split(' ')[0]}</h1>
              <p className="hero-text">Use the tabs below to move between portfolio, banking tasks, verification, statements, and administration.</p>
            </div>
            <div className="header-meta">
              <span className="pill success">{profileVerified ? 'Profile verified' : 'Verification needed'}</span>
              <span className="pill">{user.role.toUpperCase()}</span>
              <span className="pill">{apiStatus === 'online' ? 'Backend online' : 'Backend offline'}</span>
            </div>
          </header>

          <div className="bank-nav surface">
            {sections.map((section) => (
              <button key={section.id} className={activeSection === section.id ? 'active' : ''} onClick={() => setActiveSection(section.id)}>
                {section.label}
              </button>
            ))}
            <button className="logout-link" onClick={handleLogout}>Logout</button>
          </div>

          <div className="status-banner surface">
            <span>{message || sectionMeta[activeSection].description}</span>
          </div>

          {activeSection === 'overview' ? (
            <section className="section-grid">
              <div className="surface stat-card">
                <span>Accounts</span>
                <strong>{stats.accounts}</strong>
              </div>
              <div className="surface stat-card">
                <span>Total Balance</span>
                <strong>{stats.balance.toFixed(2)}</strong>
              </div>
              <div className="surface stat-card">
                <span>Transactions</span>
                <strong>{stats.transactions}</strong>
              </div>
              <div className="surface stat-card wide-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Recent activity</p>
                    <h2>Latest ledger entries</h2>
                  </div>
                </div>
                <div className="ledger-list">
                  {recentTransactions.map((item) => (
                    <div className="ledger-row" key={item.reference}>
                      <div>
                        <strong>{item.transaction_type.replace('_', ' ')}</strong>
                        <span>{item.description || 'No description'}</span>
                      </div>
                      <em>{Number(item.amount).toFixed(2)}</em>
                    </div>
                  ))}
                  {!recentTransactions.length ? <p className="muted">No transactions yet.</p> : null}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'banking' ? (
            <section className="task-grid">
              <div className="surface task-card">
                <p className="eyebrow">Account opening</p>
                <h2>Open a new account</h2>
                <form className="form-grid compact" onSubmit={handleCreateAccount}>
                  <div className="field-group full">
                    <label>Account Type</label>
                    <select value={accountForm.account_type} onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}>
                      <option value="savings">Savings</option>
                      <option value="current">Current</option>
                    </select>
                  </div>
                  <div className="field-group full">
                    <label>Initial Deposit</label>
                    <input type="number" min="0" step="0.01" value={accountForm.initial_deposit} onChange={(e) => setAccountForm({ ...accountForm, initial_deposit: e.target.value })} />
                  </div>
                  <button className="primary-button full" disabled={busy}>Open Account</button>
                </form>
              </div>

              <div className="surface task-card">
                <p className="eyebrow">Cash in</p>
                <h2>Deposit money</h2>
                <form className="form-grid compact" onSubmit={handleDeposit}>
                  <div className="field-group full">
                    <label>Account Number</label>
                    <input value={depositForm.account_number} onChange={(e) => setDepositForm({ ...depositForm, account_number: e.target.value })} required />
                  </div>
                  <div className="field-group full">
                    <label>Amount</label>
                    <input type="number" min="0.01" step="0.01" value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} required />
                  </div>
                  <div className="field-group full">
                    <label>Description</label>
                    <input value={depositForm.description} onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })} />
                  </div>
                  <button className="primary-button full" disabled={busy}>Deposit</button>
                </form>
              </div>

              <div className="surface task-card">
                <p className="eyebrow">Cash out</p>
                <h2>Withdraw money</h2>
                <form className="form-grid compact" onSubmit={handleWithdraw}>
                  <div className="field-group full">
                    <label>Account Number</label>
                    <input value={withdrawForm.account_number} onChange={(e) => setWithdrawForm({ ...withdrawForm, account_number: e.target.value })} required />
                  </div>
                  <div className="field-group full">
                    <label>Amount</label>
                    <input type="number" min="0.01" step="0.01" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} required />
                  </div>
                  <div className="field-group full">
                    <label>Description</label>
                    <input value={withdrawForm.description} onChange={(e) => setWithdrawForm({ ...withdrawForm, description: e.target.value })} />
                  </div>
                  <button className="primary-button full" disabled={busy}>Withdraw</button>
                </form>
              </div>

              <div className="surface task-card wide-panel">
                <p className="eyebrow">Transfers</p>
                <h2>Move money between accounts</h2>
                <form className="form-grid compact two-col-form" onSubmit={handleTransfer}>
                  <div className="field-group">
                    <label>Source Account</label>
                    <input value={transferForm.source_account_number} onChange={(e) => setTransferForm({ ...transferForm, source_account_number: e.target.value })} required />
                  </div>
                  <div className="field-group">
                    <label>Destination Account</label>
                    <input value={transferForm.destination_account_number} onChange={(e) => setTransferForm({ ...transferForm, destination_account_number: e.target.value })} required />
                  </div>
                  <div className="field-group">
                    <label>Amount</label>
                    <input type="number" min="0.01" step="0.01" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} required />
                  </div>
                  <div className="field-group">
                    <label>Description</label>
                    <input value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })} />
                  </div>
                  <button className="primary-button full" disabled={busy}>Send Transfer</button>
                </form>
              </div>

              <div className="surface task-card wide-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Accounts</p>
                    <h2>Your accounts</h2>
                  </div>
                  <button className="ghost-button" onClick={() => refreshDashboard()}>Refresh</button>
                </div>
                <div className="ledger-list">
                  {accounts.map((account) => (
                    <div className="ledger-row account-row" key={account.account_number}>
                      <div>
                        <strong>{account.account_number}</strong>
                        <span>{account.account_type} · {account.status}</span>
                      </div>
                      <em>{Number(account.balance).toFixed(2)}</em>
                    </div>
                  ))}
                  {!accounts.length ? <p className="muted">No accounts yet.</p> : null}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'profile' ? (
            <section className="task-grid two-wide">
              <div className="surface task-card">
                <p className="eyebrow">OTP verification</p>
                <h2>Verify before updating profile</h2>
                <p className="body-copy">This flow mirrors sensitive bank profile edits: request an OTP, verify it, then unlock the update form.</p>
                <div className="verification-box">
                  <button className="primary-button" onClick={handleSendOtp} disabled={busy}>Send OTP</button>
                  <div className="field-group full">
                    <label>Enter OTP</label>
                    <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="6-digit OTP" />
                  </div>
                  <button className="ghost-button" onClick={handleVerifyOtp} disabled={busy}>Verify OTP</button>
                </div>
                {otpHint ? <div className="hint-box">{otpHint}</div> : null}
                <div className="chip-row">
                  <span className={`pill ${profileVerified ? 'success' : 'warning'}`}>{profileVerified ? 'Verified' : 'Not verified'}</span>
                  <span className="pill">Sensitive updates locked until verified</span>
                </div>
              </div>

              <div className="surface task-card">
                <p className="eyebrow">Profile update</p>
                <h2>Update your profile</h2>
                <form className="form-grid compact" onSubmit={handleProfileUpdate}>
                  <div className="field-group full">
                    <label>Full Name</label>
                    <input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} disabled={!profileVerified} />
                  </div>
                  <div className="two-col-form full">
                    <div className="field-group">
                      <label>Phone Number</label>
                      <input value={profileForm.phone_number} onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })} disabled={!profileVerified} />
                    </div>
                    <div className="field-group">
                      <label>City</label>
                      <input value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} disabled={!profileVerified} />
                    </div>
                  </div>
                  <div className="field-group full">
                    <label>Address</label>
                    <input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} disabled={!profileVerified} />
                  </div>
                  <div className="field-group full">
                    <label>Pincode</label>
                    <input value={profileForm.pincode} onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })} disabled={!profileVerified} />
                  </div>
                  <button className="primary-button full" disabled={busy || !profileVerified}>Save Changes</button>
                </form>
              </div>
            </section>
          ) : null}

          {activeSection === 'statements' ? (
            <section className="task-grid two-wide">
              <div className="surface task-card">
                <p className="eyebrow">Statement download</p>
                <h2>Download a PDF statement</h2>
                <p className="body-copy">Generate a clean statement with transaction rows, ideal for demos and portfolio presentation.</p>
                <div className="field-group full">
                  <label>Account</label>
                  <select value={statementAccount} onChange={(e) => setStatementAccount(e.target.value)}>
                    <option value="all">All accounts</option>
                    {accounts.map((account) => (
                      <option key={account.account_number} value={account.account_number}>{account.account_number}</option>
                    ))}
                  </select>
                </div>
                <button className="primary-button" onClick={handleDownloadStatement} disabled={busy}>Download PDF</button>
              </div>

              <div className="surface task-card">
                <p className="eyebrow">Recent ledger</p>
                <h2>Transaction history</h2>
                <div className="ledger-list scrollable-list">
                  {transactions.map((item) => (
                    <div className="ledger-row" key={item.reference}>
                      <div>
                        <strong>{item.transaction_type.replace('_', ' ')}</strong>
                        <span>{item.description || 'No description'}</span>
                      </div>
                      <em>{Number(item.amount).toFixed(2)}</em>
                    </div>
                  ))}
                  {!transactions.length ? <p className="muted">No transactions yet.</p> : null}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'admin' && isAdmin ? (
            <section className="task-grid two-wide">
              <div className="surface task-card">
                <p className="eyebrow">Admin users</p>
                <h2>Registered users</h2>
                <div className="ledger-list scrollable-list">
                  {adminUsers.map((item) => (
                    <div className="ledger-row" key={item.id}>
                      <div>
                        <strong>{item.full_name}</strong>
                        <span>{item.email}</span>
                      </div>
                      <em>{item.role}</em>
                    </div>
                  ))}
                </div>
              </div>
              <div className="surface task-card">
                <p className="eyebrow">Account controls</p>
                <h2>Freeze or close accounts</h2>
                <div className="ledger-list scrollable-list">
                  {adminAccounts.map((account) => (
                    <div className="ledger-row admin-row" key={account.account_number}>
                      <div>
                        <strong>{account.account_number}</strong>
                        <span>{account.account_type} · {account.status}</span>
                      </div>
                      <div className="action-stack">
                        <button className="ghost-button" onClick={() => handleAdminStatus(account.account_number, 'active')}>Activate</button>
                        <button className="ghost-button" onClick={() => handleAdminStatus(account.account_number, 'frozen')}>Freeze</button>
                        <button className="ghost-button danger" onClick={() => handleAdminStatus(account.account_number, 'closed')}>Close</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default App
