import { useState } from 'react';
import { Search } from 'lucide-react';

function TranscriptViewer({ transcript, words }) {
  const [search, setSearch] = useState('');

  if (!transcript) {
    return (
      <div style={{
        padding: '80px 24px',
        textAlign: 'center',
        color: 'var(--text-muted)'
      }}>
        <p style={{
          fontFamily: 'JetBrains Mono',
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          No transcript signal detected.
        </p>
      </div>
    );
  }

  const filteredTranscript = transcript
    .split('\n')
    .filter(line => line.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono',
          fontSize: '11px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Raw Signal Data
        </div>
        <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Search transcript..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-standard"
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      <div style={{
        padding: '24px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        maxHeight: '600px',
        overflowY: 'auto',
        fontFamily: 'JetBrains Mono',
        fontSize: '13px',
        lineHeight: 1.8
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTranscript.length > 0 ? (
            filteredTranscript.map((line, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '24px',
                  padding: '6px 12px',
                  margin: '0 -12px',
                  borderRadius: '8px',
                  transition: 'background 150ms ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  color: 'var(--text-muted)',
                  userSelect: 'none',
                  minWidth: '36px',
                  fontWeight: 500
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <p style={{
                  color: 'var(--text-secondary)',
                  flex: 1
                }}>
                  {line}
                </p>
              </div>
            ))
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '14px',
              fontStyle: 'italic'
            }}>
              No entries match your filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TranscriptViewer;
