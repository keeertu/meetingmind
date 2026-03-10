import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, X, AlertCircle } from 'lucide-react';
import api from '../api/client';
import UploadProgress from './UploadProgress';

function UploadMeeting() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(0); // 0=idle, 1=uploading, 2=transcribing, 3=analyzing, 4=ready, -1=error
  const [meetingId, setMeetingId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('File size exceeds 100MB limit.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title) return;
    
    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload
      setStep(1);
      let uploadResult;
      if (file.size > 8 * 1024 * 1024) {
        // Files over 8MB use presigned URL (bypasses API Gateway)
        uploadResult = await api.uploadMeetingPresigned(file, title);
      } else {
        // Small files use direct upload
        uploadResult = await api.uploadMeeting(file, title);
      }
      const id = uploadResult.meetingId;
      setMeetingId(id);

      // Step 2 & 3: Poll status
      setStep(2);
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 5000));
        
        const statusResult = await api.getMeetingStatus(id);
        
        if (statusResult.status === 'TRANSCRIBING') {
          setStep(2);
        } else if (statusResult.status === 'ANALYZING') {
          setStep(3);
        } else if (statusResult.status === 'COMPLETED' || statusResult.status === 'COMPLETE') {
          setStep(4);
          setTimeout(() => navigate(`/meeting/${id}`), 1500);
          break;
        } else if (statusResult.status === 'FAILED') {
          throw new Error('Processing failed');
        }
        
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Processing timed out');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Something went wrong');
      setStep(-1);
      setUploading(false);
    }
  };

  const handleRetry = () => {
    setStep(0);
    setError(null);
    setUploading(false);
  };

  // Map step to status for UploadProgress component
  const getStatus = () => {
    if (step === 1) return 'uploading';
    if (step === 2) return 'transcribing';
    if (step === 3) return 'analyzing';
    if (step === 4) return 'ready';
    return 'idle';
  };

  if (uploading && step > 0 && step !== -1) {
    return <UploadProgress status={getStatus()} title={title} />;
  }

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
                background: isDragging ? 'var(--bg-elevated)' : 'var(--bg-surface)'
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
                  cursor: 'pointer'
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
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)'
              }}>
                <Upload size={24} />
              </div>
              <h3 style={{
                fontFamily: 'Fraunces',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--text)',
                marginBottom: '6px'
              }}>
                Drop your recording here
              </h3>
              <p style={{
                fontFamily: 'Plus Jakarta Sans',
                fontSize: '14px',
                color: 'var(--text-muted)',
                marginBottom: '20px'
              }}>
                or click to browse
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {['MP3', 'MP4', 'WAV', 'M4A'].map((format) => (
                  <div
                    key={format}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--text-muted)'
                    }}
                  >
                    {format}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-surface)',
                    color: 'var(--text)'
                  }}>
                    <Upload size={20} />
                  </div>
                  <div>
                    <p style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--text)',
                      marginBottom: '4px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.name}
                    </p>
                    <p style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px',
                      color: 'var(--text-muted)'
                    }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    transition: 'all 150ms ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-subtle)';
                    e.currentTarget.style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: '8px'
                }}>
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Q1 Strategy Sync"
                  className="input-standard"
                />
              </div>

              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: 'var(--high-bg)',
                  border: '1px solid var(--high-border)',
                  borderRadius: '12px',
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--high)'
                }}>
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {step === -1 && (
                <button
                  onClick={handleRetry}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '14px' }}
                >
                  Try Again
                </button>
              )}

              {step !== -1 && (
                <motion.button
                  onClick={handleUpload}
                  disabled={!title}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px' }}
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
