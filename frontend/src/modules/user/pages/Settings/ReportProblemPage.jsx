import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { getReportProblemCategories } from '../../../../utils/helpCenterData';
import userService from '../../../../services/userService';
import { useToast } from '../../../../context/ToastContext';

const ReportProblemPage = () => {
  const navigate = useNavigate();
  const categories = getReportProblemCategories();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('File size exceeds the 50MB limit.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await userService.uploadProblemAttachment(formData);
      if (res.success && res.attachment) {
        setAttachments((prev) => [...prev, res.attachment]);
        showToast('Attachment uploaded successfully.', 'success');
      } else {
        showToast('Failed to upload attachment.', 'error');
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
      showToast(error.message || 'Error uploading attachment.', 'error');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!description.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await userService.submitProblemReport({
        category: selectedCategory,
        description: description.trim(),
        attachments: attachments
      });
      
      if (res.success) {
        setSubmitted(true);
        setDescription('');
        setAttachments([]);
        showToast('Your issue has been submitted successfully.', 'success');
        // Redirect to support history after a short delay
        setTimeout(() => {
          navigate('/settings/help-center', { state: { activeTab: 'support' } });
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to submit problem report:', error);
      showToast(error.message || 'Failed to submit problem report.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SettingsSubPageLayout title="Report a problem">
      <p className="text-[13px] leading-6 text-white/45 mb-5 px-1">
        Share what went wrong and choose the category that best matches your issue.
      </p>

      <div className="mb-5">
        <h4 className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-3 ml-1">
          Category
        </h4>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-colors ${
                selectedCategory === category
                  ? 'bg-[#FE2C55] text-white'
                  : 'bg-[#242424] text-white/70 border border-white/10'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#242424] rounded-[18px] p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-[12px] text-white/40 uppercase tracking-[0.18em] mb-2">
            Describe the issue
          </label>
          <textarea
            value={description}
            onChange={(event) => {
              setSubmitted(false);
              setDescription(event.target.value);
            }}
            placeholder="Tell us what happened..."
            className="w-full h-32 rounded-[16px] bg-white/5 border border-white/10 px-4 py-3 text-[14px] text-white placeholder:text-white/25 resize-none outline-none"
          />
        </div>

        <div 
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`rounded-[16px] border border-dashed border-white/15 px-4 py-5 text-center cursor-pointer transition-all ${
            uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/30 hover:bg-white/5 active:brightness-95'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <p className="text-[13px] font-medium text-white/80">Uploading file...</p>
            </div>
          ) : (
            <>
              <p className="text-[13px] font-medium text-white/80">Add attachment</p>
              <p className="text-[12px] text-white/35 mt-2">Tap to upload a screenshot or screen recording (Max 50MB).</p>
            </>
          )}
        </div>
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          className="hidden"
        />

        {attachments.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-[11px] text-white/40 font-bold uppercase tracking-widest ml-1">
              Attachments ({attachments.length})
            </h5>
            <div className="flex flex-wrap gap-3">
              {attachments.map((att, idx) => (
                <div key={att.publicId || idx} className="relative group w-20 h-20 bg-white/5 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
                  {att.fileType === 'video' ? (
                    <div className="flex flex-col items-center justify-center text-center p-1">
                      <svg className="w-6 h-6 text-white/60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                      <span className="text-[9px] text-white/40 truncate max-w-[70px]">Video</span>
                    </div>
                  ) : (
                    <img 
                      src={att.url} 
                      alt={`attachment-${idx}`} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachments(prev => prev.filter((_, i) => i !== idx));
                      showToast('Attachment removed.', 'info');
                    }}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {submitted && (
          <p className="text-[12px] text-[#4CD964]">
            Your issue has been submitted successfully.
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !description.trim()}
          className={`w-full rounded-[16px] bg-[#FE2C55] text-white text-[14px] font-semibold py-3 active:brightness-95 transition-all ${
            (isSubmitting || !description.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit report'}
        </button>
      </div>
    </SettingsSubPageLayout>
  );
};

export default ReportProblemPage;

