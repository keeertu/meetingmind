import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from './api/client';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ProfileSetup from './components/ProfileSetup';
import UploadMeeting from './components/UploadMeeting';
import DigestView from './components/DigestView';

function App() {
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    api.getProfile()
      .then(data => setUserProfile(data))
      .catch(() => setUserProfile(null));
  }, []);

  return (
    <Router future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navigation userProfile={userProfile} />
        <AnimatedRoutes onProfileUpdate={() => {
          api.getProfile()
            .then(data => setUserProfile(data))
            .catch(() => setUserProfile(null));
        }} />
      </div>
    </Router>
  );
}

function Navigation({ userProfile }) {
  const location = useLocation();
  const savedProfile = JSON.parse(localStorage.getItem('meetingmind_profile') || 'null');

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(10, 21, 32, 0.75)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(45, 190, 168, 0.15)',
      height: '58px',
      transition: 'all 300ms ease'
    }}>
      <div className="app-container">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '58px'
        }}>
          <Link 
            to="/" 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontFamily: 'Fraunces',
              fontWeight: 700,
              fontSize: '18px',
              color: 'var(--accent)',
              textDecoration: 'none',
              transition: 'color 300ms ease'
            }}
          >
            <img 
              src="/logo.svg" 
              alt="MeetingMind Logo" 
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'contain'
              }}
            />
            MeetingMind
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <NavLink to="/dashboard" label="Dashboard" />
              <NavLink to="/profile" label="Profile" />
              <NavLink to="/upload" label="Upload" />
            </div>
            
            {savedProfile ? (
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '12px',
                fontFamily: 'Plus Jakarta Sans',
                color: 'var(--text-secondary)',
                transition: 'all 300ms ease'
              }}>
                {`${savedProfile.name} · ${savedProfile.role}`}
              </div>
            ) : (
              <Link 
                to="/profile"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontFamily: 'Plus Jakarta Sans',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'all 300ms ease'
                }}
              >
                Set up profile →
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      style={{
        fontFamily: 'Plus Jakarta Sans',
        fontWeight: 400,
        fontSize: '14px',
        color: isActive ? 'var(--text)' : 'var(--text-secondary)',
        textDecoration: 'none',
        transition: 'color 200ms ease'
      }}
      onMouseEnter={(e) => e.target.style.color = 'var(--text)'}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.target.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {label}
    </Link>
  );
}

function AnimatedRoutes({ onProfileUpdate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    const savedProfile = localStorage.getItem('meetingmind_profile');
    if (!savedProfile && location.pathname !== '/profile') {
      navigate('/profile');
    }
  }, [navigate, location.pathname]);

  return (
    <main style={{ paddingTop: isLanding ? '0' : '58px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProfileSetup onProfileUpdate={onProfileUpdate} />} />
            <Route path="/upload" element={<UploadMeeting />} />
            <Route path="/meeting/:id" element={<DigestView />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

export default App;
