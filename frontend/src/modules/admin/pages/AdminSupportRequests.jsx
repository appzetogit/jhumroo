import React, { useState, useEffect } from 'react';
import { BiError, BiCheckCircle, BiXCircle, BiRefresh, BiShow, BiEnvelope, BiPhone, BiUser } from 'react-icons/bi';
import adminSupportService from '../../../services/adminSupportService';

const AdminSupportRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await adminSupportService.getSupportRequests();
      if (response.success) {
        setRequests(response.requests);
      }
    } catch (error) {
      console.error('Error fetching support requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      const response = await adminSupportService.updateRequestStatus(requestId, { 
        status: newStatus
      });
      if (response.success) {
        alert('Request updated successfully');
        setShowDetailModal(false);
        fetchRequests();
      }
    } catch (error) {
      alert('Error updating request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Support Requests</h1>
          <p className="admin-page-subtitle">Manage general support inquiries from users</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="admin-secondary-btn flex items-center gap-2"
            onClick={fetchRequests}
            disabled={loading}
          >
            <BiRefresh className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="p-12 text-center">
            <div className="admin-spinner" />
            <p className="mt-4 text-gray-500">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BiError size={48} className="mx-auto mb-4 opacity-20" />
            <p>No support requests found</p>
          </div>
        ) : (
          <div className="admin-table">
            <div className="admin-table-head admin-support-table-grid">
              <span>User Details</span>
              <span>Reason</span>
              <span>Date & Time</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            
            {requests.map((request) => (
              <div key={request._id} className="admin-table-row admin-support-table-grid">
                <div className="flex flex-col gap-1">
                  <p className="font-bold text-admin-strong text-[14px]">{request.name}</p>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <BiEnvelope size={12} />
                    <span>{request.email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <BiPhone size={12} />
                    <span>{request.phoneNumber}</span>
                  </div>
                </div>

                <div className="truncate pr-4">
                  <p className="text-[13px] text-gray-600 line-clamp-1">{request.reason}</p>
                </div>

                <div>
                  <p className="text-[12px] font-medium text-gray-700">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div>
                  <span className={`admin-status-pill ${getStatusColor(request.status)}`}>
                    {request.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button 
                    className="admin-icon-btn" 
                    title="View Details"
                    onClick={() => {
                      setSelectedRequest(request);
                      setStatusToUpdate(request.status);
                      setShowDetailModal(true);
                    }}
                  >
                    <BiShow size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="admin-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="admin-modal max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-admin-strong">Support Request Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <BiXCircle size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                        <BiUser size={18} />
                      </div>
                      <p className="font-bold text-admin-strong">{selectedRequest.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                        <BiEnvelope size={18} />
                      </div>
                      <p className="text-sm text-gray-600">{selectedRequest.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                        <BiPhone size={18} />
                      </div>
                      <p className="text-sm text-gray-600">{selectedRequest.phoneNumber}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted On</label>
                  <p className="text-admin-strong mt-1 font-medium">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Status</label>
                  <div className="mt-2">
                    <span className={`admin-status-pill text-sm py-1.5 px-4 ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Update Status</label>
                  <select 
                    className="admin-input mt-2"
                    value={statusToUpdate}
                    onChange={(e) => setStatusToUpdate(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reason for Support</label>
              <div className="mt-2 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-admin-strong whitespace-pre-wrap leading-relaxed">{selectedRequest.reason}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                className="flex-1 admin-primary-btn h-12"
                onClick={() => handleUpdateStatus(selectedRequest._id, statusToUpdate)}
              >
                Save Changes
              </button>
              <button 
                className="flex-1 admin-secondary-btn h-12"
                onClick={() => setShowDetailModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-support-table-grid {
          display: grid;
          grid-template-columns: 1.5fr 2fr 1.2fr 1fr 0.6fr;
          align-items: center;
          gap: 20px;
        }
        .admin-table-head {
          padding: 12px 0;
          border-bottom: 2px solid var(--admin-border);
          margin-bottom: 8px;
          color: var(--admin-muted);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 1px;
        }
        .admin-table-row {
          padding: 20px 0;
          border-bottom: 1px solid var(--admin-border);
          transition: all 0.2s;
        }
        .admin-table-row:hover {
          background: #f9fafb;
        }
      `}} />
    </div>
  );
};

export default AdminSupportRequests;
