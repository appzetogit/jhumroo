import React, { useState, useEffect } from 'react';
import { BiCreditCard, BiRefresh, BiShow, BiX, BiMap, BiLink, BiCalendar } from 'react-icons/bi';
import adService from '../../../services/adService';

// Subcomponent: Renders the details modal for the selected ad campaign
const AdInspectorModal = ({ ad, onClose }) => {
  if (!ad) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal ad-inspector-modal">
        <div className="admin-modal-header">
          <h2>Inspect Campaign Details</h2>
          <button className="modal-close-x" onClick={onClose}>
            <BiX size={24} />
          </button>
        </div>
        
        <div className="admin-modal-body ad-inspector-body">
          <div className="inspector-layout">
            {/* Media Section */}
            <div className="inspector-media-container">
              {ad.media?.type === 'video' ? (
                <video src={ad.media.url} controls className="inspector-media" />
              ) : (
                <img src={ad.media?.url} alt="Campaign Media" className="inspector-media" />
              )}
              <span className="media-type-overlay">{ad.media?.type || 'image'}</span>
            </div>

            {/* Details Section */}
            <div className="inspector-details">
              <div className="inspector-section">
                <label>Ad Caption</label>
                <p className="inspector-caption">{ad.caption || <em style={{ color: '#aaa' }}>No caption entered</em>}</p>
              </div>

              <div className="inspector-section">
                <label>Target Audience Location</label>
                <div className="targeting-details">
                  <div className="targeting-row">
                    <BiMap size={18} className="targeting-icon" />
                    <div>
                      <strong>Country:</strong> {ad.targetCountry || 'India'}
                    </div>
                  </div>
                  
                  <div className="targeting-row">
                    <BiMap size={18} className="targeting-icon" />
                    <div>
                      <strong>States:</strong> {
                        Array.isArray(ad.targetState) && ad.targetState.length > 0
                          ? ad.targetState.join(', ')
                          : 'All States'
                      }
                    </div>
                  </div>

                  {Array.isArray(ad.targetDistricts) && ad.targetDistricts.length > 0 && (
                    <div className="targeting-row">
                      <BiMap size={18} className="targeting-icon" />
                      <div>
                        <strong>Districts:</strong> {ad.targetDistricts.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="inspector-section">
                <label>Call-to-Action (CTA)</label>
                {ad.adType === 'shop' ? (
                  <div className="cta-box">
                    <BiLink size={18} className="cta-icon" />
                    <div>
                      <strong>Shop Link:</strong>
                      <a href={ad.link} target="_blank" rel="noopener noreferrer" className="cta-link-anchor">
                        {ad.link}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="cta-box cta-chat">
                    <div className="whatsapp-logo-bubble">WA</div>
                    <div>
                      <strong>WhatsApp:</strong> <span>{ad.whatsappNumber}</span>
                      <div className="wa-message-preview">
                        <strong>Message:</strong> "{ad.welcomeMessage}"
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {ad.music && ad.music.name && (
                <div className="inspector-section">
                  <label>Background Audio</label>
                  <div className="audio-box">
                    <strong>Title:</strong> {ad.music.name}
                    {ad.music.url && (
                      <audio src={ad.music.url} controls className="audio-player-mini" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="admin-modal-footer">
          <button className="admin-secondary-btn" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Renders the table of transactions and campaigns
const PaymentRecordsTable = ({ ads, onInspect }) => {
  return (
    <div className="admin-card table-responsive" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>User Details</th>
            <th>Ad Type</th>
            <th>Amount Paid</th>
            <th>Razorpay Details</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => {
            const dateStr = new Date(ad.updatedAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <tr key={ad._id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div className="table-date-cell">
                    <BiCalendar size={16} style={{ color: 'var(--admin-muted)', marginRight: '6px' }} />
                    <span>{dateStr}</span>
                  </div>
                </td>
                <td>
                  {ad.user ? (
                    <div className="table-user-cell">
                      <div className="table-avatar">
                        <img
                          src={ad.user.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ad.user.username}`}
                          alt={ad.user.username}
                        />
                      </div>
                      <div className="table-user-info">
                        <strong>{ad.user.fullName || ad.user.username}</strong>
                        <span>@{ad.user.username}</span>
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--admin-muted)' }}>Unknown User</span>
                  )}
                </td>
                <td>
                  <span className={`ad-type-badge badge-${ad.adType}`}>
                    {ad.adType === 'shop' ? 'Shop Link' : 'Chat WhatsApp'}
                  </span>
                </td>
                <td>
                  <strong className="payment-amount">₹{ad.paymentAmount || 0}</strong>
                </td>
                <td>
                  <div className="razorpay-ids">
                    <div><span className="id-label">Order ID:</span> <span className="id-val">{ad.razorpayOrderId || 'N/A'}</span></div>
                    <div><span className="id-label">Payment ID:</span> <span className="id-val">{ad.razorpayPaymentId || 'N/A'}</span></div>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="admin-primary-btn table-action-btn"
                    onClick={() => onInspect(ad)}
                    title="Inspect Campaign Details"
                  >
                    <BiShow size={16} /> Inspect
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Main Page Component
const AdminAdsPaymentRecords = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await adService.getPaymentRecordsAdmin();
      if (response.success && response.ads) {
        setAds(response.ads);
      }
    } catch (error) {
      console.error('Error fetching ads payment records:', error);
      alert('Failed to load payment records.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page admin-loading">
        <div className="admin-loader"></div>
        <p>Loading advertisement payment records...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Ads Payment Records</h1>
          <p>View history of advertisement transactions and inspect user campaigns.</p>
        </div>
        <button className="admin-secondary-btn" onClick={fetchRecords}>
          <BiRefresh size={20} /> Reload
        </button>
      </div>

      <div className="admin-section">
        {ads.length === 0 ? (
          <div className="admin-card text-center" style={{ padding: '3rem 2rem' }}>
            <BiCreditCard size={48} style={{ color: 'var(--admin-muted)', marginBottom: '1rem', opacity: 0.5 }} />
            <h3>No payment records found</h3>
            <p style={{ color: 'var(--admin-muted)', fontSize: '14px', marginTop: '4px' }}>
              No user ads have completed checkout yet.
            </p>
          </div>
        ) : (
          <PaymentRecordsTable ads={ads} onInspect={setSelectedAd} />
        )}
      </div>

      {/* Ad Inspector Modal */}
      <AdInspectorModal ad={selectedAd} onClose={() => setSelectedAd(null)} />

      <style>{STYLES_CSS}</style>
    </div>
  );
};

const STYLES_CSS = `
  .admin-table {
    width: 100%;
    border-collapse: collapse;
  }
  .admin-table th, .admin-table td {
    padding: 14px 18px;
    text-align: left;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    font-size: 14px;
  }
  .admin-table th {
    background: #f8f9fa;
    font-weight: 700;
    color: var(--admin-text);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .admin-table tr:hover td {
    background: rgba(0,0,0,0.01);
  }
  .table-date-cell {
    display: flex;
    align-items: center;
    font-weight: 500;
    color: var(--admin-text);
  }
  .table-user-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .table-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    overflow: hidden;
    background: #eee;
    border: 1px solid rgba(0,0,0,0.08);
  }
  .table-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .table-user-info {
    display: flex;
    flex-direction: column;
  }
  .table-user-info strong {
    font-size: 13.5px;
    color: var(--admin-text);
  }
  .table-user-info span {
    font-size: 12px;
    color: var(--admin-muted);
  }
  .ad-type-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .badge-shop {
    background: rgba(59, 130, 246, 0.08);
    color: #3b82f6;
  }
  .badge-chat {
    background: rgba(16, 185, 129, 0.08);
    color: #10b981;
  }
  .payment-amount {
    color: var(--admin-primary);
    font-size: 15px;
  }
  .razorpay-ids {
    font-size: 11.5px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .id-label {
    color: var(--admin-muted);
    font-weight: 600;
  }
  .id-val {
    color: var(--admin-text);
    font-family: monospace;
  }
  .table-action-btn {
    padding: 8px 14px !important;
    font-size: 12.5px !important;
    border-radius: 8px !important;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  
  /* Inspector Modal Styling */
  .ad-inspector-modal {
    width: 850px;
    max-width: 95%;
    max-height: 85vh;
  }
  .ad-inspector-body {
    overflow-y: auto;
    max-height: calc(85vh - 120px);
  }
  .inspector-layout {
    display: grid;
    grid-template-columns: 1fr 1.25fr;
    gap: 2rem;
  }
  @media (max-width: 768px) {
    .inspector-layout {
      grid-template-columns: 1fr;
    }
  }
  .inspector-media-container {
    position: relative;
    aspect-ratio: 9/16;
    max-height: 500px;
    background: black;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    width: 100%;
  }
  .inspector-media {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .media-type-overlay {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(0,0,0,0.6);
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .inspector-details {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .inspector-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .inspector-section label {
    font-size: 11px;
    font-weight: 700;
    color: var(--admin-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .inspector-caption {
    font-size: 15px;
    line-height: 1.5;
    color: var(--admin-text);
    background: #f8f9fa;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.04);
  }
  .targeting-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #f8f9fa;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.04);
  }
  .targeting-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13.5px;
  }
  .targeting-icon {
    color: var(--admin-primary);
    margin-top: 2px;
  }
  .cta-box {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.15);
    padding: 14px 16px;
    border-radius: 12px;
    font-size: 13.5px;
  }
  .cta-box.cta-chat {
    background: rgba(16, 185, 129, 0.05);
    border: 1px solid rgba(16, 185, 129, 0.15);
  }
  .cta-icon {
    color: #3b82f6;
    margin-top: 2px;
  }
  .cta-link-anchor {
    color: #3b82f6;
    text-decoration: none;
    word-break: break-all;
    display: block;
    margin-top: 2px;
    font-weight: 500;
  }
  .cta-link-anchor:hover {
    text-decoration: underline;
  }
  .whatsapp-logo-bubble {
    background: #10b981;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 800;
    flex-shrink: 0;
  }
  .wa-message-preview {
    margin-top: 6px;
    background: white;
    border: 1px dashed rgba(0,0,0,0.08);
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12.5px;
    color: #555;
  }
  .audio-box {
    background: #f8f9fa;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.04);
    font-size: 13.5px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .audio-player-mini {
    width: 100%;
    height: 32px;
  }
  .modal-close-x {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--admin-muted);
    display: flex;
    align-items: center;
    padding: 0;
  }
  .modal-close-x:hover {
    color: var(--admin-text);
  }
`;

export default AdminAdsPaymentRecords;
