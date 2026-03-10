import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, Inbox, AlertCircle } from 'lucide-react';
import api, { getCurrentUserId } from '../api/client';
import PriorityBadge from './PriorityBadge';

function Dashboard() {
  const [meetings, setMeetings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current userId for debugging
        const userId = getCurrentUserId();
        setCurrentUserId(userId);
        console.log('Dashboard loading with userId:', userId);
        
        const [profileData, meetingsData] = await Promise.all([
          api.getProfile().catch(() => null),
          api.getMeetings()
        ]);
        setProfile(profileData);
        setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
        
        // Log for debugging
        console.log('Dashboard loaded:', { 
          userId, 
          profileExists: !!profileData, 
          meetingsCount: Array.isArray(meetingsData) ? meetingsData.length : 0 
        });
        
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

  const handleTryDemo = () => {
    navigate('/meeting/demo');
  };

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
              Personalized for <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{profile.name}</span> · {profile.role}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleTryDemo} className="btn-secondary">
              Try Demo
            </button>
            <Link to="/upload" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <Plus size={16} />
              New Meeting
            </Link>
          </div>
        </header>

        {meetings.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)',
            border: '2px dashed var(--border)',
            borderRadius: '16px',
            padding: '80px 24px',
            textAlign: 'center',
            marginTop: '16px'
          }}>
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
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              Upload your first recording →
            </Link>
            
            {/* Debug info for troubleshooting */}
            {currentUserId && (
              <div style={{
                marginTop: '24px',
                padding: '12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <AlertCircle size={12} />
                  Debug Info
                </div>
                <div>User ID: {currentUserId}</div>
                <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--text-muted)' }}>
                  If you had meetings before but don't see them, your browser storage may have been cleared.
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
              {meetings.map((meeting, idx) => (
                <motion.div
                  key={meeting.meetingId}
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
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elevated)';
                      e.currentTarget.style.borderColor = 'rgba(45, 190, 168, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(45, 190, 168, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Left colored bar */}
                    {meeting.digest && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '12px',
                        bottom: '12px',
                        width: '3px',
                        borderRadius: '2px',
                        background: meeting.digest.relevance === 'HIGH' ? 'var(--high)' : meeting.digest.relevance === 'MEDIUM' ? 'var(--medium)' : 'var(--low)',
                        boxShadow: meeting.digest.relevance === 'HIGH' ? '0 0 8px var(--high)' : meeting.digest.relevance === 'MEDIUM' ? '0 0 8px var(--medium)' : '0 0 8px var(--low)'
                      }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
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
                          {new Date(meeting.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {meeting.duration && ` · ${meeting.duration}`}
                        </div>
                        {meeting.digest && (
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
                          transition: 'all 150ms ease'
                        }} 
                      />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Action Items Section */}
            {(() => {
              const allActionItems = meetings.flatMap(meeting => 
                (meeting.digest?.action_items || []).map(item => ({
                  text: typeof item === 'string' ? item : item.task || item.text || item,
                  meetingTitle: meeting.title
                }))
              );

              return allActionItems.length > 0 && (
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
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-elevated)';
                          e.currentTarget.style.borderColor = 'rgba(45, 190, 168, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-surface)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: '2px solid var(--border)',
                          background: 'transparent',
                          flexShrink: 0,
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: 'var(--text-muted)'
                        }}>
                          ☐
                        </div>
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
            })()}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
