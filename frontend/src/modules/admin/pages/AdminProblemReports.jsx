import React, { useState, useEffect } from 'react';
import { BiError, BiCheckCircle, BiXCircle, BiRefresh, BiShow, BiMessageDetail } from 'react-icons/bi';
import adminProblemReportService from '../../../services/adminProblemReportService';

const AdminProblemReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await adminProblemReportService.getProblemReports();
      if (response.success) {
        setReports(response.reports);
      }
    } catch (error) {
      console.error('Error fetching problem reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      const response = await adminProblemReportService.updateReportStatus(reportId, { 
        status: newStatus
      });
      if (response.success) {
        alert('Report updated successfully');
        setShowDetailModal(false);
        fetchReports();
      }
    } catch (error) {
      alert('Error updating report');
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
          <h1 className="admin-page-title">Customer Reports</h1>
          <p className="admin-page-subtitle">Manage app issues and bug reports from users</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="admin-secondary-btn flex items-center gap-2"
            onClick={fetchReports}
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
            <p className="mt-4 text-gray-500">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BiError size={48} className="mx-auto mb-4 opacity-20" />
            <p>No problem reports found</p>
          </div>
        ) : (
          <div className="admin-table">
            <div className="admin-table-head admin-problem-table-grid">
              <span>User</span>
              <span>Category</span>
              <span>Description</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            
            {reports.map((report) => (
              <div key={report._id} className="admin-table-row admin-problem-table-grid">
                <div className="admin-user-cell">
                  <div className="admin-avatar">
                    <img 
                      src={report.userId?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${report.userId?.username}`} 
                      alt="" 
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="admin-user-name truncate">@{report.userId?.username}</p>
                    <p className="admin-user-handle truncate">{report.userId?.fullName}</p>
                    <div className="flex flex-col mt-1 gap-0.5">
                      {report.userId?.email && <p className="text-[10px] text-gray-400 truncate">{report.userId.email}</p>}
                      {report.userId?.phoneNumber && <p className="text-[10px] text-gray-400 truncate">{report.userId.phoneNumber}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-[13px] text-admin-strong">{report.category}</span>
                </div>

                <div className="truncate pr-4">
                  <p className="text-[13px] text-gray-600 line-clamp-1">{report.description}</p>
                </div>

                <div>
                  <p className="text-[12px] font-medium text-gray-700">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div>
                  <span className={`admin-status-pill ${getStatusColor(report.status)}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button 
                    className="admin-icon-btn" 
                    title="View Details"
                    onClick={() => {
                      setSelectedReport(report);
                      setStatusToUpdate(report.status);
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
      {showDetailModal && selectedReport && (
        <div className="admin-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="admin-modal max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-admin-strong">Report Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <BiXCircle size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Reporter</label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img src={selectedReport.userId?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedReport.userId?.username}`} alt="" />
                    </div>
                    <div>
                      <p className="font-bold text-admin-strong">@{selectedReport.userId?.username}</p>
                      <p className="text-sm text-gray-500">{selectedReport.userId?.fullName}</p>
                      <div className="mt-2 space-y-1">
                        {selectedReport.userId?.email && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <span className="font-semibold text-gray-500">Email:</span> {selectedReport.userId.email}
                          </p>
                        )}
                        {selectedReport.userId?.phoneNumber && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <span className="font-semibold text-gray-500">Phone:</span> {selectedReport.userId.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                  <p className="text-admin-strong font-medium mt-1">{selectedReport.category}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Submitted On</label>
                  <p className="text-admin-strong mt-1">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Current Status</label>
                  <div className="mt-1">
                    <span className={`admin-status-pill ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Update Status</label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <select
                      className="admin-input w-full"
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
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
              <div className="mt-1 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-admin-strong whitespace-pre-wrap">{selectedReport.description}</p>
              </div>
            </div>

            {selectedReport.attachments && selectedReport.attachments.length > 0 && (
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-400 uppercase">Attachments ({selectedReport.attachments.length})</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {selectedReport.attachments.map((att, idx) => (
                    <div key={att._id || idx} className="relative w-40 h-40 rounded-xl overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
                      {att.fileType === 'video' ? (
                        <video 
                          src={att.url} 
                          controls 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                          <img 
                            src={att.url} 
                            alt={`attachment-${idx}`} 
                            className="w-full h-full object-cover cursor-zoom-in"
                          />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}


            <div className="flex gap-3">
              <button 
                className="flex-1 admin-primary-btn"
                onClick={() => handleUpdateStatus(selectedReport._id, statusToUpdate)}
              >
                Save Changes
              </button>
              <button 
                className="flex-1 admin-secondary-btn"
                onClick={() => setShowDetailModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-problem-table-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 2.5fr 1fr 1fr 0.8fr;
          align-items: center;
          gap: 20px;
        }
        .admin-table-head {
          padding: 12px 0;
          border-bottom: 2px solid var(--admin-border);
          margin-bottom: 8px;
        }
        .admin-table-row {
          padding: 16px 0;
          transition: all 0.2s;
        }
        .admin-avatar {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid var(--admin-border);
        }
        .admin-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .admin-user-name {
          font-weight: 700;
          font-size: 13px;
          color: var(--admin-strong);
        }
        .admin-user-handle {
          font-size: 11px;
          color: var(--admin-muted);
        }
      `}} />
    </div>
  );
};

export default AdminProblemReports;
