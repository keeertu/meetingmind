import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, X, AlertCircle } from 'lucide-react';
import api from '../api/client';
import UploadProgress from './UploadProgress';

const MAX_MB = 100;

function UploadMeeting() {
  const [file,       setFile]       = useState(null);
  const [title,      setTitle]      = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [step,       setStep]       = useState(0); // 0=idle 1=uploading 2=transcribing 3=analyzing 4=ready -1=error
  const [error,      setError]      = useState(null);
  const navigate = useNavigate();

  /* ── File handling ──────────────────────────────────────────────────────── */
  const validateAndSetFile = (f) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB} MB limit.`);
      return;
    }
    setFile(f);
    setError(null);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleFileSelect = (e) => validateAndSetFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  };

  const clearFile = () => {
    setFile(null);
    setTitle('');
    setError(null);
    setStep(0);
  };

  /* ── Upload + poll ──────────────────────────────────────────────────────── */
  const handleUpload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);
    setError(null);

    try {
      setStep(1);
      const uploadResult = file.size > 8 * 1024 * 1024
        ? await api.uploadMeetingPresigned(file, title)
        : await api.uploadMeeting(file, title);

      if (uploadResult.duplicate) {
        navigate(`/meeting/${uploadResult.meetingId}`, {
          state: { message: 'This meeting was already analyzed' }
        });
        return;
      }

      const id = uploadResult.meetingId;
      setStep(2);

      const MAX_ATTEMPTS = 120; // 10 min @ 5s intervals
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const { status } = await api.getMeetingStatus(id);

        if      (status === 'TRANSCRIBING')                         setStep(2);
        else if (status === 'ANALYZING')                            setStep(3);
        else if (status === 'COMPLETED' || status === 'COMPLETE') {
          setStep(4);
          setTimeout(() => navigate(`/meeting/${id}`), 1500);
          return;
        } else if (status === 'FAILED') {
          throw new Error('Processing failed on the server.');
        }
      }
      throw new Error('Processing timed out after 10 minutes.');

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Something went wrong.');
      setStep(-1);
      setUploading(false);
    }
  };

  const handleRetry = () => {
    setStep(0);
    setError(null);
    setUploading(false);
  };

  /* ── Show progress screen while processing ──────────────────────────────── */
  const statusMap = { 1: 'uploading', 2: 'transcribing', 3: 'analyzing', 4: 'ready' };
  if (uploading && step > 0 && step !== -1) {
    return <UploadProgress status={statusMap[step]} title={title} />;
  }

  /* ── Idle / file select UI ───────────────────────────────────────────────── */
  return (
    <div className="app-container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        <div style={{ marginBottom: '48px' }}>
          <h1 style={{
            fontFamily: 'Fraunces',
            fontWeight: 600,
            fontSize: '28px',
            color: 'var(--text)',
            marginBottom: '8px'
          }}>
            Upload a Meeting
          </h1>
          <p style={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: '15px',
            color: 'var(--text-secondary)'
          }}>
            Upload audio or video files for personalized intelligence analysis.
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          {!file ? (
            /* ── Drop zone ── */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                border: isDragging ? '2px dashed var(--accent)' : '2px dashed var(--border)',
                borderRadius: '16px',
                padding: '64px 24px',
                textAlign: 'center',
                transition: 'all 200ms ease',
                background: isDragging ? 'var(--accent-dim)' : 'var(--bg-surface)',
                cursor: 'pointer',
              }}
            >
              <input
                type="file"
                onChange={handleFileSelect}
                accept="audio/*,video/*"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                }}
              />
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                background: isDragging ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                color: isDragging ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 200ms ease',
              }}>
                <Upload size={24} />
              </div>
              <h3 style={{
                fontFamily: 'Fraunces',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--text)',
                marginBottom: '6px',
              }}>
                Drop your recording here
              </h3>
              <p style={{
                fontFamily: 'Plus Jakarta Sans',
                fontSize: '14px',
                color: 'var(--text-muted)',
                marginBottom: '20px',
              }}>
                or click to browse · max {MAX_MB} MB
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {['MP3', 'MP4', 'WAV', 'M4A', 'WEBM'].map(fmt => (
                  <span
                    key={fmt}
                    style={{
                      padding: '4px 10px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {fmt}
                  </span>
                ))}
              </div>

              {/* Show drop-zone error here (before file is selected) */}
              {error && (
                <div style={{
                  marginTop: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: '13px',
                  color: 'var(--danger)',
                }}>
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* ── File selected ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* File info row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    flexShrink: 0,
                  }}>
                    <Upload size={18} />
                  </div>
                  <div>
                    <p style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--text)',
                      maxWidth: '240px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {file.name}
                    </p>
                    <p style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 150ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="Remove file"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Title input */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}>
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Q1 Strategy Sync"
                  className="input-standard"
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: 'rgba(224, 90, 107, 0.08)',
                  border: '1px solid rgba(224, 90, 107, 0.25)',
                  borderRadius: '10px',
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: '13px',
                  color: 'var(--danger)',
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Action buttons */}
              {step === -1 ? (
                <button
                  onClick={handleRetry}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '13px' }}
                >
                  Try Again
                </button>
              ) : (
                <motion.button
                  onClick={handleUpload}
                  disabled={!title.trim()}
                  className="btn-primary"
                  style={{ width: '100%', padding: '13px' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start AI Analysis
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadMeeting;