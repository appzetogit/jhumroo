import React, { useState, useEffect } from 'react';
import { 
  BiBell, 
  BiPlus, 
  BiX, 
  BiImageAdd, 
  BiMap, 
  BiSend, 
  BiUserVoice, 
  BiCheckCircle,
  BiTrendingUp,
  BiGlobe
} from 'react-icons/bi';
import api from '../../../services/api';
import { INDIAN_STATES, STATE_DISTRICTS } from '../../../utils/indiaLocations';

const AdminNotifications = () => {
  // Page states
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [alert, setAlert] = useState({ type: null, message: '' });

  // Composer Form States
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetType: 'all', // 'all' or 'location'
    country: 'India',
    state: '',
    district: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch recent dispatches
  const fetchDispatches = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/notifications');
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to load dispatches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert({ type: null, message: '' });
    }, 4000);
  };

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Reset district if state changes
      if (name === 'state') {
        updated.district = '';
      }
      return updated;
    });
  };

  // Handle Image Selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showAlert('error', 'Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove Selected Image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  // Submit Notification Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      showAlert('error', 'Please fill in Title and Message fields');
      return;
    }

    try {
      setIsSending(true);
      
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('message', formData.message);
      payload.append('targetType', formData.targetType);
      
      if (formData.targetType === 'location') {
        payload.append('country', formData.country);
        if (formData.state) payload.append('state', formData.state);
        if (formData.district) payload.append('district', formData.district);
      }

      if (imageFile) {
        payload.append('image', imageFile);
      }

      const res = await api.post('/admin/notifications/send', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.success) {
        showAlert('success', `Notification dispatched to ${res.sentCount} matching users!`);
        setIsComposerOpen(false);
        // Reset Form
        setFormData({
          title: '',
          message: '',
          targetType: 'all',
          country: 'India',
          state: '',
          district: '',
        });
        setImageFile(null);
        setImagePreview('');
        // Hot-reload table
        fetchDispatches();
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to dispatch notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="admin-page animate-fade-in">
      {/* Alert Banner */}
      {alert.type && (
        <div className={`alert-banner ${alert.type}`}>
          {alert.type === 'success' ? <BiCheckCircle size={22} /> : <BiBell size={22} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Notifications Center</h1>
          <p>Compose, target, and dispatch platform-wide push and in-app communication.</p>
        </div>
        <button 
          type="button" 
          className="admin-primary-btn compose-btn"
          onClick={() => setIsComposerOpen(true)}
        >
          <BiPlus size={20} />
          Compose Notification
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="stats-strip">
        <div className="stat-pill">
          <BiGlobe size={20} className="globe-icon" />
          <div>
            <span className="stat-label">Total Dispatches</span>
            <span className="stat-val">{notifications.length}</span>
          </div>
        </div>
        <div className="stat-pill">
          <BiUserVoice size={20} className="audience-icon" />
          <div>
            <span className="stat-label">Total Recipients</span>
            <span className="stat-val">
              {notifications.reduce((acc, curr) => acc + (curr.sentCount || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="stat-pill">
          <BiTrendingUp size={20} className="clicks-icon" />
          <div>
            <span className="stat-label">Total Clicks</span>
            <span className="stat-val">
              {notifications.reduce((acc, curr) => acc + (curr.clicks || 0), 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Dispatches Section */}
      <div className="admin-card table-card">
        <div className="admin-card-header">
          <div>
            <h2>Recent Dispatches</h2>
            <p className="card-subtitle">List of platform announcements and system notifications.</p>
          </div>
          <span className="admin-chip pulse-chip">Live Dispatch Tracker</span>
        </div>

        {isLoading ? (
          <div className="table-loader">
            <div className="spinner"></div>
            <span>Fetching dispatches...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <BiBell size={48} className="empty-icon" />
            <h3>No dispatches sent yet</h3>
            <p>Dispatched notifications will appear here with dynamic engagement tracking.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <div className="admin-table">
              <div className="admin-table-head notification-table-grid">
                <span>Audience</span>
                <span>Subject & Message</span>
                <span>Target Region</span>
                <span>Recipients</span>
                <span>Clicks</span>
                <span>Sent Date</span>
              </div>
              
              {notifications.map((dispatch) => (
                <div className="admin-table-row notification-table-grid" key={dispatch._id}>
                  {/* Type/Audience Tag */}
                  <div>
                    {dispatch.targetType === 'all' ? (
                      <span className="type-tag all">Broadcast</span>
                    ) : (
                      <span className="type-tag targeted">Targeted</span>
                    )}
                  </div>
                  
                  {/* Subject and Preview */}
                  <div className="subject-col">
                    {dispatch.imageUrl && (
                      <div className="thumbnail-wrapper">
                        <img src={dispatch.imageUrl} alt="Notification attachment" />
                      </div>
                    )}
                    <div className="subject-text">
                      <span className="dispatch-title">{dispatch.title}</span>
                      <p className="dispatch-desc">{dispatch.message}</p>
                    </div>
                  </div>
                  
                  {/* Target Region */}
                  <div className="target-region">
                    {dispatch.targetType === 'all' ? (
                      <span className="all-users-label">All Active Users</span>
                    ) : (
                      <div className="region-meta">
                        <BiMap size={14} />
                        <span>
                          {dispatch.targetLocation.district || 'All Districts'}, {dispatch.targetLocation.state || 'All States'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Sent Count */}
                  <span className="stat-count">{dispatch.sentCount?.toLocaleString() || 0}</span>
                  
                  {/* Clicks */}
                  <span className="click-count">{dispatch.clicks || 0}</span>
                  
                  {/* Sent Date */}
                  <span className="date-field">
                    {new Date(dispatch.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer Modal Overlay */}
      {isComposerOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setIsComposerOpen(false)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-meta">
                <BiBell size={20} className="bell-accent" />
                <div>
                  <h3>Compose Notification</h3>
                  <p>Send instant announcements globally or filter by geolocation</p>
                </div>
              </div>
              <button 
                type="button" 
                className="close-modal-btn"
                onClick={() => setIsComposerOpen(false)}
              >
                <BiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="composer-form">
              <div className="modal-body">
                {/* Notification Subject */}
                <div className="form-group">
                  <label htmlFor="title">Notification Subject *</label>
                  <input 
                    type="text" 
                    id="title"
                    name="title"
                    placeholder="Enter catchy headline / title..."
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Message Body */}
                <div className="form-group">
                  <label htmlFor="message">Message Body *</label>
                  <textarea 
                    id="message"
                    name="message"
                    rows="2"
                    placeholder="Describe your notification update clearly..."
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Target Strategy Choice */}
                <div className="form-group">
                  <label>Audience Targeting Strategy</label>
                  <div className="targeting-options-grid">
                    <label className={`target-card ${formData.targetType === 'all' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="targetType" 
                        value="all" 
                        checked={formData.targetType === 'all'}
                        onChange={handleInputChange}
                      />
                      <BiGlobe size={20} />
                      <div className="card-label">
                        <strong>Public Broadcast</strong>
                        <span>Delivers instantly to all active platform users.</span>
                      </div>
                    </label>
 
                    <label className={`target-card ${formData.targetType === 'location' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="targetType" 
                        value="location" 
                        checked={formData.targetType === 'location'}
                        onChange={handleInputChange}
                      />
                      <BiMap size={20} />
                      <div className="card-label">
                        <strong>Geo-Targeted Send</strong>
                        <span>Filters delivery criteria by specific states & districts.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Geo-Location Filters */}
                {formData.targetType === 'location' && (
                  <div className="location-inputs-row animate-slide-down">
                    <div className="form-group">
                      <label htmlFor="country">Country</label>
                      <select 
                        id="country" 
                        name="country" 
                        value={formData.country} 
                        onChange={handleInputChange}
                      >
                        <option value="India">India</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="state">State</label>
                      <select 
                        id="state" 
                        name="state" 
                        value={formData.state} 
                        onChange={handleInputChange}
                      >
                        <option value="">All States</option>
                        {INDIAN_STATES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="district">District</label>
                      <select 
                        id="district" 
                        name="district" 
                        value={formData.district} 
                        onChange={handleInputChange}
                        disabled={!formData.state}
                      >
                        <option value="">All Districts</option>
                        {formData.state && STATE_DISTRICTS[formData.state]?.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Notification Image File Upload */}
                <div className="form-group">
                  <label>Attach Notification Image (Optional)</label>
                  {!imagePreview ? (
                    <div className="image-dropzone">
                      <input 
                        type="file" 
                        id="image" 
                        accept="image/*" 
                        onChange={handleImageChange}
                      />
                      <BiImageAdd size={30} className="dropzone-icon" />
                      <div className="dropzone-text">
                        <span>Click to choose or drag image file here</span>
                        <p>JPEG, PNG, WebP up to 5MB max.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="preview-container">
                      <img src={imagePreview} alt="Upload preview" className="image-preview" />
                      <button 
                        type="button" 
                        className="remove-preview-btn" 
                        onClick={removeImage}
                      >
                        <BiX size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
 
              {/* Modal Footer actions */}
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="admin-secondary-btn"
                  onClick={() => setIsComposerOpen(false)}
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="admin-primary-btn send-dispatch-btn"
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <div className="btn-spinner"></div>
                      Dispatched Send...
                    </>
                  ) : (
                    <>
                      <BiSend size={16} />
                      Dispatch Notification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled Sheets */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-down {
          animation: slideDown 0.25s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translate(-50%, -46%) scale(0.95); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Alert Banner */
        .alert-banner {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .alert-banner.success {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        .alert-banner.error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        /* Header overrides */
        .compose-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #fe2c55, #dd1d43);
          border: none;
          box-shadow: 0 4px 15px rgba(254, 44, 85, 0.3);
        }
        .compose-btn:hover {
          background: linear-gradient(135deg, #dd1d43, #b81031);
        }

        /* Quick Stats */
        .stats-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-pill {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 1.25rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }
        .stat-pill svg {
          width: 48px;
          height: 48px;
          padding: 12px;
          border-radius: 12px;
        }
        .stat-pill .globe-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .stat-pill .audience-icon { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .stat-pill .clicks-icon { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .stat-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: var(--admin-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .stat-val {
          display: block;
          font-size: 20px;
          font-weight: 800;
          color: #111;
          margin-top: 4px;
        }

        /* Table Card and layout */
        .table-card {
          padding: 1.5rem;
          border-radius: 20px;
          background: white;
        }
        .card-subtitle {
          font-size: 13px;
          color: var(--admin-muted);
          margin-top: 4px;
        }
        .pulse-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          font-weight: 700;
        }
        .pulse-chip::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.6; }
          100% { transform: scale(0.9); opacity: 1; }
        }

        .table-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 0;
          gap: 12px;
          color: var(--admin-muted);
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(0,0,0,0.05);
          border-top-color: #fe2c55;
          border-radius: 50%;
          animation: spin 1s infinite linear;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 5rem 2rem;
        }
        .empty-icon {
          color: #cbd5e1;
          margin-bottom: 1.5rem;
        }
        .empty-state h3 {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 6px;
        }
        .empty-state p {
          font-size: 14px;
          color: var(--admin-muted);
          max-width: 380px;
        }

        .admin-table-container {
          overflow-x: auto;
          margin-top: 1.5rem;
        }
        .notification-table-grid {
          display: grid;
          grid-template-columns: 110px 1fr 200px 100px 80px 120px;
          align-items: center;
          gap: 1rem;
          padding-left: 12px;
          padding-right: 12px;
        }
        .type-tag {
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          width: fit-content;
          display: inline-block;
        }
        .type-tag.all { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
        .type-tag.targeted { background: rgba(59, 130, 246, 0.1); color: #2563eb; }

        /* Subject column with attachment preview */
        .subject-col {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .thumbnail-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          overflow: hidden;
          background: #f1f5f9;
          flex-shrink: 0;
          border: 1px solid rgba(0,0,0,0.08);
        }
        .thumbnail-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .subject-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .dispatch-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dispatch-desc {
          font-size: 12px;
          color: var(--admin-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }

        .all-users-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }
        .region-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #334155;
          font-weight: 600;
        }
        .region-meta svg {
          color: #64748b;
        }

        .stat-count, .click-count {
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }
        .click-count {
          color: #10b981;
        }
        .date-field {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }

        /* Modal Overlays */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          z-index: 999;
        }
        .modal-content {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          max-width: 520px;
          max-height: 85vh;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255,255,255,0.7);
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .header-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bell-accent {
          color: #fe2c55;
          background: rgba(254, 44, 85, 0.08);
          padding: 8px;
          border-radius: 10px;
          box-sizing: content-box;
        }
        .header-meta h3 {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .header-meta p {
          font-size: 11px;
          color: #64748b;
          margin: 2px 0 0 0;
        }
        .close-modal-btn {
          border: none;
          background: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .close-modal-btn:hover {
          background: rgba(0,0,0,0.05);
          color: #0f172a;
        }

        .modal-body {
          padding: 1.25rem;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }
        .form-group input[type="text"],
        .form-group textarea,
        .form-group select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          background: white;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          color: #0f172a;
          font-family: inherit;
        }
        .form-group input[type="text"]:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          border-color: #fe2c55;
          box-shadow: 0 0 0 4px rgba(254, 44, 85, 0.1);
        }

        /* Targeting Strategy cards */
        .targeting-options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-top: 2px;
        }
        .target-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 2px solid #e2e8f0;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
          position: relative;
        }
        .target-card input[type="radio"] {
          position: absolute;
          top: 0.85rem;
          right: 1rem;
          accent-color: #fe2c55;
        }
        .target-card svg {
          color: #64748b;
          transition: color 0.2s;
        }
        .target-card.active {
          border-color: #fe2c55;
          background: rgba(254, 44, 85, 0.01);
        }
        .target-card.active svg {
          color: #fe2c55;
        }
        .card-label strong {
          display: block;
          font-size: 13px;
          color: #0f172a;
        }
        .card-label span {
          display: block;
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
          line-height: 1.3;
        }

        /* Geolocation selector fields */
        .location-inputs-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.75rem;
          background: #f8fafc;
          padding: 0.85rem 1rem;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
        }

        /* Image Dropzone upload block */
        .image-dropzone {
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          text-align: center;
          cursor: pointer;
          position: relative;
          background: #f8fafc;
          transition: border-color 0.2s, background 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .image-dropzone:hover {
          border-color: #fe2c55;
          background: rgba(254, 44, 85, 0.01);
        }
        .image-dropzone input[type="file"] {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
        .dropzone-icon {
          color: #94a3b8;
        }
        .dropzone-text span {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }
        .dropzone-text p {
          font-size: 10px;
          color: #64748b;
          margin: 2px 0 0 0;
        }

        .preview-container {
          position: relative;
          width: 100%;
          max-height: 110px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #cbd5e1;
        }
        .image-preview {
          width: 100%;
          height: 100%;
          max-height: 110px;
          object-fit: cover;
        }
        .remove-preview-btn {
          position: absolute;
          top: 6px;
          right: 6px;
          background: rgba(15, 23, 42, 0.8);
          color: white;
          border: none;
          padding: 4px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .remove-preview-btn:hover {
          background: #fe2c55;
        }

        /* Modal Footer actions */
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 0.85rem 1.25rem;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          background: #f8fafc;
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
        }
        .modal-footer button {
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          height: auto !important;
        }
        .send-dispatch-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #fe2c55, #dd1d43);
          border: none;
          padding: 8px 16px;
          font-weight: 700;
          color: white;
          cursor: pointer;
        }
        .send-dispatch-btn:hover {
          background: linear-gradient(135deg, #dd1d43, #b81031);
        }
        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default AdminNotifications;
