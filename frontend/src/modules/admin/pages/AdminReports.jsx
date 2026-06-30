import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiFlag, BiShow, BiTrash, BiUserX, BiCheckCircle, BiXCircle, BiRefresh, BiX } from 'react-icons/bi';
import adminReportService from '../../../services/adminReportService';

const AdminReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Reel', or 'User'
  const [actionModal, setActionModal] = useState({ isOpen: false, reportId: null });

  useEffect(() => {
    fetchReports();
  }, [page, activeTab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await adminReportService.getReports(page, 20, activeTab);
      if (response.success) {
        setReports(response.reports);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveReel = async (reelId, reportId) => {
    if (window.confirm('Are you sure you want to remove this reel from the feed?')) {
      try {
        await adminReportService.removeReel(reelId, reportId);
        alert('Reel removed successfully');
        fetchReports();
      } catch (error) {
        alert(error.response?.data?.message || 'Error removing reel');
      }
    }
  };

  const handleBanUser = async (userId, reportId) => {
    const reason = window.prompt('Enter reason for banning this user:', 'Violation of community guidelines');
    if (reason !== null) {
      try {
        await adminReportService.banUser(userId, reportId, reason);
        alert('User banned successfully');
        fetchReports();
      } catch (error) {
        alert(error.response?.data?.message || 'Error banning user');
      }
    }
  };

  const handleApproveReport = async (reportId) => {
    try {
      await adminReportService.updateReportStatus(reportId, { status: 'resolved', actionTaken: 'none' });
      alert('Report marked as Approved/Resolved');
      fetchReports();
    } catch (error) {
      alert('Error approving report');
    }
  };

  const handleDismissReport = async (reportId) => {
    try {
      await adminReportService.updateReportStatus(reportId, { status: 'dismissed', actionTaken: 'none' });
      alert('Report dismissed');
      fetchReports();
    } catch (error) {
      alert('Error dismissing report');
    }
  };

  const getReasonLabel = (reason) => {
    const reasons = {
      spam: 'Spam',
      harassment: 'Harassment',
      violence: 'Violence',
      copyright: 'Copyright',
      fake_content: 'Fake Content',
      adult_content: 'Adult Content',
      other: 'Other'
    };
    return reasons[reason] || reason;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const formatReportDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1); // Reset to first page when changing tabs
  };

  // Safety filter in case backend returns mixed results during transition
  const filteredReports = activeTab === 'All' 
    ? (reports || []) 
    : (reports || []).filter(r => r.reportType === activeTab);

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reports Management</h1>
          <p className="admin-page-subtitle">Review and handle user reports for reels and accounts</p>
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

      <div className="flex gap-2 mb-6">
        <button 
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'All' 
              ? 'bg-[#FE2C55] text-white shadow-lg shadow-[#FE2C55]/20' 
              : 'bg-white text-[#161823] border border-admin-border hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('All')}
        >
          All Reports
        </button>
        <button 
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'Reel' 
              ? 'bg-[#FE2C55] text-white shadow-lg shadow-[#FE2C55]/20' 
              : 'bg-white text-[#161823] border border-admin-border hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('Reel')}
        >
          Reel Reports
        </button>
        <button 
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'User' 
              ? 'bg-[#FE2C55] text-white shadow-lg shadow-[#FE2C55]/20' 
              : 'bg-white text-[#161823] border border-admin-border hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('User')}
        >
          Account Reports
        </button>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="p-12 text-center">
            <div className="admin-spinner" />
            <p className="mt-4 text-gray-500">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BiFlag size={48} className="mx-auto mb-4 opacity-20" />
            <p>No {activeTab.toLowerCase()} reports found</p>
          </div>
        ) : (
          <div className="admin-table">
            <div className={`admin-table-head admin-table-head--reports ${activeTab === 'User' ? 'no-status' : ''}`}>
              <span>Reporter</span>
              <span>Reason & Info</span>
              <span>Reported Target</span>
              <span>Content / Profile</span>
              {activeTab !== 'User' && <span>Status</span>}
              <span className="text-right">Actions</span>
            </div>
            
            {filteredReports.map((report) => (
              <div key={report._id} className={`admin-table-row admin-table-row--reports ${activeTab === 'User' ? 'no-status' : ''}`}>
                {/* Reporter */}
                <div className="admin-user-cell">
                  <div className="admin-avatar">
                    <img 
                      src={report.reportedBy?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${report.reportedBy?.username}`} 
                      alt="" 
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="admin-user-name truncate">@{report.reportedBy?.username}</p>
                    <p className="admin-user-handle truncate">{report.reportedBy?.fullName}</p>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] text-admin-strong">{getReasonLabel(report.reason)}</span>
                    <span className="text-[10px] text-admin-muted font-medium mt-0.5">
                      {formatReportDate(report.createdAt)}
                    </span>
                    {report.description && (
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 border-l-2 border-admin-primary/20 pl-1.5" title={report.description}>
                        {report.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reported Target (Creator or User) */}
                <div className="admin-user-cell">
                  {report.reportType === 'User' ? (
                    // Target is the User profile directly
                    <>
                      <div className="admin-avatar">
                        <img 
                          src={report.reportedItem?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${report.reportedItem?.username || 'user'}`} 
                          alt="" 
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="admin-user-name truncate">@{report.reportedItem?.username || 'unknown'}</p>
                        {report.reportedItem?.isBanned && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold">BANNED</span>
                        )}
                        <span className="text-[10px] text-gray-400 block">Account</span>
                      </div>
                    </>
                  ) : (
                    // Target is a Reel, so we need the Reel's creator
                    <>
                      <div className="admin-avatar">
                        <img 
                          src={report.reportedItem?.user?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${report.reportedItem?.user?.username || 'user'}`} 
                          alt="" 
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="admin-user-name truncate">@{report.reportedItem?.user?.username || 'unknown'}</p>
                        {report.reportedItem?.user?.isBanned && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold">BANNED</span>
                        )}
                        <span className="text-[10px] text-gray-400 block">Reel Creator</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Content / Profile Link */}
                <div>
                  {report.reportType === 'Reel' ? (
                    report.reportedItem ? (
                      <button 
                        className="flex items-center gap-1.5 text-admin-primary hover:underline text-[13px] font-bold"
                        onClick={() => {
                          setSelectedReport(report);
                          setShowVideoModal(true);
                        }}
                      >
                        <BiShow size={16} />
                        View Reel
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Deleted</span>
                    )
                  ) : (
                    <button 
                      className="flex items-center gap-1.5 text-admin-primary hover:underline text-[13px] font-bold"
                      onClick={() => navigate(`/admin/users/${report.reportedItem?._id}`)}
                    >
                      <BiShow size={16} />
                      View Profile
                    </button>
                  )}
                </div>

                {/* Status */}
                {activeTab !== 'User' && (
                  <div>
                    <span className={`admin-status-pill ${
                      report.status === 'pending' ? 'status-open' : 
                      report.status === 'resolved' ? 'status-resolved' : 'status-investigating'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  {report.status === 'pending' ? (
                    <>
                      <button 
                        className="admin-icon-btn success" 
                        style={{ color: '#10b981' }}
                        title="Resolve / Dismiss"
                        onClick={() => setActionModal({ isOpen: true, reportId: report._id })}
                      >
                        <BiCheckCircle size={16} />
                      </button>

                      {report.reportType === 'Reel' && (
                        <button 
                          className="admin-icon-btn" 
                          style={{ color: '#ef4444' }}
                          title="Remove Reel"
                          disabled={!report.reportedItem}
                          onClick={() => handleRemoveReel(report.reportedItem?._id, report._id)}
                        >
                          <BiTrash size={16} />
                        </button>
                      )}
                      
                      <button 
                        className="admin-icon-btn" 
                        style={{ color: '#f59e0b' }}
                        title="Ban User"
                        disabled={report.reportType === 'Reel' ? !report.reportedItem?.user : !report.reportedItem}
                        onClick={() => {
                          const targetId = report.reportType === 'Reel' ? report.reportedItem?.user?._id : report.reportedItem?._id;
                          handleBanUser(targetId, report._id);
                        }}
                      >
                        <BiUserX size={18} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-gray-400 italic font-medium">Handled</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          <button 
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${page === 1 ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-admin-primary border border-admin-border hover:bg-admin-primary/5'}`}
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <div className="flex gap-2">
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                  page === i + 1 ? 'bg-[#FE2C55] text-white shadow-lg shadow-[#FE2C55]/20' : 'bg-white text-gray-600 border border-admin-border hover:bg-gray-50'
                }`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button 
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${page === pagination.pages ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-admin-primary border border-admin-border hover:bg-admin-primary/5'}`}
            onClick={() => page < pagination.pages && setPage(page + 1)}
            disabled={page === pagination.pages}
          >
            Next
          </button>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && selectedReport && (
        <div className="admin-modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="admin-modal !p-0 !w-[320px] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-admin-strong text-[14px]">Reel Review</h3>
                <p className="text-[10px] text-admin-muted">Reported for {getReasonLabel(selectedReport.reason)}</p>
              </div>
              <button 
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                onClick={() => setShowVideoModal(false)}
              >
                <BiX size={24} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="aspect-[9/16] bg-black flex items-center justify-center">
              <video 
                src={selectedReport.reportedItem?.video?.url || selectedReport.reportedItem?.url} 
                className="w-full h-full object-contain"
                controls
                autoPlay
              />
            </div>
            
            <div className="p-4 bg-gray-50 flex flex-col gap-2.5">
              <div className="flex gap-2">
                <button 
                  className="flex-1 admin-primary-btn !py-2 !text-[12px] !shadow-none !bg-red-600 hover:!bg-red-700"
                  onClick={() => {
                    setShowVideoModal(false);
                    handleRemoveReel(selectedReport.reportedItem?._id, selectedReport._id);
                  }}
                >
                  Remove Reel
                </button>
                <button 
                  className="flex-1 admin-secondary-btn !py-2 !text-[12px]"
                  onClick={() => setShowVideoModal(false)}
                >
                  Keep Reel
                </button>
              </div>
              <button 
                className="text-[11px] font-bold text-red-600 hover:underline text-center"
                onClick={() => {
                  setShowVideoModal(false);
                  handleBanUser(selectedReport.reportedItem?.user?._id, selectedReport._id);
                }}
              >
                Ban Creator Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Choice Modal */}
      {actionModal.isOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '400px' }}>
            <div className="admin-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
              <h2 className="admin-modal-title" style={{ fontSize: '18px', fontWeight: 'bold' }}>Resolve Report</h2>
              <button 
                type="button" 
                onClick={() => setActionModal({ isOpen: false, reportId: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <BiX size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="admin-modal-body" style={{ padding: '20px 0' }}>
              <p className="text-[14px] text-gray-600 dark:text-gray-300">
                Please select how you want to resolve this report:
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleApproveReport(actionModal.reportId);
                    setActionModal({ isOpen: false, reportId: null });
                  }}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-2.5 rounded-xl text-[14px] font-bold transition-all"
                >
                  Approve Report (Mark as Resolved)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDismissReport(actionModal.reportId);
                    setActionModal({ isOpen: false, reportId: null });
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2.5 rounded-xl text-[14px] font-bold transition-all"
                >
                  Dismiss Report (Mark as False/Invalid)
                </button>
              </div>
            </div>
            <div className="admin-modal-footer" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="admin-secondary-btn" 
                onClick={() => setActionModal({ isOpen: false, reportId: null })}
                style={{ padding: '8px 16px', borderRadius: '10px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-table-head--reports, .admin-table-row--reports {
          grid-template-columns: 1.8fr 1.5fr 1.5fr 1.2fr 1fr 1fr;
          align-items: center;
          gap: 20px;
        }
        .admin-table-head--reports.no-status, .admin-table-row--reports.no-status {
          grid-template-columns: 1.8fr 1.5fr 1.5fr 1.2fr 1fr;
        }
        .admin-table-head {
          padding: 12px 0;
          border-bottom: 2px solid var(--admin-border);
          margin-bottom: 8px;
        }
        .admin-table-row--reports {
          padding: 16px 0;
          transition: all 0.2s;
        }
        .admin-table-row--reports:hover {
          background: rgba(254, 44, 85, 0.02);
        }
        .admin-user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
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
        .status-open {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
        }
        .status-resolved {
          background: rgba(16, 185, 129, 0.12);
          color: #065f46;
        }
        .status-investigating {
          background: rgba(107, 114, 128, 0.12);
          color: #374151;
        }
      `}} />
    </div>
  );
};

export default AdminReports;
