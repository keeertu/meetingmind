import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth';
import api from './api/client';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ProfileSetup from './components/ProfileSetup';
import UploadMeeting from './components/UploadMeeting';
import DigestView from './components/DigestView';

/* ─── Global styles ───────────────────────────────────────────────────────── */
const GLOBAL_STYLES = `
  :root {
    --bg:             #080e14;
    --bg-elevated:    #0d1720;
    --bg-card:        #111d28;
    --border:         rgba(45, 190, 168, 0.12);
    --border-hover:   rgba(45, 190, 168, 0.28);
    --accent:         #2dbea8;
    --accent-dim:     rgba(45, 190, 168, 0.15);
    --accent-glow:    rgba(45, 190, 168, 0.35);
    --text:           #e8f0f7;
    --text-secondary: #7a9bb5;
    --text-muted:     #3d5a72;
    --danger:         #e05a6b;
    --nav-h:          58px;
    --font-display:   'Fraunces', Georgia, serif;
    --font-body:      'Plus Jakarta Sans', sans-serif;
    --ease-smooth:    cubic-bezier(0.4, 0, 0.2, 1);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  .app-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

  .nav-link {
    font-family: var(--font-body);
    font-weight: 400;
    font-size: 14px;
    color: var(--text-secondary);
    text-decoration: none;
    position: relative;
    padding-bottom: 2px;
    transition: color 200ms var(--ease-smooth);
  }
  .nav-link::after {
    content: '';
    position: absolute;
    bottom: -2px; left: 0;
    width: 0; height: 1px;
    background: var(--accent);
    transition: width 200ms var(--ease-smooth);
  }
  .nav-link:hover { color: var(--text); }
  .nav-link:hover::after { width: 100%; }
  .nav-link.active { color: var(--text); }
  .nav-link.active::after { width: 100%; }

  .nav-pill {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: 4px 14px;
    font-size: 12px;
    font-family: var(--font-body);
    color: var(--text-secondary);
    transition: border-color 200ms var(--ease-smooth);
  }
  .nav-pill:hover { border-color: var(--border-hover); }

  .signout-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: 4px 14px;
    font-size: 12px;
    font-family: var(--font-body);
    color: var(--text-muted);
    cursor: pointer;
    transition: color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth);
  }
  .signout-btn:hover { color: var(--danger); border-color: var(--danger); }

  body::before {
    content: '';
    position: fixed; inset: 0;
    pointer-events: none; z-index: 0;
    opacity: 0.018;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size: 128px;
  }
`;

function injectStyles() {
  if (document.getElementById('mm-global-styles')) return;
  const el = document.createElement('style');
  el.id = 'mm-global-styles';
  el.textContent = GLOBAL_STYLES;
  document.head.appendChild(el);
}

/* ─── App root ────────────────────────────────────────────────────────────── */
export default function App() {
  injectStyles();
  const [user,        setUser]        = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(u  => { setUser(u); setAuthChecked(true); })
      .catch(() => { setUser(false); setAuthChecked(true); });
  }, []);

  const refreshProfile = () =>
    api.getProfile()
      .then(data => setUserProfile(data))
      .catch(()  => setUserProfile(null));

  useEffect(() => { if (user) refreshProfile(); }, [user]);

  const handleSignOut = async () => {
    await amplifySignOut();
    setUser(false);
    setUserProfile(null);
  };

  if (!authChecked) return <LoadingScreen />;

  if (!user) {
    return <AuthPage onAuthenticated={() => getCurrentUser().then(u => setUser(u))} />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', zIndex: 1 }}>
        <Navigation user={user} onSignOut={handleSignOut} />
        <AnimatedRoutes onProfileUpdate={refreshProfile} />
      </div>
    </Router>
  );
}

/* ─── Loading screen ──────────────────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: '#080e14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#2dbea8" strokeWidth="1.5" opacity="0.4"/>
          <circle cx="10" cy="10" r="5" fill="#2dbea8" opacity="0.9"/>
          <circle cx="10" cy="10" r="2" fill="#080e14"/>
        </svg>
        <span style={{ fontFamily: 'Fraunces, Georgia, serif', color: '#2dbea8', fontSize: '18px', fontWeight: 700 }}>
          MeetingMind
        </span>
      </motion.div>
    </div>
  );
}

/* ─── Navigation ──────────────────────────────────────────────────────────── */
function Navigation({ user, onSignOut }) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const userEmail = user?.signInDetails?.loginId ?? user?.username ?? '';

  const savedProfile = (() => {
    try { return JSON.parse(localStorage.getItem('meetingmind_profile') || 'null'); }
    catch { return null; }
  })();

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 'var(--nav-h)',
      background: scrolled ? 'rgba(8,14,20,0.92)' : 'rgba(8,14,20,0.6)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${scrolled ? 'rgba(45,190,168,0.18)' : 'rgba(45,190,168,0.08)'}`,
      transition: 'background 300ms var(--ease-smooth), border-color 300ms var(--ease-smooth)',
    }}>
      <div className="app-container" style={{ height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Link to="/" style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '19px',
            color: 'var(--accent)', textDecoration: 'none', letterSpacing: '-0.02em',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#2dbea8" strokeWidth="1.5" opacity="0.4"/>
              <circle cx="10" cy="10" r="5" fill="#2dbea8" opacity="0.9"/>
              <circle cx="10" cy="10" r="2" fill="#080e14"/>
            </svg>
            MeetingMind
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'flex', gap: '28px' }}>
              {[
                { to: '/dashboard', label: 'Dashboard' },
                { to: '/profile',   label: 'Profile'   },
                { to: '/upload',    label: 'Upload'     },
              ].map(({ to, label }) => (
                <NavLink key={to} to={to} label={label} current={location.pathname} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {(userEmail || savedProfile) && (
                <span className="nav-pill" title={userEmail}>
                  {userEmail
                    ? (userEmail.length > 22 ? userEmail.slice(0, 20) + '…' : userEmail)
                    : `${savedProfile.name}${savedProfile.role ? ` · ${savedProfile.role}` : ''}`
                  }
                </span>
              )}
              <button className="signout-btn" onClick={onSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, label, current }) {
  const isActive = current === to;
  return <Link to={to} className={`nav-link${isActive ? ' active' : ''}`}>{label}</Link>;
}

/* ─── Animated routes ─────────────────────────────────────────────────────── */
function AnimatedRoutes({ onProfileUpdate }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    const hasProfile = Boolean(localStorage.getItem('meetingmind_profile'));
    const onboarding = location.pathname === '/profile' || location.pathname === '/';
    if (!hasProfile && !onboarding) navigate('/profile', { replace: true });
  }, [navigate, location.pathname]);

  return (
    <main style={{ paddingTop: isLanding ? 0 : 'var(--nav-h)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0  }}
          exit={{    opacity: 0, y: -6  }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <Routes location={location}>
            <Route path="/"            element={<LandingPage />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/profile"     element={<ProfileSetup onProfileUpdate={onProfileUpdate} />} />
            <Route path="/upload"      element={<UploadMeeting />} />
            <Route path="/meeting/:id" element={<DigestView />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}