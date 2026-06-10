import React, { useState, useEffect } from 'react';
import { BiCreditCard, BiSave, BiRefresh } from 'react-icons/bi';
import adService from '../../../services/adService';

const AdminAdsPaymentSetup = () => {
  const [shopPricePerDay, setShopPricePerDay] = useState('');
  const [chatPricePerDay, setChatPricePerDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const response = await adService.getPricingAdmin();
      if (response.success && response.pricing) {
        setShopPricePerDay(response.pricing.shopPricePerDay ?? response.pricing.shopPrice ?? '');
        setChatPricePerDay(response.pricing.chatPricePerDay ?? response.pricing.chatPrice ?? '');
      }
    } catch (error) {
      console.error('Error fetching ads pricing:', error);
      setMessage({ text: 'Failed to load pricing configuration.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    const shopNum = parseFloat(shopPricePerDay);
    const chatNum = parseFloat(chatPricePerDay);

    if (isNaN(shopNum) || shopNum < 0 || isNaN(chatNum) || chatNum < 0) {
      setMessage({ text: 'Please enter valid positive numbers for both prices.', type: 'error' });
      setSaving(false);
      return;
    }

    try {
      const response = await adService.updatePricingAdmin({
        shopPricePerDay: shopNum,
        chatPricePerDay: chatNum
      });
      if (response.success) {
        setMessage({ text: 'Ads payment settings saved successfully!', type: 'success' });
        if (response.pricing) {
          setShopPricePerDay(response.pricing.shopPricePerDay);
          setChatPricePerDay(response.pricing.chatPricePerDay);
        }
      }
    } catch (error) {
      console.error('Error updating ads pricing:', error);
      setMessage({ text: error.response?.data?.message || 'Failed to update pricing settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page admin-loading">
        <div className="admin-loader"></div>
        <p>Loading advertisement payment settings...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Ads Payment Setup</h1>
          <p>Configure the per-day pricing (in INR) charged to users per advertisement category.</p>
        </div>
        <button className="admin-secondary-btn" onClick={fetchPricing} disabled={saving}>
          <BiRefresh size={20} /> Reload
        </button>
      </div>

      <div className="admin-section" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSave} className="admin-card ads-payment-card">
          <div className="ads-payment-icon-header">
            <div className="ads-payment-icon-wrapper">
              <BiCreditCard size={32} />
            </div>
            <div>
              <h3>Ads Pricing Configurations</h3>
              <p>Set the per-day rate charged to users. Users select a date range and pay <strong>days × rate</strong>.</p>
            </div>
          </div>

          <div className="ads-payment-fields">
            <div className="input-group">
              <label>Shop Ad Price Per Day (₹/day)</label>
              <div className="price-input-wrapper">
                <span className="currency-symbol">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shopPricePerDay}
                  onChange={(e) => setShopPricePerDay(e.target.value)}
                  placeholder="e.g. 200"
                  required
                />
              </div>
              <span className="field-hint">Charge per day for Shop (link) ads. Example: 7 days × ₹{shopPricePerDay || 200} = ₹{Math.round((shopPricePerDay || 200) * 7)} total.</span>
            </div>

            <div className="input-group">
              <label>Chat Ad Price Per Day (₹/day)</label>
              <div className="price-input-wrapper">
                <span className="currency-symbol">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={chatPricePerDay}
                  onChange={(e) => setChatPricePerDay(e.target.value)}
                  placeholder="e.g. 400"
                  required
                />
              </div>
              <span className="field-hint">Charge per day for Chat (WhatsApp) ads. Example: 7 days × ₹{chatPricePerDay || 400} = ₹{Math.round((chatPricePerDay || 400) * 7)} total.</span>
            </div>

            {/* Live Preview */}
            {(shopPricePerDay || chatPricePerDay) && (
              <div className="pricing-preview">
                <p className="preview-title">💡 Pricing Preview (for 7-day campaign)</p>
                <div className="preview-row">
                  <span>Shop Ad (7 days)</span>
                  <span className="preview-amount">₹{Math.round((parseFloat(shopPricePerDay) || 0) * 7)}</span>
                </div>
                <div className="preview-row">
                  <span>Chat Ad (7 days)</span>
                  <span className="preview-amount">₹{Math.round((parseFloat(chatPricePerDay) || 0) * 7)}</span>
                </div>
              </div>
            )}
          </div>

          {message.text && (
            <div className={`admin-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message.text}
            </div>
          )}

          <div className="ads-payment-actions">
            <button type="submit" className="admin-primary-btn" disabled={saving}>
              <BiSave size={20} /> {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .ads-payment-card {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .ads-payment-icon-header {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          border-b: 1px solid var(--admin-border);
          padding-bottom: 1.25rem;
        }
        .ads-payment-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(254, 44, 85, 0.08);
          color: var(--admin-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ads-payment-icon-header h3 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .ads-payment-icon-header p {
          font-size: 13px;
          color: var(--admin-muted);
        }
        .ads-payment-fields {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .price-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .currency-symbol {
          position: absolute;
          left: 14px;
          font-size: 16px;
          font-weight: 700;
          color: var(--admin-text);
        }
        .price-input-wrapper input {
          width: 100%;
          padding: 12px 14px 12px 32px;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 10px;
          font-size: 15px;
          background: white;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .price-input-wrapper input:focus {
          border-color: var(--admin-primary);
          box-shadow: 0 0 0 4px rgba(254, 44, 85, 0.08);
        }
        .field-hint {
          font-size: 12px;
          color: var(--admin-muted);
          margin-top: 4px;
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
        .ads-payment-actions {
          display: flex;
          justify-content: flex-end;
        }
        .pricing-preview {
          background: rgba(254, 44, 85, 0.04);
          border: 1px solid rgba(254, 44, 85, 0.15);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .preview-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--admin-muted);
          margin-bottom: 4px;
        }
        .preview-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--admin-text);
        }
        .preview-amount {
          font-weight: 700;
          color: var(--admin-primary);
        }
      `}</style>
    </div>
  );
};

export default AdminAdsPaymentSetup;
