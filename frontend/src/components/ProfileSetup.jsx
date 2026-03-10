import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../api/client';

function ProfileSetup({ onProfileUpdate }) {
  const [profile, setProfile] = useState({
    name: 'Keerat Khanuja',
    role: 'AI Engineer / Data Scientist',
    projects: [],
    keywords: []
  });
  const [projectTags, setProjectTags] = useState([]);
  const [keywordTags, setKeywordTags] = useState([]);
  const [projectInput, setProjectInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile({
        name: data.name || '',
        role: data.role || '',
        projects: data.projects || [],
        keywords: data.keywords || []
      });
      if (data.projects && Array.isArray(data.projects)) {
        setProjectTags(data.projects);
      }
      if (data.keywords && Array.isArray(data.keywords)) {
        setKeywordTags(data.keywords);
      }
    } catch (err) {
      // No profile yet, use empty defaults
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleAddProject = (e) => {
    if (e.key === 'Enter' && projectInput.trim()) {
      e.preventDefault();
      setProjectTags([...projectTags, projectInput.trim()]);
      setProjectInput('');
      setSaved(false);
    }
  };

  const handleAddKeyword = (e) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      setKeywordTags([...keywordTags, keywordInput.trim()]);
      setKeywordInput('');
      setSaved(false);
    }
  };

  const removeProjectTag = (index) => {
    setProjectTags(projectTags.filter((_, i) => i !== index));
    setSaved(false);
  };

  const removeKeywordTag = (index) => {
    setKeywordTags(keywordTags.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await api.saveProfile({
        name: profile.name,
        role: profile.role,
        projects: projectTags,
        keywords: keywordTags
      });
      setSaved(true);
      
      // Save to localStorage
      localStorage.setItem('meetingmind_profile', JSON.stringify({
        name: profile.name,
        role: profile.role
      }));
      
      // Update navbar profile
      if (onProfileUpdate) {
        onProfileUpdate();
      }
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile');
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '460px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{
            fontFamily: 'Fraunces',
            fontWeight: 600,
            fontSize: '28px',
            color: 'var(--text)',
            marginBottom: '8px'
          }}>
            Your Profile
          </h1>
          <p style={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: '15px',
            color: 'var(--text-secondary)'
          }}>
            Tell MeetingMind who you are
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Plus Jakarta Sans',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder="Keerat Khanuja"
                className="input-standard"
                required
              />
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
                Role
              </label>
              <input
                type="text"
                name="role"
                value={profile.role}
                onChange={handleChange}
                placeholder="AI Engineer / Data Scientist"
                className="input-standard"
                required
              />
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
                Focus Projects
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                minHeight: '48px'
              }}>
                {projectTags.map((tag, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '9999px',
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '13px',
                      color: 'var(--text)'
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeProjectTag(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
                <input
                  type="text"
                  value={projectInput}
                  onChange={(e) => setProjectInput(e.target.value)}
                  onKeyDown={handleAddProject}
                  placeholder={projectTags.length === 0 ? "Type and press Enter" : ""}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'Plus Jakarta Sans',
                    fontSize: '14px',
                    color: 'var(--text)'
                  }}
                />
              </div>
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
                Priority Keywords
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                minHeight: '48px'
              }}>
                {keywordTags.map((tag, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '9999px',
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '13px',
                      color: 'var(--text)'
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeKeywordTag(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleAddKeyword}
                  placeholder={keywordTags.length === 0 ? "Type and press Enter" : ""}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'Plus Jakarta Sans',
                    fontSize: '14px',
                    color: 'var(--text)'
                  }}
                />
              </div>
            </div>

            <motion.button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '14px' }}
              whileTap={{ scale: 0.98 }}
              disabled={saving || saved}
            >
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Profile'}
            </motion.button>

            {error && (
              <div style={{
                padding: '12px',
                background: 'var(--high-bg)',
                border: '1px solid var(--high-border)',
                borderRadius: '8px',
                fontFamily: 'Plus Jakarta Sans',
                fontSize: '13px',
                color: 'var(--high)',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetup;
