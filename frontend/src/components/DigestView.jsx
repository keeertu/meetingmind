import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Info } from 'lucide-react';
import api from '../api/client';
import PriorityBadge from './PriorityBadge';
import TranscriptViewer from './TranscriptViewer';
import sampleDigest from '../demo/sampleDigest.json';

function DigestView() {
  const { id } = useParams();
  const location = useLocation();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('quick');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // Check for duplicate message from navigation state
  const duplicateMessage = location.state?.message;

  useEffect(() => {
    loadMeeting();
    
    // Show duplicate message if present
    if (duplicateMessage) {
      setShowMessage(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowMessage(false), 5000);
    }
  }, [id, duplicateMessage]);

  const loadMeeting = async () => {
    try {
      setLoading(true);
      if (id === 'demo') {
        // Load demo data directly
        setMeeting(sampleDigest);
      } else {
        // Load from API
        const data = await api.getMeeting(id);
        setMeeting(data);
      }
    } catch (err) {
      console.error('Error loading meeting:', err);
      setError(err.message || 'Failed to load meeting digest');
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const question = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setChatLoading(true);
    
    try {
      const result = await api.chatWithMeeting(id, question);
      setChatMessages(prev => [...prev, { role: 'assistant', content: result.answer }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, failed to get answer.' }]);
    }
    
    setChatLoading(false);
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
          Synthesizing intelligence...
        </p>
      </div>
    );
  }

  if (!meeting || !meeting.digest) {
    return (
      <div className="app-container" style={{ paddingTop: '80px' }}>
        <div className="card" style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '80px 40px',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontFamily: 'Fraunces',
            fontWeight: 700,
            fontSize: '20px',
            color: 'var(--text)',
            marginBottom: '12px'
          }}>
            Report Unavailable
          </h2>
          <p style={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '32px'
          }}>
            The AI is still processing this meeting or it was not found.
          </p>
          <Link to="/dashboard" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <ChevronLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { digest } = meeting;

  return (
    <div className="app-container" style={{ paddingTop: '80px', paddingBottom: '64px' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <Link
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'Plus Jakarta Sans',
            fontSize: '13px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            marginBottom: '16px',
            transition: 'color 150ms ease'
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--text-secondary)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontFamily: 'Fraunces',
            fontWeight: 700,
            fontSize: '26px',
            color: 'var(--text)',
            marginBottom: '6px'
          }}>
            {meeting.title}
          </h1>
          <div style={{
            fontFamily: 'JetBrains Mono',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            {meeting.uploadedAt && new Date(meeting.uploadedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            {meeting.duration && ` · ${meeting.duration}`}
          </div>
        </div>

        {/* Duplicate Message */}
        <AnimatePresence>
          {showMessage && duplicateMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(45, 190, 168, 0.1)',
                border: '1px solid rgba(45, 190, 168, 0.3)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <Info size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{
                fontFamily: 'Plus Jakarta Sans',
                fontSize: '14px',
                color: 'var(--text)',
                fontWeight: 500
              }}>
                {duplicateMessage}
              </span>
              <button
                onClick={() => setShowMessage(false)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
                onMouseEnter={(e) => e.target.style.color = 'var(--text)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Time Saved Banner */}
        {meeting.timeSavedPercent && meeting.digestReadingSeconds && meeting.meetingDurationSeconds && (
          <div style={{
            background: 'rgba(45, 190, 168, 0.1)',
            border: '1px solid rgba(45, 190, 168, 0.3)',
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '24px',
            display: 'flex',
            gap: '32px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <span style={{
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '14px',
              color: 'var(--text)',
              fontWeight: 500
            }}>
              ⚡ {meeting.timeSavedPercent}% time saved
            </span>
            <span style={{
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '14px',
              color: 'var(--text-secondary)'
            }}>
              📖 {meeting.digestReadingSeconds}s to read
            </span>
            <span style={{
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '14px',
              color: 'var(--text-secondary)'
            }}>
              🎙️ {Math.round(meeting.meetingDurationSeconds/60)} min meeting
            </span>
          </div>
        )}

        {/* Hero Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${digest.relevance === 'HIGH' ? 'var(--high)' : digest.relevance === 'MEDIUM' ? 'var(--medium)' : 'var(--low)'}`,
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            gap: '32px',
            alignItems: 'start',
            flexWrap: 'wrap'
          }}>
            <div style={{ width: '160px', flexShrink: 0 }}>
              <PriorityBadge relevance={digest.relevance} large />
              {digest.relevance_score && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    fontFamily: 'Fraunces',
                    fontWeight: 800,
                    fontSize: '36px',
                    color: 'var(--accent)',
                    lineHeight: 1
                  }}>
                    {digest.relevance_score}
                    <span style={{
                      fontFamily: 'Fraunces',
                      fontWeight: 400,
                      fontSize: '20px',
                      color: 'var(--text-muted)'
                    }}>
                      /10
                    </span>
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    marginTop: '4px'
                  }}>
                    relevance score
                  </div>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '12px'
              }}>
                WHY THIS MATTERS TO YOU
              </div>
              <p style={{
                fontFamily: 'Fraunces',
                fontWeight: 500,
                fontSize: '19px',
                color: 'var(--text)',
                lineHeight: 1.5,
                maxWidth: '520px'
              }}>
                {digest.why_this_matters}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid var(--border)',
            marginBottom: '24px'
          }}>
            {[
              { id: 'quick', label: 'Quick Scan' },
              { id: 'standard', label: 'Standard Briefing' },
              { id: 'transcript', label: 'Transcript' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '12px 0',
                  marginRight: '32px',
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeTab === tab.id ? 'var(--text)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'color 150ms ease'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) e.target.style.color = 'var(--text)';
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) e.target.style.color = 'var(--text-secondary)';
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    style={{
                      position: 'absolute',
                      bottom: '-1px',
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'var(--accent)',
                      borderRadius: '2px'
                    }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div style={{ minHeight: '400px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'quick' && (
                  <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {digest.quick_scan?.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        style={{
                          display: 'flex',
                          alignItems: 'start',
                          gap: '16px',
                          padding: '16px 0',
                          borderBottom: idx < digest.quick_scan.length - 1 ? '1px solid var(--border)' : 'none'
                        }}
                      >
                        <span style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: '13px',
                          color: 'var(--accent)',
                          minWidth: '28px',
                          fontWeight: 500
                        }}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span style={{
                          fontFamily: 'Plus Jakarta Sans',
                          fontSize: '14px',
                          color: 'var(--text)',
                          lineHeight: 1.6
                        }}>
                          {item}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeTab === 'standard' && (
                  <div style={{ marginTop: '24px', maxWidth: '680px' }}>
                    {digest.standard_briefing?.split('\n\n').map((paragraph, idx) => (
                      <p
                        key={idx}
                        style={{
                          fontFamily: 'Plus Jakarta Sans',
                          fontSize: '15px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.8,
                          marginBottom: '20px'
                        }}
                      >
                        <span style={{ color: 'var(--text)' }}>
                          {paragraph.split('.')[0]}.
                        </span>
                        {paragraph.substring(paragraph.indexOf('.') + 1)}
                      </p>
                    ))}
                  </div>
                )}

                {activeTab === 'transcript' && (
                  <div style={{ marginTop: '24px' }}>
                    <TranscriptViewer
                      transcript={meeting.transcriptRaw}
                      words={meeting.transcriptWithTimestamps}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Decisions & Action Items */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          paddingTop: '32px',
          marginTop: '40px',
          borderTop: '1px solid var(--border)'
        }}>
          {/* Decisions */}
          <section>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontFamily: 'Fraunces',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--text)'
              }}>
                Key Decisions
              </h2>
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                padding: '2px 10px'
              }}>
                {digest.decisions?.length || 0}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {digest.decisions?.map((decision, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderLeft: '2px solid var(--accent-subtle)',
                    borderRadius: '12px',
                    padding: '20px',
                    transition: 'all 150ms ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderLeftColor = 'var(--accent)';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderLeftColor = 'var(--accent-subtle)';
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                    <p style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: 'var(--text)',
                      lineHeight: 1.5,
                      flex: 1
                    }}>
                      {decision.summary}
                    </p>
                    {decision.timestamp && (
                      <div style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        flexShrink: 0
                      }}>
                        {decision.timestamp}
                      </div>
                    )}
                  </div>
                  {decision.affects_user && (
                    <div style={{
                      display: 'inline-flex',
                      marginTop: '8px',
                      background: 'var(--accent-subtle)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(49, 46, 129, 0.3)',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontFamily: 'JetBrains Mono'
                    }}>
                      Affects you
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Action Items */}
          <section>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontFamily: 'Fraunces',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--text)'
              }}>
                Action Items
              </h2>
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                padding: '2px 10px'
              }}>
                {digest.action_items?.length || 0}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {digest.action_items?.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: `2px solid ${item.involves_user ? 'var(--accent)' : 'var(--border)'}`,
                      background: item.involves_user ? 'var(--accent-subtle)' : 'transparent',
                      flexShrink: 0,
                      marginTop: '2px'
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontFamily: 'Plus Jakarta Sans',
                        fontWeight: 500,
                        fontSize: '14px',
                        color: 'var(--text)',
                        lineHeight: 1.5,
                        marginBottom: '8px'
                      }}>
                        {item.task}
                      </p>
                      {item.assigned_to && (
                        <div style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: '11px',
                          color: 'var(--text-muted)'
                        }}>
                          Assigned to: {item.assigned_to}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Open Questions */}
        {digest.open_questions && digest.open_questions.length > 0 && (
          <div style={{
            paddingTop: '32px',
            marginTop: '32px',
            borderTop: '1px solid var(--border)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontFamily: 'Fraunces',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--text)'
              }}>
                ❓ Open Questions
              </h2>
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                padding: '2px 10px'
              }}>
                {digest.open_questions.length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {digest.open_questions.map((question, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'start',
                    gap: '16px'
                  }}
                >
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    ?
                  </span>
                  <span style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontSize: '14px',
                    color: 'var(--text)',
                    lineHeight: 1.5,
                    flex: 1
                  }}>
                    {question}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '24px',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(45,190,168,0.4)',
          transition: 'all 150ms ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 25px rgba(45,190,168,0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 20px rgba(45,190,168,0.4)';
        }}
      >
        💬
      </button>

      {/* Chat Panel */}
      {chatOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '32px',
          width: '360px',
          height: '480px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-bright)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)'
          }}>
            <h4 style={{
              margin: 0,
              color: 'var(--text)',
              fontFamily: 'Fraunces',
              fontWeight: 600,
              fontSize: '16px'
            }}>
              Ask about this meeting
            </h4>
          </div>
          
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
                  color: msg.role === 'user' ? 'white' : 'var(--text)',
                  fontSize: '14px',
                  lineHeight: 1.4,
                  fontFamily: 'Plus Jakarta Sans'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start'
              }}>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontFamily: 'Plus Jakarta Sans'
                }}>
                  Thinking...
                </div>
              </div>
            )}
          </div>
          
          <div style={{
            padding: '12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '8px',
            background: 'var(--bg-surface)'
          }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="Ask anything about this meeting..."
              style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'Plus Jakarta Sans'
              }}
            />
            <button
              onClick={handleChat}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                background: chatLoading || !chatInput.trim() ? 'var(--text-muted)' : 'var(--accent)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'white',
                cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 500
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DigestView;
