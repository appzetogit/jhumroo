import React, { useState, useEffect } from 'react';
import { 
  BiBookmark, 
  BiPlus, 
  BiTrash, 
  BiEditAlt, 
  BiSave, 
  BiX, 
  BiChevronRight,
  BiMove
} from 'react-icons/bi';
import adminInterestService from '../../../services/adminInterestService';

const AdminInterests = () => {
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ category: '', icon: '', items: '', order: 0 });
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    try {
      const response = await adminInterestService.getInterests();
      if (response.success) {
        setInterests(response.data);
      }
    } catch (error) {
      console.error('Error fetching interests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (interest) => {
    setEditingId(interest._id);
    setEditForm({
      category: interest.category,
      icon: interest.icon,
      items: interest.items.join(', '),
      order: interest.order
    });
  };

  const handleSave = async (id) => {
    try {
      const updatedData = {
        ...editForm,
        items: editForm.items.split(',').map(item => item.trim()).filter(Boolean)
      };
      const response = await adminInterestService.updateInterest(id, updatedData);
      if (response.success) {
        setInterests(interests.map(i => i._id === id ? response.data : i));
        setEditingId(null);
      }
    } catch (error) {
      alert('Failed to update interest');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await adminInterestService.deleteInterest(id);
      setInterests(interests.filter(i => i._id !== id));
    } catch (error) {
      alert('Failed to delete interest');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const newData = {
        ...editForm,
        items: editForm.items.split(',').map(item => item.trim()).filter(Boolean)
      };
      const response = await adminInterestService.createInterest(newData);
      if (response.success) {
        setInterests([...interests, response.data]);
        setShowAddModal(false);
        setEditForm({ category: '', icon: '🎭', items: '', order: 0 });
      }
    } catch (error) {
      alert('Failed to create interest');
    }
  };

  if (loading) {
    return (
      <div className="admin-page admin-loading">
        <div className="admin-loader"></div>
        <p>Loading interest categories...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Interests Management</h1>
          <p>Configure dynamic categories and topics for user onboarding.</p>
        </div>
        <button className="admin-primary-btn" onClick={() => {
          setEditForm({ category: '', icon: '🎭', items: '', order: interests.length + 1 });
          setShowAddModal(true);
        }}>
          <BiPlus size={20} /> Add Category
        </button>
      </div>

      <div className="admin-section">
        <div className="interests-list">
          {interests.map((interest) => (
            <div key={interest._id} className={`admin-card interest-manage-card ${editingId === interest._id ? 'editing' : ''}`}>
              {editingId === interest._id ? (
                <div className="interest-edit-form">
                  <div className="edit-row">
                    <div className="input-group">
                      <label>Icon</label>
                      <input 
                        value={editForm.icon} 
                        onChange={e => setEditForm({...editForm, icon: e.target.value})}
                        placeholder="Emoji (e.g. 🎭)"
                      />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label>Category Name</label>
                      <input 
                        value={editForm.category} 
                        onChange={e => setEditForm({...editForm, category: e.target.value})}
                      />
                    </div>
                    <div className="input-group" style={{ width: '80px' }}>
                      <label>Order</label>
                      <input 
                        type="number"
                        value={editForm.order} 
                        onChange={e => setEditForm({...editForm, order: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Items (comma separated)</label>
                    <textarea 
                      value={editForm.items} 
                      onChange={e => setEditForm({...editForm, items: e.target.value})}
                      rows="3"
                    />
                  </div>
                  <div className="edit-actions">
                    <button className="admin-icon-btn" onClick={() => setEditingId(null)}><BiX size={20} /></button>
                    <button className="admin-secondary-btn" onClick={() => handleSave(interest._id)}><BiSave size={18} /> Save Changes</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="interest-card-main">
                    <div className="interest-info">
                      <span className="interest-icon-preview">{interest.icon}</span>
                      <div>
                        <h3>{interest.category}</h3>
                        <p className="item-count">{interest.items.length} items</p>
                      </div>
                    </div>
                    <div className="interest-card-actions">
                      <button className="admin-icon-btn" onClick={() => handleEdit(interest)}><BiEditAlt size={18} /></button>
                      <button className="admin-icon-btn delete" onClick={() => handleDelete(interest._id)}><BiTrash size={18} /></button>
                    </div>
                  </div>
                  <div className="interest-items-preview">
                    {interest.items.map((item, idx) => (
                      <span key={idx} className="item-tag">{item}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal interest-modal">
            <div className="admin-modal-header">
              <h2>Add Interest Category</h2>
              <button onClick={() => setShowAddModal(false)}><BiX size={24} /></button>
            </div>
            <form onSubmit={handleAdd} className="admin-modal-body">
              <div className="edit-row">
                <div className="input-group" style={{ width: '80px' }}>
                  <label>Icon</label>
                  <input value={editForm.icon} onChange={e => setEditForm({...editForm, icon: e.target.value})} required />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Category Name</label>
                  <input value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} required />
                </div>
              </div>
              <div className="input-group">
                <label>Topics/Items (separate by comma)</label>
                <textarea 
                  value={editForm.items} 
                  onChange={e => setEditForm({...editForm, items: e.target.value})} 
                  placeholder="e.g. Comedy, Trends, Music..."
                  rows="4"
                  required
                />
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-secondary-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="admin-primary-btn">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .interests-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 900px;
        }
        .interest-manage-card {
          padding: 1.5rem;
          transition: border-color 0.2s;
        }
        .interest-manage-card.editing {
          border-color: var(--admin-primary);
          background: rgba(254, 44, 85, 0.02);
        }
        .interest-card-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        .interest-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .interest-icon-preview {
          font-size: 2rem;
          background: #f8f9fa;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }
        .interest-info h3 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .item-count {
          font-size: 12px;
          color: var(--admin-muted);
        }
        .interest-items-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .item-tag {
          font-size: 12px;
          background: #f1f3f5;
          padding: 4px 12px;
          border-radius: 20px;
          color: #495057;
          font-weight: 500;
        }
        .interest-card-actions {
          display: flex;
          gap: 8px;
        }
        .interest-edit-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .edit-row {
          display: flex;
          gap: 1rem;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-group label {
          font-size: 11px;
          font-weight: 700;
          color: var(--admin-muted);
          text-transform: uppercase;
        }
        .input-group input, .input-group textarea {
          padding: 10px 14px;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 8px;
          font-size: 14px;
          background: white;
        }
        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .interest-modal {
          width: 500px;
        }
      `}</style>
    </div>
  );
};

export default AdminInterests;
