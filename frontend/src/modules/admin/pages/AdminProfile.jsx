import React, { useState } from 'react';
import { BiUser, BiLockAlt, BiLogOut, BiCheckCircle, BiShow, BiHide } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import adminAuthService from '../../../services/adminAuthService';

const AdminProfile = () => {
  const adminUser = adminAuthService.getAdminUser();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await adminAuthService.changePassword(currentPassword, newPassword);
      if (response.success) {
        setSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(response.message || 'Failed to update password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await adminAuthService.logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Admin Profile</h1>
          <p>Manage your account settings and security.</p>
        </div>
        <button 
          type="button" 
          className="admin-secondary-btn logout-btn" 
          onClick={handleLogout}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            color: '#dc2626',
            borderColor: 'rgba(220, 38, 38, 0.2)'
          }}
        >
          <BiLogOut size={18} />
          Logout
        </button>
      </div>

      <div className="admin-columns">
        <div className="admin-card admin-column">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="admin-profile-initial" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                {adminUser?.fullName?.split(' ').map(n => n[0]).join('') || 'AD'}
              </div>
              <div>
                <h2>{adminUser?.fullName || 'Super Admin'}</h2>
                <p style={{ margin: 0 }}>{adminUser?.email || 'admin'}</p>
              </div>
            </div>
          </div>
          <div className="admin-form-grid" style={{ marginTop: '20px' }}>
            <label>
              Full Name
              <input value={adminUser?.fullName || ''} readOnly disabled />
            </label>
            <label>
              Email Address
              <input value={adminUser?.email || ''} readOnly disabled />
            </label>
            <label>
              Role
              <input value="Super Admin" readOnly disabled />
            </label>
          </div>
        </div>

        <div className="admin-card admin-column">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BiLockAlt size={20} color="var(--admin-primary)" />
              <h2>Change Password</h2>
            </div>
            <p>Ensure your account is using a long, random password to stay secure.</p>
          </div>
          
          <form onSubmit={handlePasswordChange} className="admin-form-grid" style={{ marginTop: '20px' }}>
            <label>
              Current Password
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input 
                  type={showCurrentPassword ? "text" : "password"} 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '35px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--admin-muted)',
                    padding: '4px',
                  }}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <BiHide size={18} /> : <BiShow size={18} />}
                </button>
              </div>
            </label>
            <label>
              New Password
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '35px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--admin-muted)',
                    padding: '4px',
                  }}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <BiHide size={18} /> : <BiShow size={18} />}
                </button>
              </div>
            </label>
            <label>
              Confirm New Password
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '35px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--admin-muted)',
                    padding: '4px',
                  }}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <BiHide size={18} /> : <BiShow size={18} />}
                </button>
              </div>
            </label>

            {error && <p className="admin-error" style={{ margin: '8px 0' }}>{error}</p>}
            {success && (
              <p className="admin-success" style={{ margin: '8px 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <BiCheckCircle /> {success}
              </p>
            )}

            <button 
              type="submit" 
              className="admin-primary-btn" 
              disabled={isUpdating}
              style={{ marginTop: '10px' }}
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
