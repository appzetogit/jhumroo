import React, { useState, useEffect } from 'react';
import { BiCheckCircle, BiEdit, BiTrash, BiBlock, BiRefresh } from 'react-icons/bi';
import adminUserService from '../../../services/adminUserService';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeUser, setActiveUser] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminUserService.getAllUsers();
      if (response.success) {
        setUsers(response.users);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      if (!users || users.length === 0) {
        alert('No users to export');
        return;
      }

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Jhumroo User List', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      // Prepare data
      const tableData = users.map(user => [
        user.fullName || 'No Name',
        `@${user.username}`,
        user.phoneNumber || '-',
        user.stats?.followersCount || 0,
        user.stats?.followingCount || 0,
        user.stats?.likesCount || 0,
        user.isBanned ? 'Suspended' : 'Active',
        user.isVerified ? 'Yes' : 'No'
      ]);

      // Add table using the plugin
      autoTable(doc, {
        startY: 40,
        head: [['Full Name', 'Username', 'Phone', 'Followers', 'Following', 'Likes', 'Status', 'Verified']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [255, 75, 110] }, 
        styles: { fontSize: 8 },
        margin: { top: 40 }
      });

      // Save PDF
      doc.save(`jhumroo_users_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('Failed to generate PDF. Please check console for details.');
    }
  };

  const openEditor = (user) => {
    setActiveUser(user);
    setDraft({ ...user });
  };

  const closeEditor = () => {
    setActiveUser(null);
    setDraft(null);
    setError('');
  };

  const handleSave = async () => {
    if (!draft?.username) {
      setError('Username is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await adminUserService.updateUser(activeUser._id, draft);
      if (response.success) {
        setUsers(users.map(u => u._id === activeUser._id ? response.user : u));
        closeEditor();
      } else {
        setError(response.message || 'Failed to update user');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const response = await adminUserService.deleteUser(id);
        if (response.success) {
          setUsers(users.filter(u => u._id !== id));
        }
      } catch (err) {
        alert('Failed to delete user');
      }
    }
  };

  const handleToggleBan = async (id) => {
    const user = users.find(u => u._id === id);
    const isSuspending = !user.isBanned;
    
    let reason = '';
    if (isSuspending) {
      reason = window.prompt('Enter reason for suspension:', 'Violation of community guidelines');
      if (reason === null) return; // Cancelled
    }

    try {
      const response = await adminUserService.banUser(id, { reason });
      if (response.success) {
        setUsers(users.map(u => u._id === id ? response.user : u));
      }
    } catch (err) {
      alert('Failed to update suspension status');
    }
  };

  const handleToggleVerify = async (id) => {
    try {
      const response = await adminUserService.verifyUser(id);
      if (response.success) {
        setUsers(users.map(u => u._id === id ? response.user : u));
      }
    } catch (err) {
      alert('Failed to update verification status');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Users</h1>
          <p>Manage creator profiles, saved reels, and profile stats.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="admin-secondary-btn" onClick={fetchUsers}>
            <BiRefresh size={18} /> Refresh
          </button>
          <button type="button" className="admin-secondary-btn" onClick={handleExport}>
            Export user list
          </button>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading users...</div>
        ) : error && users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>
        ) : (
          <div className="admin-table">
            <div className="admin-table-head admin-table-head--users">
              <span>User</span>
              <span>Phone</span>
              <span>Followers</span>
              <span>Following</span>
              <span>Likes</span>
              <span>Status</span>
              <span>Verified</span>
              <span>Actions</span>
            </div>
            {users.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No users found in database</div>
            ) : (
              users.map((user) => (
                <div key={user._id} className="admin-table-row admin-table-row--users">
                  <div className="admin-user-cell">
                    <div className="admin-avatar">
                      {user.profilePicture?.url ? (
                        <img src={user.profilePicture.url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                      ) : (
                        user.fullName?.charAt(0) || 'U'
                      )}
                    </div>
                    <div>
                      <p className="admin-user-name">{user.fullName || 'No Name'}</p>
                      <p className="admin-user-handle">@{user.username}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {user.phoneNumber ? `${user.countryCode || '+91'} ${user.phoneNumber}` : '-'}
                  </span>
                  <span style={{ fontSize: '13px' }}>{user.stats?.followersCount || 0}</span>
                  <span style={{ fontSize: '13px' }}>{user.stats?.followingCount || 0}</span>
                  <span style={{ fontSize: '13px' }}>{user.stats?.likesCount || 0}</span>
                  <span className="admin-status" style={{ color: user.isBanned ? '#ef4444' : '#10b981' }}>
                    {user.isBanned ? <BiBlock size={14} /> : <BiCheckCircle size={14} />}
                    {user.isBanned ? 'Banned' : 'Active'}
                  </span>
                  <span 
                    onClick={() => handleToggleVerify(user._id)}
                    style={{ cursor: 'pointer', color: user.isVerified ? '#3b82f6' : '#9ca3af' }}
                  >
                    <BiCheckCircle size={18} />
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => handleToggleBan(user._id)} 
                      className="admin-icon-btn" 
                      style={{ color: user.isBanned ? '#10b981' : '#f59e0b' }}
                      title={user.isBanned ? 'Unsuspend User' : 'Suspend User'}
                    >
                      <BiBlock size={16} />
                    </button>
                    <button type="button" onClick={() => openEditor(user)} className="admin-icon-btn">
                      <BiEdit size={16} />
                    </button>
                    <button type="button" onClick={() => handleDelete(user._id)} className="admin-icon-btn" style={{ color: '#ef4444' }}>
                      <BiTrash size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {activeUser && draft && (
        <div className="admin-modal-overlay" onClick={closeEditor}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Edit User</h2>
                <p>Update profile details for {draft.username}.</p>
              </div>
              <button type="button" className="admin-text-btn" onClick={closeEditor}>
                Close
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-grid">
                <label>
                  Full Name
                  <input
                    value={draft.fullName || ''}
                    onChange={(event) => setDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                  />
                </label>
                <label>
                  Username
                  <input
                    value={draft.username || ''}
                    onChange={(event) => setDraft((prev) => ({ ...prev, username: event.target.value }))}
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={draft.phoneNumber || ''}
                    readOnly
                    disabled
                  />
                </label>
              </div>
              <label className="admin-form-textarea">
                Bio
                <textarea
                  rows={2}
                  value={draft.bio || ''}
                  onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))}
                />
              </label>
              <label className="admin-form-textarea">
                Interests (comma separated)
                <textarea
                  rows={2}
                  value={draft.interests && Array.isArray(draft.interests) ? draft.interests.join(', ') : ''}
                  onChange={(event) => setDraft((prev) => ({ 
                    ...prev, 
                    interests: event.target.value.split(',').map(i => i.trim()).filter(i => i !== '') 
                  }))}
                  placeholder="e.g. Comedy, Music, Travel"
                />
              </label>
              {error && <p className="admin-error">{error}</p>}
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="admin-secondary-btn" onClick={closeEditor} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="admin-primary-btn" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-table-head--users, .admin-table-row--users {
          grid-template-columns: 2fr 1fr 0.8fr 0.8fr 0.8fr 1fr 0.8fr 1fr;
          align-items: center;
        }
        .admin-user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-avatar {
          width: 36px;
          height: 36px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #374151;
          flex-shrink: 0;
          overflow: hidden;
        }
        .admin-error {
          color: #ef4444;
          font-size: 13px;
          margin-top: 10px;
        }
      `}} />
    </div>
  );
};

export default AdminUsers;
