import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { getReportProblemCategories } from '../../../../utils/helpCenterData';
import userService from '../../../../services/userService';

const ReportProblemPage = () => {
  const navigate = useNavigate();
  const categories = getReportProblemCategories();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await userService.submitProblemReport({
        category: selectedCategory,
        description: description.trim()
      });
      
      if (res.success) {
        setSubmitted(true);
        setDescription('');
        // Redirect to support history after a short delay
        setTimeout(() => {
          navigate('/settings/help-center', { state: { activeTab: 'support' } });
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to submit problem report:', error);
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

        <div className="rounded-[16px] border border-dashed border-white/15 px-4 py-5 text-center">
          <p className="text-[13px] font-medium text-white/80">Attachment placeholder</p>
          <p className="text-[12px] text-white/35 mt-2">You can later add screenshots or recordings here.</p>
        </div>

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
