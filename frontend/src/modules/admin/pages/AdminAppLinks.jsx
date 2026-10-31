import React, { useState, useEffect } from 'react';
import { BiLink, BiSave, BiRefresh } from 'react-icons/bi';
import adminStaticPageService from '../../../services/adminStaticPageService';

const FIELDS = [
  { key: 'playStoreUrl', label: 'Play Store Link (Android)', placeholder: 'https://play.google.com/store/apps/details?id=...' },
  { key: 'appStoreUrl', label: 'App Store Link (iOS)', placeholder: 'https://apps.apple.com/app/...' }
];

const EMPTY_LINKS = { playStoreUrl: '', appStoreUrl: '' };

const AdminAppLinks = () => {
  const [links, setLinks] = useState(EMPTY_LINKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const response = await adminStaticPageService.getAppLinks();
      if (response.success) setLinks({ ...EMPTY_LINKS, ...response.links });
    } catch (error) {
      console.error('Error fetching app links:', error);
      setMessage({ text: 'Failed to load app links.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const response = await adminStaticPageService.updateAppLinks(links);
      if (response.success) {
        setLinks({ ...EMPTY_LINKS, ...response.links });
        setMessage({ text: 'App links saved successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Error updating app links:', error);
      setMessage({ text: error.response?.data?.message || error.message || 'Failed to update app links.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page admin-loading">
        <div className="admin-loader"></div>
        <p>Loading app links...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>App Links</h1>
          <p>Manage the Play Store and App Store links shown on the landing page.</p>
        </div>
        <button className="admin-secondary-btn" onClick={fetchLinks} disabled={saving}>
          <BiRefresh size={20} /> Reload
        </button>
      </div>

      <div className="admin-section" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSave} className="admin-card app-links-card">
          <div className="app-links-icon-header">
            <div className="app-links-icon-wrapper">
              <BiLink size={32} />
            </div>
            <div>
              <h3>App Download Links</h3>
              <p>Leave a field empty to hide that button on the landing page.</p>
            </div>
          </div>

          <div className="app-links-fields">
            {FIELDS.map(({ key, label, placeholder }) => (
              <div className="input-group" key={key}>
                <label>{label}</label>
                <input
                  type="url"
                  value={links[key]}
                  onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>

          {message.text && (
            <div className={`admin-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message.text}
            </div>
          )}

          <div className="app-links-actions">
            <button type="submit" className="admin-primary-btn" disabled={saving}>
              <BiSave size={20} /> {saving ? 'Saving...' : 'Save Links'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .app-links-card {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .app-links-icon-header {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding-bottom: 1.25rem;
        }
        .app-links-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(254, 44, 85, 0.08);
          color: var(--admin-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .app-links-icon-header h3 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .app-links-icon-header p {
          font-size: 13px;
          color: var(--admin-muted);
        }
        .app-links-fields {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .app-links-fields .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .app-links-fields label {
          font-size: 13px;
          font-weight: 600;
          color: var(--admin-text);
        }
        .app-links-fields input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 10px;
          font-size: 15px;
          background: white;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .app-links-fields input:focus {
          border-color: var(--admin-primary);
          box-shadow: 0 0 0 4px rgba(254, 44, 85, 0.08);
        }
        .admin-alert {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
        }
        .alert-success {
          background: rgba(40, 167, 69, 0.08);
          color: #28a745;
          border: 1px solid rgba(40, 167, 69, 0.15);
        }
        .alert-error {
          background: rgba(220, 53, 69, 0.08);
          color: #dc3545;
          border: 1px solid rgba(220, 53, 69, 0.15);
        }
        .app-links-actions {
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};

export default AdminAppLinks;
