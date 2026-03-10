import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, User, Zap, ChevronDown, Inbox } from 'lucide-react';
import heroBg from '../assets/hero-mountain.jpg';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" }
};

function LandingPage() {
  return (
    <div>
      {/* Hero Section with Mountain Background */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        
        {/* Background Image */}
        <img 
          src={heroBg}
          alt="Mountain landscape"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
        
        {/* Gradient Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(5, 10, 20, 0.3) 0%, rgba(5, 10, 20, 0.15) 40%, rgba(13, 27, 42, 0.8) 85%, #0D1B2A 100%)'
        }} />

        {/* Content */}
        <div className="app-container" style={{
          position: 'relative',
          zIndex: 10,
          paddingTop: '58px',
          textAlign: 'center',
          maxWidth: '800px'
        }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            style={{
              fontFamily: 'Fraunces',
              fontWeight: 800,
              fontSize: 'clamp(44px, 6vw, 76px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
              marginBottom: '20px'
            }}
          >
            Meeting intelligence,<br />built around you.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 300,
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: 1.7,
              maxWidth: '520px',
              margin: '0 auto 32px'
            }}
          >
            Missed a meeting? MeetingMind transcribes, analyzes, and delivers a briefing personalized to your exact role and projects.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '80px'
            }}
          >
            <Link 
              to="/dashboard"
              style={{
                background: 'white',
                color: '#0D1B2A',
                borderRadius: '12px',
                padding: '12px 28px',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                transition: 'all 200ms ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.9)'}
              onMouseLeave={(e) => e.target.style.background = 'white'}
            >
              Open Dashboard
            </Link>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                borderRadius: '12px',
                padding: '12px 28px',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 500,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 200ms ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
            >
              See How It Works
            </button>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              color: 'rgba(255, 255, 255, 0.4)'
            }}
          >
            <ChevronDown size={24} />
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section 
        id="how-it-works"
        style={{
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          padding: '96px 0'
        }}
      >
        <div className="app-container" style={{ maxWidth: '1100px' }}>
          <motion.div {...fadeUp}>
            <p style={{
              fontFamily: 'JetBrains Mono',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginBottom: '12px'
            }}>
              HOW IT WORKS
            </p>

            <h2 style={{
              fontFamily: 'Fraunces',
              fontWeight: 700,
              fontSize: '38px',
              color: 'var(--text)',
              marginBottom: '8px'
            }}>
              Simple. <span style={{ color: 'var(--accent)' }}>Intelligent.</span> Personal.
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {[
                {
                  number: '01',
                  icon: <Upload size={22} />,
                  title: 'Upload Recording',
                  description: 'Drop in any meeting recording — MP3, MP4, WAV or M4A.'
                },
                {
                  number: '02',
                  icon: <User size={22} />,
                  title: 'Set Your Role',
                  description: 'Tell us who you are and what projects you\'re focused on right now.'
                },
                {
                  number: '03',
                  icon: <Zap size={22} />,
                  title: 'Get Your Digest',
                  description: 'Receive a briefing built specifically around your role. Not a summary. Your summary.'
                }
              ].map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.12, duration: 0.6 }}
                  whileHover={{ y: -3 }}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '28px',
                    transition: 'all 200ms ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                    e.currentTarget.style.borderColor = 'var(--border-bright)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-surface)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <p style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginBottom: '20px'
                  }}>
                    {step.number}
                  </p>
                  <div style={{ color: 'var(--accent)', marginBottom: '12px' }}>
                    {step.icon}
                  </div>
                  <h3 style={{
                    fontFamily: 'Fraunces',
                    fontWeight: 600,
                    fontSize: '16px',
                    color: 'var(--text)',
                    marginBottom: '8px'
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: 400,
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65
                  }}>
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* The Difference Section */}
      <section style={{
        background: 'var(--bg-subtle)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '96px 0'
      }}>
        <div className="app-container" style={{ maxWidth: '1100px' }}>
          <motion.div {...fadeUp}>
            <p style={{
              fontFamily: 'JetBrains Mono',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginBottom: '12px'
            }}>
              THE DIFFERENCE
            </p>

            <h2 style={{
              fontFamily: 'Fraunces',
              fontWeight: 700,
              fontSize: '38px',
              color: 'var(--text)',
              marginBottom: '4px'
            }}>
              Same meeting.
            </h2>
            <h2 style={{
              fontFamily: 'Fraunces',
              fontWeight: 700,
              fontSize: '38px',
              color: 'var(--accent)',
              marginBottom: '16px'
            }}>
              Two realities.
            </h2>

            <p style={{
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '16px',
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              marginBottom: '56px'
            }}>
              A frontend engineer and a product manager sit in the same meeting. Here is what each of them gets from MeetingMind.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px'
            }}>
              {/* Alex Chen Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderTop: '3px solid var(--high)',
                  borderRadius: '16px',
                  padding: '28px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}>
                    AC
                  </div>
                  <div>
                    <p style={{
                      fontFamily: 'Fraunces',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--text)'
                    }}>
                      Alex Chen
                    </p>
                    <p style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 400,
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}>
                      Frontend Engineer
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--high-bg)',
                  color: 'var(--high)',
                  border: '1px solid var(--high-border)',
                  borderRadius: '9999px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 500,
                  marginBottom: '16px'
                }}>
                  ● HIGH PRIORITY
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '8px'
                  }}>
                    WHY THIS MATTERS
                  </p>
                  <p style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65
                  }}>
                    The API deadline change directly impacts your checkout-redesign sprint timeline.
                  </p>
                </div>

                <div style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.8
                }}>
                  <p>→ API deadline moved 2 weeks earlier</p>
                  <p>→ Checkout redesign blocked on token system</p>
                </div>
              </motion.div>

              {/* Priya Sharma Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderTop: '3px solid var(--medium)',
                  borderRadius: '16px',
                  padding: '28px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}>
                    PS
                  </div>
                  <div>
                    <p style={{
                      fontFamily: 'Fraunces',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--text)'
                    }}>
                      Priya Sharma
                    </p>
                    <p style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 400,
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}>
                      Product Manager
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--medium-bg)',
                  color: 'var(--medium)',
                  border: '1px solid var(--medium-border)',
                  borderRadius: '9999px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 500,
                  marginBottom: '16px'
                }}>
                  ● MEDIUM PRIORITY
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '8px'
                  }}>
                    WHY THIS MATTERS
                  </p>
                  <p style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65
                  }}>
                    Retention at 87% needs your attention for Q1 OKR tracking.
                  </p>
                </div>

                <div style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.8
                }}>
                  <p>→ User retention metrics for quarterly review</p>
                  <p>→ Dashboard updates for stakeholder presentation</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        padding: '28px 0'
      }}>
        <div className="app-container" style={{ maxWidth: '1100px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <p style={{
              fontFamily: 'Fraunces',
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--text)'
            }}>
              MeetingMind
            </p>
            <p style={{
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 400,
              fontSize: '12px',
              color: 'var(--text-muted)'
            }}>
              Powered by AWS Bedrock{' · '}Amazon Transcribe{' · '}Claude Sonnet 4
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
