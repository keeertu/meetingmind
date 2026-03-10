import { motion } from 'framer-motion';
import { Upload, Database, Brain, Sparkles, Check } from 'lucide-react';

function UploadProgress({ status, title }) {
  const steps = [
    { id: 'uploading', label: 'Uploading', icon: Upload },
    { id: 'transcribing', label: 'Transcribing', icon: Database },
    { id: 'analyzing', label: 'Analyzing', icon: Brain },
    { id: 'ready', label: 'Ready', icon: Sparkles }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.id === status);
  };

  const currentIndex = getCurrentStepIndex();

  const statusMessages = {
    uploading: "Moving data to secure storage...",
    transcribing: "Converting audio to text layers...",
    analyzing: "Claude is applying your persona lens...",
    ready: "Intelligence packet compiled."
  };

  return (
    <div className="app-container" style={{ paddingTop: '120px', paddingBottom: '120px' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: 'JetBrains Mono',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              Processing Pipeline
            </p>
            <h1 style={{
              fontFamily: 'Fraunces',
              fontWeight: 600,
              fontSize: '20px',
              color: 'var(--text)'
            }}>
              {title}
            </h1>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
            marginBottom: '48px',
            position: 'relative'
          }}>
            {steps.map((step, idx) => {
              const isCompleted = idx < currentIndex || status === 'ready';
              const isActive = idx === currentIndex && status !== 'ready';
              const Icon = step.icon;
              const isLast = idx === steps.length - 1;

              return (
                <div key={step.id} style={{ position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    position: 'relative',
                    zIndex: 2,
                    paddingBottom: isLast ? '0' : '32px'
                  }}>
                    <motion.div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: isCompleted || isActive ? 'var(--accent)' : 'var(--border)',
                        background: isCompleted ? 'var(--accent)' : 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: 'relative'
                      }}
                      animate={{
                        scale: isActive ? [1, 1.08, 1] : 1,
                        boxShadow: isActive 
                          ? ['0 0 0 0 rgba(49, 46, 129, 0.4)', '0 0 0 8px rgba(49, 46, 129, 0)', '0 0 0 0 rgba(49, 46, 129, 0)']
                          : '0 0 0 0 rgba(49, 46, 129, 0)'
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: isActive ? Infinity : 0
                      }}
                    >
                      {isCompleted ? (
                        <Check size={16} style={{ color: 'white' }} />
                      ) : (
                        <Icon size={16} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                      )}
                    </motion.div>

                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontFamily: 'Fraunces',
                        fontWeight: 600,
                        fontSize: '15px',
                        color: isActive || isCompleted ? 'var(--text)' : 'var(--text-muted)'
                      }}>
                        {step.label}
                      </span>
                    </div>
                  </div>

                  {!isLast && (
                    <div style={{
                      position: 'absolute',
                      left: '15px',
                      top: '32px',
                      bottom: '0',
                      width: '2px',
                      background: isCompleted ? 'var(--accent)' : 'var(--border)',
                      zIndex: 1
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              textAlign: 'center'
            }}
          >
            {statusMessages[status]}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default UploadProgress;
