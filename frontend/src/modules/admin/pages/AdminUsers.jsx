import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiCheckCircle, BiEdit, BiTrash, BiBlock, BiRefresh, BiShow, BiXCircle, BiSearch, BiX } from 'react-icons/bi';
import adminUserService from '../../../services/adminUserService';
import adminInterestService from '../../../services/adminInterestService';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeUser, setActiveUser] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showInterestsSelector, setShowInterestsSelector] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchUsers = async (searchVal = searchTerm) => {
    setLoading(true);
    try {
      const response = await adminUserService.getAllUsers({ search: searchVal, isActive: true });
      if (response.success) {
        setUsers((response.users || []).filter(u => u.isActive !== false));
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
         !user.isActive ? 'Inactive' : user.isBanned ? 'Suspended' : 'Active',
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

  const openEditor = async (user) => {
    setActiveUser(user);
    setDraft({ ...user });
    try {
      const res = await adminInterestService.getInterests();
      if (res.success) {
        setAvailableCategories(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching available interests:', err);
    }
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

    if (draft?.fullName && draft.fullName.trim() !== '') {
      const nameRegex = /^[a-zA-Z\s.'\-]+$/;
      if (!nameRegex.test(draft.fullName)) {
        setError('Full name can only contain letters, spaces, dots, hyphens, and apostrophes');
        return;
      }
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'var(--admin-surface)', 
            border: '1px solid var(--admin-border)', 
            borderRadius: '12px', 
            padding: '8px 14px', 
            width: '260px', 
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)' 
          }}>
            <BiSearch size={18} style={{ color: 'var(--admin-muted)' }} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                border: 'none', 
                outline: 'none', 
                width: '100%', 
                fontSize: '13px', 
                background: 'transparent',
                color: 'var(--admin-text)'
              }}
            />
          </div>
          <button type="button" className="admin-secondary-btn" onClick={() => fetchUsers(searchTerm)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
              <div>User</div>
              <div>Phone</div>
              <div style={{ textAlign: 'center' }}>Followers</div>
              <div style={{ textAlign: 'center' }}>Following</div>
              <div style={{ textAlign: 'center' }}>Likes</div>
              <div style={{ textAlign: 'center' }}>Status</div>
              <div style={{ textAlign: 'center' }}>Verified</div>
              <div style={{ textAlign: 'center' }}>Actions</div>
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
                  <div style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {user.phoneNumber ? `${user.countryCode || '+91'} ${user.phoneNumber}` : '-'}
                  </div>
                  <div style={{ fontSize: '13px', textAlign: 'center' }}>{user.stats?.followersCount || 0}</div>
                  <div style={{ fontSize: '13px', textAlign: 'center' }}>{user.stats?.followingCount || 0}</div>
                  <div style={{ fontSize: '13px', textAlign: 'center' }}>{user.stats?.likesCount || 0}</div>
                  <div className="admin-status" style={{ 
                    color: !user.isActive ? '#9ca3af' : user.isBanned ? '#ef4444' : '#10b981',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    {!user.isActive ? <BiXCircle size={14} /> : user.isBanned ? <BiBlock size={14} /> : <BiCheckCircle size={14} />}
                    {!user.isActive ? 'Inactive' : user.isBanned ? 'Banned' : 'Active'}
                  </div>
                  <div 
                    onClick={() => user.isActive && handleToggleVerify(user._id)}
                    style={{ 
                      cursor: user.isActive ? 'pointer' : 'default', 
                      color: !user.isActive ? 'rgba(255,255,255,0.1)' : user.isVerified ? '#3b82f6' : '#9ca3af',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <BiCheckCircle size={18} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      type="button" 
                      onClick={() => navigate(`/admin/users/${user._id}`)} 
                      className="admin-icon-btn" 
                      title="View Profile Details"
                    >
                      <BiShow size={18} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleToggleBan(user._id)} 
                      className="admin-icon-btn" 
                      style={{ color: user.isBanned ? '#10b981' : '#f59e0b', opacity: !user.isActive ? 0.4 : 1 }}
                      title={user.isBanned ? 'Unsuspend User' : 'Suspend User'}
                      disabled={!user.isActive}
                    >
                      <BiBlock size={16} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => openEditor(user)} 
                      className="admin-icon-btn"
                      style={{ opacity: !user.isActive ? 0.4 : 1 }}
                      disabled={!user.isActive}
                    >
                      <BiEdit size={16} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDelete(user._id)} 
                      className="admin-icon-btn" 
                      style={{ color: '#ef4444', opacity: !user.isActive ? 0.4 : 1 }}
                      disabled={!user.isActive}
                    >
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Interests</label>
                  <button
                    type="button"
                    onClick={() => setShowInterestsSelector(true)}
                    className="admin-secondary-btn"
                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    Select from Categories
                  </button>
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px', 
                  padding: '12px', 
                  background: 'var(--admin-surface)', 
                  border: '1px solid var(--admin-border)', 
                  borderRadius: '12px',
                  minHeight: '48px'
                }}>
                  {draft.interests && draft.interests.length > 0 ? (
                    draft.interests.map((interest) => (
                      <span 
                        key={interest} 
                        style={{ 
                          background: 'rgba(254, 44, 85, 0.08)', 
                          color: 'var(--admin-primary)', 
                          padding: '4px 10px', 
                          borderRadius: '999px', 
                          fontSize: '12px', 
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {interest}
                        <BiX 
                          size={14} 
                          style={{ cursor: 'pointer' }} 
                          onClick={() => setDraft(prev => ({
                            ...prev,
                            interests: prev.interests.filter(i => i !== interest)
                          }))}
                        />
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No interests selected. Click button to add.</span>
                  )}
                </div>
              </div>
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

      {/* Interests Checklist Selector Modal */}
      {showInterestsSelector && (
        <div className="admin-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="admin-modal" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="admin-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
              <h2 className="admin-modal-title" style={{ fontSize: '18px', fontWeight: 'bold' }}>Select Interests</h2>
              <button 
                type="button" 
                onClick={() => setShowInterestsSelector(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <BiX size={24} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="admin-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
              {availableCategories.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
                  No interest categories found in database. Create them in Interests tab first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {availableCategories.map((category) => (
                    <div key={category._id} style={{ borderBottom: '1px solid rgba(254, 44, 85, 0.05)', paddingBottom: '16px' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', color: 'var(--admin-primary)' }}>
                        <span>{category.icon}</span>
                        <span>{category.category}</span>
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {category.items.map((item) => {
                          const isChecked = draft.interests && draft.interests.includes(item);
                          return (
                            <label 
                              key={item} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                background: isChecked ? 'rgba(254, 44, 85, 0.08)' : '#f9fafb', 
                                border: isChecked ? '1px solid var(--admin-primary)' : '1px solid #e5e7eb',
                                borderRadius: '8px', 
                                padding: '6px 12px', 
                                fontSize: '13px', 
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input 
                                type="checkbox" 
                                checked={isChecked || false}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setDraft(prev => ({
                                      ...prev,
                                      interests: [...(prev.interests || []), item]
                                    }));
                                  } else {
                                    setDraft(prev => ({
                                      ...prev,
                                      interests: (prev.interests || []).filter(i => i !== item)
                                    }));
                                  }
                                }}
                                style={{ accentColor: 'var(--admin-primary)' }}
                              />
                              <span style={{ color: isChecked ? 'var(--admin-primary)' : 'var(--admin-text)', fontWeight: isChecked ? '600' : 'normal' }}>
                                {item}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="admin-modal-footer" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                className="admin-primary-btn" 
                onClick={() => setShowInterestsSelector(false)}
                style={{ padding: '8px 20px', borderRadius: '10px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-table-head--users, .admin-table-row--users {
          grid-template-columns: 2fr 1fr 0.8fr 0.8fr 0.8fr 1fr 0.8fr 1fr !important;
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
