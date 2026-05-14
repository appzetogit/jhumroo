import React, { useState, useEffect } from 'react';
import { BiFlag, BiShow, BiTrash, BiUserX, BiCheckCircle, BiXCircle } from 'react-icons/bi';
import adminReportService from '../../../services/adminReportService';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [page]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await adminReportService.getReports(page);
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

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reports Management</h1>
          <p className="admin-page-subtitle">Review and handle user reports for reels and accounts</p>
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
            <BiFlag size={48} className="mx-auto mb-4 opacity-20" />
            <p>No reports found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Reason</th>
                  <th>Reel Creator</th>
                  <th>Reported Reel</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                          <img 
                            src={report.reportedBy?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${report.reportedBy?.username}`} 
                            alt="avatar" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-sm">
                          <p className="font-bold">@{report.reportedBy?.username}</p>
                          <p className="text-xs text-gray-500">{report.reportedBy?.fullName}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm font-medium">{getReasonLabel(report.reason)}</span>
                      {report.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">{report.description}</p>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                          <img 
                            src={report.reportedItem?.user?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${report.reportedItem?.user?.username}`} 
                            alt="avatar" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-sm">
                          <p className="font-bold">@{report.reportedItem?.user?.username}</p>
                          {report.reportedItem?.user?.isBanned && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">BANNED</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {report.reportedItem ? (
                        <button 
                          className="flex items-center gap-2 text-admin-primary hover:underline text-sm font-medium"
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
                      )}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {report.status === 'pending' && (
                          <>
                            <button 
                              className="admin-action-btn success" 
                              title="Resolve / Dismiss"
                              onClick={() => handleDismissReport(report._id)}
                            >
                              <BiCheckCircle size={16} />
                            </button>
                            <button 
                              className="admin-action-btn danger" 
                              title="Remove Reel"
                              disabled={!report.reportedItem}
                              onClick={() => handleRemoveReel(report.reportedItem?._id, report._id)}
                            >
                              <BiTrash size={16} />
                            </button>
                            <button 
                              className="admin-action-btn warning" 
                              title="Ban User"
                              disabled={!report.reportedItem?.user}
                              onClick={() => handleBanUser(report.reportedItem?.user?._id, report._id)}
                            >
                              <BiUserX size={16} />
                            </button>
                          </>
                        )}
                        {report.status !== 'pending' && (
                          <span className="text-xs text-gray-400 italic">Handled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {[...Array(pagination.pages)].map((_, i) => (
            <button
              key={i}
              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-all ${
                page === i + 1 ? 'bg-admin-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && selectedReport && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowVideoModal(false)}></div>
          <div className="relative bg-white rounded-2xl overflow-hidden max-w-md w-full animate-scale-in">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Reel Review</h3>
              <button onClick={() => setShowVideoModal(false)}><BiXCircle size={24} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="aspect-[9/16] bg-black">
              <video 
                src={selectedReport.reportedItem?.video?.url || selectedReport.reportedItem?.url} 
                className="w-full h-full object-contain"
                controls
                autoPlay
              />
            </div>
            <div className="p-4 flex gap-3">
              <button 
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
                onClick={() => {
                  setShowVideoModal(false);
                  handleRemoveReel(selectedReport.reportedItem?._id, selectedReport._id);
                }}
              >
                Remove Content
              </button>
              <button 
                className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                onClick={() => setShowVideoModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
