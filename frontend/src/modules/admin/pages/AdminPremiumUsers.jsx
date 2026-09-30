import React, { useState, useEffect } from 'react';
import { 
  BiCrown, 
  BiSave, 
  BiRefresh, 
  BiSearch, 
  BiCalendar, 
  BiCheckCircle, 
  BiTime, 
  BiMoney, 
  BiUserCheck,
  BiTrash,
  BiX,
  BiErrorCircle
} from 'react-icons/bi';
import premiumService from '../../../services/premiumService';

const AdminPremiumUsers = () => {
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceMessage, setPriceMessage] = useState({ text: '', type: '' });
  const [selectedSubForDelete, setSelectedSubForDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({
    activeSubscribers: 0,
    totalActiveUsers: 0,
    totalRevenue: 0,
    totalRecords: 0
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchPricing();
    fetchSubscriptions();
  }, [filterStatus]);

  const fetchPricing = async () => {
    try {
      const res = await premiumService.getPricingAdmin();
      if (res.success && res.pricing) {
        setMonthlyPrice(res.pricing.monthlyPrice);
      }
    } catch (err) {
      console.error('Error fetching premium pricing:', err);
    }
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await premiumService.getPremiumUsersAdmin({
        search,
        status: filterStatus
      });
      if (res.success) {
        setSubscriptions(res.users || []);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching premium users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    setSavingPrice(true);
    setPriceMessage({ text: '', type: '' });

    const num = parseFloat(monthlyPrice);
    if (isNaN(num) || num <= 0) {
      setPriceMessage({ text: 'Please enter a valid positive price in INR.', type: 'error' });
      setSavingPrice(false);
      return;
    }

    try {
      const res = await premiumService.updatePricingAdmin({ monthlyPrice: num });
      if (res.success) {
        setPriceMessage({ text: 'Premium monthly price updated successfully!', type: 'success' });
        if (res.pricing?.monthlyPrice) {
          setMonthlyPrice(res.pricing.monthlyPrice);
        }
      }
    } catch (err) {
      console.error('Failed to update premium price:', err);
      setPriceMessage({ 
        text: err.response?.data?.message || 'Failed to update pricing.', 
        type: 'error' 
      });
    } finally {
      setSavingPrice(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSubscriptions();
  };

  const handleConfirmDelete = async () => {
    if (!selectedSubForDelete) return;
    setDeleting(true);
    setActionMessage({ text: '', type: '' });
    try {
      const res = await premiumService.deleteSubscriptionAdmin(selectedSubForDelete._id);
      if (res.success) {
        setActionMessage({ text: 'Subscription deleted successfully!', type: 'success' });
        setSelectedSubForDelete(null);
        await fetchSubscriptions();
        setTimeout(() => setActionMessage({ text: '', type: '' }), 4500);
      } else {
        setActionMessage({ text: res.message || 'Failed to delete subscription.', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to delete subscription:', err);
      setActionMessage({
        text: err.response?.data?.message || err.message || 'Failed to delete subscription.',
        type: 'error'
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0 }}>Premium Users Management</h1>
            <span className="premium-crown-badge">
              <BiCrown size={18} /> ELITE
            </span>
          </div>
          <p>Configure subscription pricing per month and view all active and historical premium users.</p>
        </div>
        <button 
          className="admin-secondary-btn" 
          onClick={() => { fetchPricing(); fetchSubscriptions(); }} 
          disabled={loading || savingPrice}
        >
          <BiRefresh size={20} /> Reload
        </button>
      </div>

      {actionMessage.text && (
        <div className={`price-alert ${actionMessage.type}`} style={{ marginBottom: '1.25rem', padding: '10px 14px' }}>
          {actionMessage.type === 'success' ? <BiCheckCircle size={18} /> : <BiErrorCircle size={18} />}
          <span style={{ fontSize: '13px' }}>{actionMessage.text}</span>
        </div>
      )}

      {/* Top Grid: Pricing Config Card + Quick Stats */}
      <div className="premium-top-grid">
        {/* Price Configuration Form */}
        <div className="admin-card premium-price-card">
          <div className="card-header-styled">
            <div className="card-header-icon">
              <BiMoney size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Monthly Subscription Price</h3>
              <p style={{ margin: '1px 0 0 0', fontSize: '12px', color: 'var(--admin-muted)' }}>
                Set the price charged to users per month (30 days validity).
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePrice} className="price-form-inline">
            <div className="price-input-group">
              <span className="currency-prefix">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                placeholder="199"
                required
                className="admin-input price-input"
              />
              <span className="per-month-tag">/ month</span>
            </div>

            <button 
              type="submit" 
              className="admin-primary-btn save-price-btn" 
              disabled={savingPrice}
            >
              <BiSave size={16} />
              <span>{savingPrice ? 'Saving...' : 'Update Price'}</span>
            </button>
          </form>

          {priceMessage.text && (
            <div className={`price-alert ${priceMessage.type}`}>
              {priceMessage.type === 'success' ? <BiCheckCircle size={15} /> : null}
              <span>{priceMessage.text}</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="premium-stats-cards">
          <div className="admin-card p-stat-box">
            <div className="p-stat-icon-wrap active-users-icon">
              <BiUserCheck size={18} />
            </div>
            <div className="p-stat-info">
              <span className="p-stat-label">Active Subscribers</span>
              <strong className="p-stat-val">{stats.activeSubscribers}</strong>
            </div>
          </div>

          <div className="admin-card p-stat-box">
            <div className="p-stat-icon-wrap total-rev-icon">
              <BiMoney size={18} />
            </div>
            <div className="p-stat-info">
              <span className="p-stat-label">Total Revenue</span>
              <strong className="p-stat-val">₹{stats.totalRevenue.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="admin-card p-stat-box">
            <div className="p-stat-icon-wrap plan-price-icon">
              <BiCrown size={18} />
            </div>
            <div className="p-stat-info">
              <span className="p-stat-label">Current Plan</span>
              <strong className="p-stat-val">₹{monthlyPrice || '199'}/mo</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Table Section */}
      <div className="admin-section">
        <div className="table-controls-bar">
          {/* Status Filters */}
          <div className="filter-pill-group">
            {[
              { id: 'all', label: 'All Subscriptions' },
              { id: 'active', label: 'Active Members' },
              { id: 'expired', label: 'Expired' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`filter-pill-btn ${filterStatus === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="search-form-inline">
            <div className="search-input-wrap">
              <BiSearch size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, username, phone, or payment ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-input search-input"
              />
            </div>
            <button type="submit" className="admin-secondary-btn">
              Search
            </button>
          </form>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="admin-card admin-loading" style={{ minHeight: '260px' }}>
            <div className="admin-loader"></div>
            <p>Loading premium subscribers...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="admin-card empty-premium-card">
            <div className="empty-crown-icon">
              <BiCrown size={48} />
            </div>
            <h3>No Premium Subscribers Found</h3>
            <p>
              {search 
                ? `No subscriptions match your search "${search}".` 
                : 'No users have purchased a premium subscription yet.'}
            </p>
          </div>
        ) : (
          <div className="admin-card table-responsive" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="premium-users-table">
              <thead>
                <tr>
                  <th>Subscriber</th>
                  <th>Contact Info</th>
                  <th>Plan & Validity</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Razorpay Details</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const user = sub.user;
                  const startDateStr = new Date(sub.startDate || sub.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  const endDateStr = new Date(sub.endDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  const isExpired = new Date(sub.endDate) <= new Date() || sub.status === 'expired';
                  const daysRemaining = Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)));

                  return (
                    <tr key={sub._id}>
                      {/* Subscriber details */}
                      <td>
                        {user ? (
                          <div className="table-user-cell">
                            <div className="table-avatar">
                              <img
                                src={
                                  user.profilePicture?.url ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'user'}`
                                }
                                alt={user.username || 'User'}
                              />
                            </div>
                            <div className="table-user-info">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <strong>{user.fullName || user.username}</strong>
                                {user.isVerified && (
                                  <span title="Verified" style={{ color: '#0ea5e9', fontSize: '13px' }}>✓</span>
                                )}
                              </div>
                              <span>@{user.username || 'anonymous'}</span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--admin-muted)' }}>Deleted User</span>
                        )}
                      </td>

                      {/* Contact details */}
                      <td>
                        <div className="contact-cell">
                          {user?.phoneNumber && <div>📞 {user.phoneNumber}</div>}
                          {user?.email && <div style={{ color: 'var(--admin-muted)', fontSize: '12px' }}>✉️ {user.email}</div>}
                          {!user?.phoneNumber && !user?.email && <span style={{ color: 'var(--admin-muted)' }}>N/A</span>}
                        </div>
                      </td>

                      {/* Plan & Dates */}
                      <td>
                        <div className="plan-date-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600 }}>
                            <BiCalendar size={15} style={{ color: 'var(--admin-muted)' }} />
                            <span>{startDateStr} &rarr; {endDateStr}</span>
                          </div>
                          {!isExpired ? (
                            <span className="days-left-tag">
                              <BiTime size={13} /> {daysRemaining} days left
                            </span>
                          ) : (
                            <span className="days-expired-tag">Ended on {endDateStr}</span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td>
                        <strong className="premium-amount-tag">₹{sub.amount}</strong>
                      </td>

                      {/* Status */}
                      <td>
                        {!isExpired ? (
                          <span className="status-badge active-badge">
                            <span className="dot animate-ping" />
                            Active
                          </span>
                        ) : (
                          <span className="status-badge expired-badge">
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Razorpay transaction details */}
                      <td>
                        <div className="razorpay-ids">
                          <div>
                            <span className="id-label">Order:</span>{' '}
                            <span className="id-val">{sub.razorpayOrderId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="id-label">Payment:</span>{' '}
                            <span className="id-val">{sub.razorpayPaymentId || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="delete-sub-btn"
                          title="Delete Subscription"
                          onClick={() => setSelectedSubForDelete(sub)}
                        >
                          <BiTrash size={15} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {selectedSubForDelete && (
        <div className="admin-modal-overlay" onClick={() => !deleting && setSelectedSubForDelete(null)}>
          <div 
            className="admin-modal" 
            style={{ maxWidth: '490px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <BiTrash size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Delete Subscription</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--admin-muted)' }}>
                    Confirm deletion of this user's subscription record
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => !deleting && setSelectedSubForDelete(null)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--admin-muted)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <BiX size={22} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Subscriber:</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                  {selectedSubForDelete.user?.fullName || selectedSubForDelete.user?.username || 'Deleted User'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Amount:</span>
                <strong style={{ fontSize: '13px', color: '#f59e0b' }}>₹{selectedSubForDelete.amount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Order ID:</span>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#334155' }}>
                  {selectedSubForDelete.razorpayOrderId || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Status:</span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  textTransform: 'uppercase',
                  color: selectedSubForDelete.status === 'active' ? '#10b981' : '#64748b'
                }}>
                  {selectedSubForDelete.status}
                </span>
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '20px',
              fontSize: '12.5px',
              color: '#dc2626',
              lineHeight: 1.5
            }}>
              <strong>Warning:</strong> Deleting this subscription will permanently delete this record from the database. If this subscription is currently active, the user's Premium Elite badge and benefits will be revoked immediately unless they have another active plan.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => setSelectedSubForDelete(null)}
                disabled={deleting}
                style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                  opacity: deleting ? 0.7 : 1
                }}
              >
                <BiTrash size={16} />
                {deleting ? 'Deleting...' : 'Delete Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS Styles */}
      <style>{`
        .premium-crown-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(236, 72, 153, 0.2));
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.4);
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .premium-top-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 0.85rem;
          margin-bottom: 1.25rem;
          align-items: stretch;
        }

        @media (max-width: 900px) {
          .premium-top-grid {
            grid-template-columns: 1fr;
          }
        }

        .premium-price-card {
          padding: 1rem 1.25rem !important;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.75rem;
        }

        .card-header-styled {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0;
        }

        .card-header-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .price-form-inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
        }

        .price-input-group {
          display: flex;
          align-items: center;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 9px;
          padding: 2px 10px;
          flex: 1;
          height: 38px;
          transition: border-color 0.2s;
        }

        .price-input-group:focus-within {
          border-color: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.15);
        }

        .currency-prefix {
          font-size: 15px;
          font-weight: 700;
          color: #f59e0b;
          margin-right: 4px;
        }

        .price-input {
          border: none !important;
          background: transparent !important;
          font-size: 15px !important;
          font-weight: 700 !important;
          padding: 2px 0 !important;
          color: #0f172a !important;
          box-shadow: none !important;
          width: 100%;
          height: 100% !important;
        }

        .per-month-tag {
          font-size: 12px;
          font-weight: 600;
          color: var(--admin-muted);
          white-space: nowrap;
        }

        .price-alert {
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .price-alert.success {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .price-alert.error {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .save-price-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 14px !important;
          height: 38px;
          border-radius: 9px !important;
          background: linear-gradient(135deg, #f59e0b, #d97706) !important;
          color: #ffffff !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          white-space: nowrap;
          cursor: pointer;
        }

        .premium-stats-cards {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          justify-content: center;
        }

        .p-stat-box {
          padding: 0.5rem 0.85rem !important;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-height: auto !important;
        }

        .p-stat-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .active-users-icon {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }

        .total-rev-icon {
          background: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
        }

        .plan-price-icon {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
        }

        .p-stat-info {
          display: flex;
          flex-direction: column;
        }

        .p-stat-label {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--admin-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1.2;
        }

        .p-stat-val {
          font-size: 15px;
          font-weight: 800;
          color: var(--admin-strong);
          line-height: 1.2;
        }

        .table-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .filter-pill-group {
          display: flex;
          gap: 6px;
        }

        .filter-pill-btn {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          background: #f1f5f9;
          color: var(--admin-muted);
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-pill-btn.active {
          background: #0f172a;
          color: #ffffff;
        }

        .search-form-inline {
          display: flex;
          gap: 8px;
          flex: 1;
          max-width: 480px;
        }

        .search-input-wrap {
          position: relative;
          flex: 1;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--admin-muted);
        }

        .search-input {
          padding-left: 36px !important;
          font-size: 13px !important;
        }

        .empty-premium-card {
          text-align: center;
          padding: 3rem 1.5rem;
        }

        .empty-crown-icon {
          color: #d1d5db;
          margin-bottom: 0.5rem;
        }

        .premium-users-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .premium-users-table th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--admin-muted);
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }

        .premium-users-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .table-user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .table-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          overflow: hidden;
          background: #e2e8f0;
          flex-shrink: 0;
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

        .table-user-info span {
          font-size: 12px;
          color: var(--admin-muted);
        }

        .contact-cell {
          font-size: 12.5px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .plan-date-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .days-left-tag {
          font-size: 11.5px;
          font-weight: 700;
          color: #10b981;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .days-expired-tag {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--admin-muted);
        }

        .premium-amount-tag {
          color: #f59e0b;
          font-size: 15px;
          font-weight: 800;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-badge.active-badge {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }

        .status-badge.active-badge .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
        }

        .status-badge.expired-badge {
          background: rgba(100, 116, 139, 0.12);
          color: #64748b;
        }

        .razorpay-ids {
          font-size: 11px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .id-label {
          color: var(--admin-muted);
          font-weight: 600;
        }

        .id-val {
          font-family: monospace;
          color: var(--admin-text);
        }

        .delete-sub-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.25);
          background: rgba(239, 68, 68, 0.08);
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .delete-sub-btn:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
};

export default AdminPremiumUsers;
