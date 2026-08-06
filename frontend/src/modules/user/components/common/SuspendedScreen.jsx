import React from 'react';
import { BiBlock, BiErrorCircle, BiChevronRight } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

const SuspendedScreen = ({ reason }) => {
  const navigate = useNavigate();
  return (
    <div className="suspended-screen">
      <div className="suspended-content">
        <div className="suspended-icon">
          <BiBlock size={64} color="#ef4444" />
        </div>
        <h1>Account Suspended</h1>
        <p className="suspended-message">
          Your account has been suspended for violating our community guidelines.
        </p>
        
        {reason && (
          <div className="reason-box">
            <p className="reason-label">Reason:</p>
            <p className="reason-text">{reason}</p>
          </div>
        )}

        <button type="button" className="contact-support" onClick={() => navigate('/settings/support')}>
          <BiErrorCircle size={18} />
          <span>If you think this is a mistake, contact support</span>
          <BiChevronRight size={16} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .suspended-screen {
          width: 100vw;
          height: 100vh;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          font-family: 'Manrope', sans-serif;
        }
        .suspended-content {
          text-align: center;
          max-width: 400px;
        }
        .suspended-icon {
          margin-bottom: 24px;
          display: flex;
          justify-content: center;
        }
        .suspended-content h1 {
          font-size: 24px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 12px;
        }
        .suspended-message {
          font-size: 15px;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .reason-box {
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 32px;
          text-align: left;
        }
        .reason-label {
          font-size: 13px;
          font-weight: 700;
          color: #991b1b;
          margin-bottom: 4px;
        }
        .reason-text {
          font-size: 14px;
          color: #b91c1c;
        }
        .contact-support {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
          color: #2563eb;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          text-decoration: underline;
        }
      `}} />
    </div>
  );
};

export default SuspendedScreen;
