import React from 'react';
import { BiFlag } from 'react-icons/bi';
import { useAdminConfig } from '../../../context/AdminConfigContext';

const AdminModeration = () => {
  const { config } = useAdminConfig();
  const reports = config?.moderation?.reports || [];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Moderation</h1>
          <p>Track reported content and escalation queues.</p>
        </div>
        <button type="button" className="admin-primary-btn">
          Review queue
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-table">
          <div className="admin-table-head admin-table-head--reports">
            <span>Type</span>
            <span>Item</span>
            <span>Reported by</span>
            <span>Status</span>
            <span>Age</span>
          </div>
          {reports.map((report) => (
            <div key={report.id} className="admin-table-row admin-table-row--reports">
              <span className="admin-report-type">
                <BiFlag size={14} />
                {report.type}
              </span>
              <span>{report.item}</span>
              <span>@{report.reportedBy}</span>
              <span className={`admin-status-pill status-${report.status.toLowerCase()}`}>
                {report.status}
              </span>
              <span>{report.createdAt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminModeration;
