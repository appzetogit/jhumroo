import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminAuthService from '../../../services/adminAuthService';
import { BiLockAlt, BiEnvelope, BiErrorCircle, BiShow, BiHide } from 'react-icons/bi';
import logo from '../../../assets/loginPage/Logo.png';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await adminAuthService.login(email, password);
      if (response.success) {
        navigate('/admin/dashboard');
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-shell">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-logo" style={{ margin: '0 auto 20px', width: '64px', height: '64px' }}>
            <img src={logo} alt="Jhumroo Admin Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1>Jhumroo Admin</h1>
          <p>Please enter your credentials to access the console.</p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-input-group">
            <label>Email Address</label>
            <div className="admin-input-wrapper">
              <BiEnvelope className="input-icon" />
              <input
                type="email"
                placeholder="admin@jhumroo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="admin-input-group">
            <label>Password</label>
            <div className="admin-input-wrapper">
              <BiLockAlt className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <BiHide /> : <BiShow />}
              </button>
            </div>
          </div>

          {error && (
            <div className="admin-login-error">
              <BiErrorCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="admin-primary-btn login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>© 2026 Jhumroo Operations. All rights reserved.</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-login-shell {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fff8f9 0%, #fff2f4 48%, #ffffff 100%);
          font-family: 'Manrope', sans-serif;
        }
        .admin-login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(254, 44, 85, 0.1);
          border: 1px solid rgba(254, 44, 85, 0.1);
        }
        .admin-login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .admin-login-header h1 {
          font-size: 24px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 8px;
        }
        .admin-login-header p {
          font-size: 14px;
          color: #6b7280;
        }
        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .admin-input-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .admin-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: #9ca3af;
          font-size: 18px;
        }
        .admin-input-wrapper input {
          width: 100%;
          padding: 12px 42px 12px 42px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          font-size: 14px;
          color: #000;
          outline: none;
          transition: all 0.2s ease;
        }
        .password-toggle-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }
        .password-toggle-btn:hover {
          color: #4b5563;
        }
        .admin-input-wrapper input:focus {
          border-color: #fe2c55;
          box-shadow: 0 0 0 4px rgba(254, 44, 85, 0.08);
        }
        .admin-login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 10px;
          color: #dc2626;
          font-size: 13px;
        }
        .login-submit-btn {
          width: 100%;
          padding: 14px !important;
          font-size: 15px !important;
          margin-top: 10px;
          cursor: pointer;
        }
        .admin-login-footer {
          margin-top: 32px;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
        }
      `}} />
    </div>
  );
};

export default AdminLogin;
