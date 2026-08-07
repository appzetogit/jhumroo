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
              <span>Email</span>
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
                    <p className="admin-user-name truncate">@{report.userId?.username || 'user'}</p>
                    <p className="admin-user-handle truncate">{report.userId?.fullName || 'N/A'}</p>
                  </div>
                </div>

                <div className="min-w-0 pr-2">
                  <p className="text-[13px] font-medium text-gray-700 truncate" title={report.userId?.email || ''}>
                    {report.userId?.email || 'N/A'}
                  </p>
                  {report.userId?.phoneNumber && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      {report.userId.phoneNumber}
                    </p>
                  )}
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
                    {report.status?.replace('_', ' ')}
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
          <div className="admin-modal max-w-lg w-full overflow-hidden p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-admin-strong">Report Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <BiXCircle size={22} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Reporter</label>
                  <div className="flex items-center gap-2.5 mt-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200">
                      <img src={selectedReport.userId?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedReport.userId?.username}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-admin-strong truncate">@{selectedReport.userId?.username || 'user'}</p>
                      <p className="text-[11px] text-gray-500 truncate">{selectedReport.userId?.fullName || 'N/A'}</p>
                    </div>
                  </div>
                  {(selectedReport.userId?.email || selectedReport.userId?.phoneNumber) && (
                    <div className="mt-1 space-y-0.5 text-[11px] text-gray-500 pl-1">
                      {selectedReport.userId?.email && <p className="truncate"><span className="text-gray-400">Email:</span> {selectedReport.userId.email}</p>}
                      {selectedReport.userId?.phoneNumber && <p className="truncate"><span className="text-gray-400">Phone:</span> {selectedReport.userId.phoneNumber}</p>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
                  <p className="text-admin-strong text-xs font-semibold mt-0.5">{selectedReport.category}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Submitted On</label>
                  <p className="text-admin-strong text-xs mt-0.5">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Current Status</label>
                  <div className="mt-1">
                    <span className={`admin-status-pill text-xs py-1 px-3 ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Update Status</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <select
                      className="admin-input w-full text-xs py-1 px-2"
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

            <div className="mb-4">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-xl border border-gray-100 max-h-28 overflow-y-auto">
                <p className="text-xs text-admin-strong whitespace-pre-wrap leading-relaxed">{selectedReport.description}</p>
              </div>
            </div>

            {selectedReport.attachments && selectedReport.attachments.length > 0 && (
              <div className="mb-4">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Attachments ({selectedReport.attachments.length})</label>
                <div className="flex flex-wrap gap-2.5 mt-1.5">
                  {selectedReport.attachments.map((att, idx) => (
                    <div key={att._id || idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
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

            <div className="flex gap-2.5 pt-1">
              <button 
                className="flex-1 admin-primary-btn text-xs py-2 h-9"
                onClick={() => handleUpdateStatus(selectedReport._id, statusToUpdate)}
              >
                Save Changes
              </button>
              <button 
                className="flex-1 admin-secondary-btn text-xs py-2 h-9"
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
          grid-template-columns: 1.3fr 1.5fr 1.1fr 2.2fr 1fr 0.9fr 0.6fr;
          align-items: center;
          gap: 16px;
        }
        .admin-table-head {
          padding: 12px 0;
          border-bottom: 2px solid var(--admin-border);
          margin-bottom: 8px;
          color: var(--admin-muted);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
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
