import React, { useState, useEffect } from 'react';
import { BiSave, BiRefresh, BiFile, BiShield } from 'react-icons/bi';
import adminStaticPageService from '../../../services/adminStaticPageService';

const AdminTermsAndPolicy = () => {
  const [activeSlug, setActiveSlug] = useState('terms-and-condition');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageData, setPageData] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    fetchPageContent();
  }, [activeSlug]);

  const fetchPageContent = async () => {
    setLoading(true);
    try {
      const response = await adminStaticPageService.getStaticPage(activeSlug);
      if (response.success) {
        setPageData({
          title: response.page.title,
          content: response.page.content
        });
      }
    } catch (error) {
      console.error('Error fetching page content:', error);
      // If not found, set defaults
      setPageData({
        title: activeSlug === 'terms-and-condition' ? 'Terms & Condition' : 'Privacy Policy',
        content: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pageData.title.trim() || !pageData.content.trim()) {
      alert('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const response = await adminStaticPageService.updateStaticPage({
        slug: activeSlug,
        title: pageData.title,
        content: pageData.content
      });
      if (response.success) {
        alert('Page updated successfully');
      }
    } catch (error) {
      console.error('Error updating page:', error);
      alert('Failed to update page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Terms & Policy Management</h1>
          <p className="admin-page-subtitle">Manage the dynamic content for legal pages</p>
        </div>
        <div className="flex gap-3">
          <button 
            className={`admin-primary-btn flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={handleSave}
            disabled={saving || loading}
          >
            <BiSave size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar / Tabs */}
        <div className="col-span-12 lg:col-span-3 space-y-2">
          <button
            onClick={() => setActiveSlug('terms-and-condition')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${
              activeSlug === 'terms-and-condition' 
                ? 'bg-[#FE2C55] text-white shadow-lg shadow-[#FE2C55]/20' 
                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <BiFile size={20} />
            Terms & Condition
          </button>
          <button
            onClick={() => setActiveSlug('privacy-policy')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${
              activeSlug === 'privacy-policy' 
                ? 'bg-[#FE2C55] text-white shadow-lg shadow-[#FE2C55]/20' 
                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <BiShield size={20} />
            Privacy Policy
          </button>
        </div>

        {/* Editor */}
        <div className="col-span-12 lg:col-span-9">
          <div className="admin-card min-h-[600px] flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20">
                <div className="admin-spinner" />
                <p className="mt-4 text-gray-400">Loading content...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6 flex-1 flex flex-col">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Page Title</label>
                  <input 
                    type="text"
                    className="admin-input text-lg font-bold"
                    placeholder="Enter page title"
                    value={pageData.title}
                    onChange={(e) => setPageData({ ...pageData, title: e.target.value })}
                  />
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Page Content (Markdown/HTML supported)</label>
                    <button 
                      onClick={fetchPageContent}
                      className="text-xs text-admin-primary font-bold flex items-center gap-1 hover:underline"
                    >
                      <BiRefresh /> Reset to saved
                    </button>
                  </div>
                  <textarea 
                    className="admin-input flex-1 min-h-[400px] font-mono text-[14px] leading-relaxed p-6 resize-none bg-gray-50 border-gray-100 focus:bg-white transition-all"
                    placeholder="Enter the page content here..."
                    value={pageData.content}
                    onChange={(e) => setPageData({ ...pageData, content: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTermsAndPolicy;
