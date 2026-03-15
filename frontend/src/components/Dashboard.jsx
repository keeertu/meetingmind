import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, Inbox } from 'lucide-react';
import api from '../api/client';
import PriorityBadge from './PriorityBadge';

function Dashboard() {
  const [meetings, setMeetings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileData, meetingsData] = await Promise.all([
          api.getProfile().catch(() => null),
          api.getMeetings()
        ]);
        setProfile(profileData);
        setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError(err.message);
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [location]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: '16px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{
          fontFamily: 'Plus Jakarta Sans',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          Loading your meetings...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'Plus Jakarta Sans',
          fontSize: '14px',
          color: 'var(--danger)',
          marginBottom: '16px'
        }}>
          Failed to load dashboard: {error}
        </p>
        <button
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-container" style={{ paddingTop: '120px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 style={{
              fontFamily: 'Fraunces',
              fontWeight: 700,
              fontSize: '28px',
              color: 'var(--text)',
              marginBottom: '12px'
            }}>
              Welcome to MeetingMind
            </h2>
            <p style={{
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '16px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '32px'
            }}>
              The world's first meeting assistant that thinks like you. Personalized digests based on your specific role.
            </p>
            <Link to="/profile" className="btn-primary">
              Get Started
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ paddingTop: '80px', paddingBottom: '48px' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>

        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontFamily: 'Fraunces',
              fontWeight: 700,
              fontSize: '28px',
              color: 'var(--text)',
              marginBottom: '6px'
            }}>
              Your Meetings
            </h1>
            <p style={{
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '14px',
              color: 'var(--text-secondary)'
            }}>
              Personalized for{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{profile.name}</span>
              {profile.role && ` · ${profile.role}`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => navigate('/meeting/demo')} className="btn-secondary">
              Try Demo
            </button>
            <Link
              to="/upload"
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
            >
              <Plus size={16} />
              New Meeting
            </Link>
          </div>
        </header>

        {/* Empty state */}
        {meetings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: 'var(--bg-surface)',
              border: '2px dashed var(--border)',
              borderRadius: '16px',
              padding: '80px 24px',
              textAlign: 'center',
              marginTop: '16px'
            }}
          >
            <Inbox size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
            <p style={{
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '15px',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              No meetings analyzed yet.
            </p>
            <Link
              to="/upload"
              style={{
                fontFamily: 'Plus Jakarta Sans',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--accent)',
                textDecoration: 'none'
              }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}
            >
              Upload your first recording →
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Meeting list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
              {meetings.map((meeting, idx) => (
                <MeetingCard key={meeting.meetingId} meeting={meeting} idx={idx} />
              ))}
            </div>

            {/* Action items */}
            <ActionItemsSection meetings={meetings} />
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Meeting card ────────────────────────────────────────────────────────── */
function MeetingCard({ meeting, idx }) {
  const relevance = meeting.digest?.relevance;
  const barColor =
    relevance === 'HIGH'   ? 'var(--high)'   :
    relevance === 'MEDIUM' ? 'var(--medium)' :
    'var(--low)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.06, duration: 0.3 }}
    >
      <Link
        to={`/meeting/${meeting.meetingId}`}
        style={{
          position: 'relative',
          display: 'block',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '18px 20px 18px 24px',
          textDecoration: 'none',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--bg-elevated)';
          e.currentTarget.style.borderColor = 'rgba(45, 190, 168, 0.4)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(45, 190, 168, 0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--bg-surface)';
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Relevance bar */}
        {meeting.digest && (
          <div style={{
            position: 'absolute',
            left: 0, top: '12px', bottom: '12px',
            width: '3px',
            borderRadius: '2px',
            background: barColor,
            boxShadow: `0 0 8px ${barColor}`,
          }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '12px', marginBottom: '6px', flexWrap: 'wrap'
            }}>
              <h3 style={{
                fontFamily: 'Fraunces',
                fontWeight: 600,
                fontSize: '15px',
                color: 'var(--text)'
              }}>
                {meeting.title}
              </h3>
              {meeting.digest && <PriorityBadge relevance={meeting.digest.relevance} />}
            </div>

            <div style={{
              fontFamily: 'JetBrains Mono',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginBottom: '8px'
            }}>
              {new Date(meeting.uploadedAt).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
              {meeting.duration && ` · ${meeting.duration}`}
            </div>

            {meeting.digest?.why_this_matters && (
              <p style={{
                fontFamily: 'Plus Jakarta Sans',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {meeting.digest.why_this_matters}
              </p>
            )}
          </div>

          <ChevronRight
            size={15}
            style={{
              color: 'var(--text-muted)',
              flexShrink: 0,
              marginLeft: '16px',
              marginTop: '4px',
            }}
          />
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Action items section ────────────────────────────────────────────────── */
function ActionItemsSection({ meetings }) {
  const allActionItems = meetings.flatMap(meeting =>
    (meeting.digest?.action_items || []).map(item => ({
      text: typeof item === 'string' ? item : (item.task || item.text || String(item)),
      meetingTitle: meeting.title
    }))
  );

  if (allActionItems.length === 0) return null;

  return (
    <div style={{
      marginTop: '48px',
      paddingTop: '32px',
      borderTop: '1px solid var(--border)'
    }}>
      <h2 style={{
        fontFamily: 'Fraunces',
        fontWeight: 600,
        fontSize: '20px',
        color: 'var(--text)',
        marginBottom: '20px'
      }}>
        📋 Outstanding Action Items
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {allActionItems.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'start',
              gap: '16px',
              transition: 'all 150ms ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.borderColor = 'rgba(45, 190, 168, 0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-surface)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div style={{
              width: '18px', height: '18px',
              borderRadius: '4px',
              border: '2px solid var(--border)',
              flexShrink: 0,
              marginTop: '2px'
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'Plus Jakarta Sans',
                fontSize: '14px',
                color: 'var(--text)',
                lineHeight: 1.5,
                marginBottom: '4px'
              }}>
                {item.text}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}>
                From: {item.meetingTitle}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;