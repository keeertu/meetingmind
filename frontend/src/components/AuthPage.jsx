import { useState } from 'react';
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types / views ───────────────────────────────────────────────────────── */
// view: 'login' | 'register' | 'confirm' | 'forgot' | 'forgot_confirm'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,700;1,300&family=Plus+Jakarta+Sans:wght@300;400;500&display=swap');

  .auth-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #080e14;
    font-family: 'Plus Jakarta Sans', sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* Ambient glow blobs */
  .auth-root::before {
    content: '';
    position: absolute;
    width: 600px; height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(45,190,168,0.07) 0%, transparent 70%);
    top: -200px; left: -200px;
    pointer-events: none;
  }
  .auth-root::after {
    content: '';
    position: absolute;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(45,120,190,0.05) 0%, transparent 70%);
    bottom: -150px; right: -100px;
    pointer-events: none;
  }

  .auth-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
    margin: 24px;
    background: rgba(13, 23, 32, 0.9);
    border: 1px solid rgba(45, 190, 168, 0.14);
    border-radius: 20px;
    padding: 44px 40px 40px;
    backdrop-filter: blur(24px);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.03) inset,
      0 40px 80px rgba(0,0,0,0.5),
      0 0 60px rgba(45,190,168,0.04);
  }

  .auth-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
  }
  .auth-logo-text {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 700;
    font-size: 20px;
    color: #2dbea8;
    letter-spacing: -0.02em;
  }

  .auth-heading {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 300;
    font-size: 26px;
    color: #e8f0f7;
    line-height: 1.2;
    margin-bottom: 6px;
    letter-spacing: -0.02em;
  }
  .auth-subheading {
    font-size: 13px;
    color: #7a9bb5;
    margin-bottom: 32px;
    font-weight: 300;
  }

  .auth-field {
    margin-bottom: 16px;
  }
  .auth-label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7a9bb5;
    margin-bottom: 7px;
  }
  .auth-input {
    width: 100%;
    background: rgba(8, 14, 20, 0.8);
    border: 1px solid rgba(45, 190, 168, 0.14);
    border-radius: 10px;
    padding: 11px 14px;
    font-size: 14px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #e8f0f7;
    outline: none;
    transition: border-color 200ms ease, box-shadow 200ms ease;
  }
  .auth-input::placeholder { color: #3d5a72; }
  .auth-input:focus {
    border-color: rgba(45, 190, 168, 0.45);
    box-shadow: 0 0 0 3px rgba(45, 190, 168, 0.08);
  }

  .auth-btn {
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    background: #2dbea8;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #080e14;
    cursor: pointer;
    transition: opacity 200ms ease, transform 150ms ease, box-shadow 200ms ease;
    box-shadow: 0 4px 20px rgba(45, 190, 168, 0.25);
    letter-spacing: 0.01em;
  }
  .auth-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 6px 28px rgba(45, 190, 168, 0.35);
  }
  .auth-btn:active:not(:disabled) { transform: translateY(0); }
  .auth-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .auth-btn-ghost {
    background: transparent;
    border: 1px solid rgba(45, 190, 168, 0.2);
    color: #7a9bb5;
    box-shadow: none;
  }
  .auth-btn-ghost:hover:not(:disabled) {
    border-color: rgba(45, 190, 168, 0.4);
    color: #e8f0f7;
    box-shadow: none;
    opacity: 1;
  }

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 24px 0;
  }
  .auth-divider-line {
    flex: 1;
    height: 1px;
    background: rgba(45, 190, 168, 0.1);
  }
  .auth-divider-text {
    font-size: 11px;
    color: #3d5a72;
    white-space: nowrap;
  }

  .auth-switch {
    text-align: center;
    font-size: 13px;
    color: #7a9bb5;
    margin-top: 20px;
  }
  .auth-switch-btn {
    background: none;
    border: none;
    color: #2dbea8;
    cursor: pointer;
    font-size: 13px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .auth-switch-btn:hover { opacity: 0.8; }

  .auth-error {
    background: rgba(224, 90, 107, 0.1);
    border: 1px solid rgba(224, 90, 107, 0.25);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #f08090;
    margin-bottom: 16px;
    line-height: 1.5;
  }
  .auth-success {
    background: rgba(45, 190, 168, 0.1);
    border: 1px solid rgba(45, 190, 168, 0.25);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #2dbea8;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .auth-hint {
    font-size: 11px;
    color: #3d5a72;
    margin-top: 5px;
  }

  .auth-back-btn {
    background: none;
    border: none;
    color: #7a9bb5;
    cursor: pointer;
    font-size: 12px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    padding: 0;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: color 150ms ease;
  }
  .auth-back-btn:hover { color: #e8f0f7; }
`;

function injectAuthStyles() {
  if (document.getElementById('mm-auth-styles')) return;
  const el = document.createElement('style');
  el.id = 'mm-auth-styles';
  el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── Main AuthPage ───────────────────────────────────────────────────────── */
export default function AuthPage({ onAuthenticated }) {
  injectAuthStyles();
  const [view, setView]       = useState('login');
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);

  // Pass email between views so user doesn't retype it
  return (
    <div className="auth-root">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          className="auth-card"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{    opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <Logo />

          {view === 'login'          && <LoginView    setView={setView} setSharedEmail={setEmail} onAuthenticated={onAuthenticated} />}
          {view === 'register'       && <RegisterView setView={setView} setSharedEmail={setEmail} />}
          {view === 'confirm'        && <ConfirmView  setView={setView} sharedEmail={email} onAuthenticated={onAuthenticated} />}
          {view === 'forgot'         && <ForgotView   setView={setView} setSharedEmail={setEmail} />}
          {view === 'forgot_confirm' && <ForgotConfirmView setView={setView} sharedEmail={email} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Logo ────────────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div className="auth-logo">
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#2dbea8" strokeWidth="1.5" opacity="0.4"/>
        <circle cx="10" cy="10" r="5" fill="#2dbea8" opacity="0.9"/>
        <circle cx="10" cy="10" r="2" fill="#080e14"/>
      </svg>
      <span className="auth-logo-text">MeetingMind</span>
    </div>
  );
}

/* ─── Login ───────────────────────────────────────────────────────────────── */
function LoginView({ setView, setSharedEmail, onAuthenticated }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ username: email.trim().toLowerCase(), password });
      onAuthenticated();
    } catch (err) {
      if (err.name === 'UserNotConfirmedException') {
        setSharedEmail(email.trim().toLowerCase());
        setView('confirm');
      } else {
        setError(err.message || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h1 className="auth-heading">Welcome back</h1>
      <p className="auth-subheading">Sign in to your account</p>

      {error && <div className="auth-error">{error}</div>}

      <div className="auth-field">
        <label className="auth-label">Email</label>
        <input
          className="auth-input"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="auth-field">
        <label className="auth-label">Password</label>
        <input
          className="auth-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>

      <div style={{ textAlign: 'right', marginBottom: '20px', marginTop: '-8px' }}>
        <button type="button" className="auth-switch-btn" onClick={() => setView('forgot')}>
          Forgot password?
        </button>
      </div>

      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="auth-divider">
        <div className="auth-divider-line"/>
        <span className="auth-divider-text">no account yet?</span>
        <div className="auth-divider-line"/>
      </div>

      <button type="button" className="auth-btn auth-btn-ghost" onClick={() => setView('register')}>
        Create account
      </button>
    </form>
  );
}

/* ─── Register ────────────────────────────────────────────────────────────── */
function RegisterView({ setView, setSharedEmail }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await signUp({
        username: email.trim().toLowerCase(),
        password,
        options: { userAttributes: { email: email.trim().toLowerCase() } },
      });
      setSharedEmail(email.trim().toLowerCase());
      setView('confirm');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <button type="button" className="auth-back-btn" onClick={() => setView('login')}>
        ← Back to sign in
      </button>
      <h1 className="auth-heading">Create account</h1>
      <p className="auth-subheading">Get started with MeetingMind</p>

      {error && <div className="auth-error">{error}</div>}

      <div className="auth-field">
        <label className="auth-label">Email</label>
        <input
          className="auth-input"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="auth-field">
        <label className="auth-label">Password</label>
        <input
          className="auth-input"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <p className="auth-hint">Must include uppercase, lowercase, and a number.</p>
      </div>
      <div className="auth-field">
        <label className="auth-label">Confirm password</label>
        <input
          className="auth-input"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />
      </div>

      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

/* ─── Confirm (email code) ────────────────────────────────────────────────── */
function ConfirmView({ setView, sharedEmail, onAuthenticated }) {
  const [code,    setCode]    = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignUp({ username: sharedEmail, confirmationCode: code.trim() });
      setSuccess('Email confirmed! You can now sign in.');
      setTimeout(() => setView('login'), 1800);
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleConfirm}>
      <h1 className="auth-heading">Check your email</h1>
      <p className="auth-subheading">
        We sent a verification code to<br/>
        <strong style={{ color: '#2dbea8' }}>{sharedEmail || 'your email'}</strong>
      </p>

      {error   && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      <div className="auth-field">
        <label className="auth-label">Verification code</label>
        <input
          className="auth-input"
          type="text"
          inputMode="numeric"
          placeholder="123456"
          value={code}
          onChange={e => setCode(e.target.value)}
          required
          autoFocus
          style={{ letterSpacing: '0.15em', fontSize: '18px' }}
        />
      </div>

      <button className="auth-btn" type="submit" disabled={loading || Boolean(success)}>
        {loading ? 'Verifying…' : 'Verify email'}
      </button>

      <div className="auth-switch" style={{ marginTop: '16px' }}>
        <button type="button" className="auth-switch-btn" onClick={() => setView('login')}>
          Back to sign in
        </button>
      </div>
    </form>
  );
}

/* ─── Forgot password ─────────────────────────────────────────────────────── */
function ForgotView({ setView, setSharedEmail }) {
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword({ username: email.trim().toLowerCase() });
      setSharedEmail(email.trim().toLowerCase());
      setSuccess('Code sent! Check your inbox.');
      setTimeout(() => setView('forgot_confirm'), 1500);
    } catch (err) {
      setError(err.message || 'Could not send reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleForgot}>
      <button type="button" className="auth-back-btn" onClick={() => setView('login')}>
        ← Back to sign in
      </button>
      <h1 className="auth-heading">Reset password</h1>
      <p className="auth-subheading">We'll email you a reset code</p>

      {error   && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      <div className="auth-field">
        <label className="auth-label">Email</label>
        <input
          className="auth-input"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>

      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? 'Sending…' : 'Send reset code'}
      </button>
    </form>
  );
}

/* ─── Forgot confirm ──────────────────────────────────────────────────────── */
function ForgotConfirmView({ setView, sharedEmail }) {
  const [code,     setCode]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await confirmResetPassword({
        username: sharedEmail,
        confirmationCode: code.trim(),
        newPassword: password,
      });
      setSuccess('Password reset! Redirecting to sign in…');
      setTimeout(() => setView('login'), 1800);
    } catch (err) {
      setError(err.message || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleReset}>
      <button type="button" className="auth-back-btn" onClick={() => setView('forgot')}>
        ← Back
      </button>
      <h1 className="auth-heading">New password</h1>
      <p className="auth-subheading">Enter the code sent to <strong style={{ color: '#2dbea8' }}>{sharedEmail}</strong></p>

      {error   && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      <div className="auth-field">
        <label className="auth-label">Reset code</label>
        <input
          className="auth-input"
          type="text"
          inputMode="numeric"
          placeholder="123456"
          value={code}
          onChange={e => setCode(e.target.value)}
          required
          style={{ letterSpacing: '0.15em', fontSize: '18px' }}
        />
      </div>
      <div className="auth-field">
        <label className="auth-label">New password</label>
        <input
          className="auth-input"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="auth-field">
        <label className="auth-label">Confirm new password</label>
        <input
          className="auth-input"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />
      </div>

      <button className="auth-btn" type="submit" disabled={loading || Boolean(success)}>
        {loading ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  );
}