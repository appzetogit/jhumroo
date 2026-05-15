import React, { useState } from 'react';
import { BiX, BiChevronDown, BiCheck } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import reelService from '../../../../services/reelService';

const EditReelSheet = ({ isOpen, onClose, reelData, onUpdate }) => {
  const { isDarkMode } = useTheme();
  const [caption, setCaption] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [audience, setAudience] = useState('everyone');
  const [loading, setLoading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const fileInputRef = React.useRef(null);

  // Sync state when reelData is available or changes
  React.useEffect(() => {
    if (reelData) {
      setCaption(reelData.caption || '');
      setAllowComments(reelData.allowComments !== false);
      setAllowDownload(reelData.allowDownload !== false);
      setAudience(reelData.audience || 'everyone');
      setThumbnailPreview(reelData.video?.thumbnail || reelData.poster);
      setThumbnailFile(null);
    }
  }, [reelData, isOpen]);

  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  if (!isOpen || !reelData) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      let response;
      const reelId = reelData._id || reelData.id;
      
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append('caption', caption);
        formData.append('allowComments', allowComments);
        formData.append('allowDownload', allowDownload);
        formData.append('audience', audience);
        formData.append('thumbnail', thumbnailFile);
        
        response = await reelService.updateReel(reelId, formData);
      } else {
        response = await reelService.updateReel(reelId, {
          caption,
          allowComments,
          allowDownload,
          audience
        });
      }

      if (response.success) {
        onUpdate(response.reel);
        onClose();
      }
    } catch (err) {
      alert(err.message || "Failed to update reel");
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between py-4">
      <span className="text-[15px] font-semibold">{label}</span>
      <button 
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
          value ? 'bg-tiktok-red' : isDarkMode ? 'bg-white/10' : 'bg-black/10'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
          value ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  );

  return (
    <div 
      className={`fixed inset-0 z-[6000] flex flex-col justify-end ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}`}
      onClick={onClose}
    >
      <div 
        className={`w-full h-[90vh] rounded-t-[20px] flex flex-col animate-slide-up ${
          isDarkMode ? 'bg-[#161823] text-white' : 'bg-white text-black'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <button onClick={onClose} className="p-2 -ml-2">
            <BiX size={28} />
          </button>
          <h2 className="text-[17px] font-bold">Edit Reel</h2>
          <button 
            disabled={loading}
            onClick={handleSave}
            className={`font-bold text-[15px] ${loading ? 'opacity-30' : 'text-tiktok-red'}`}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {/* Thumbnail preview */}
          <div className="flex gap-4 mb-8">
            <div className={`w-24 h-32 rounded-lg bg-surface overflow-hidden border-2 ${thumbnailFile ? 'border-tiktok-red' : 'border-transparent'} ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
              <img 
                src={thumbnailPreview} 
                alt="thumbnail" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleThumbnailSelect} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[14px] font-bold text-tiktok-red mb-1 text-left"
              >
                Change thumbnail
              </button>
              <p className={`text-[12px] ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
                Pick a cover that will catch people's attention.
              </p>
            </div>
          </div>

          {/* Caption input */}
          <div className="mb-8">
            <label className={`text-[12px] font-bold uppercase tracking-wider mb-2 block ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className={`w-full bg-transparent border rounded-xl p-4 text-[15px] focus:outline-none focus:border-tiktok-red transition-colors ${
                isDarkMode ? 'border-white/10' : 'border-black/10'
              }`}
              rows="4"
              placeholder="Describe your reel..."
            />
            <div className="flex justify-end mt-2">
              <span className={`text-[12px] ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>
                {caption.length}/2200
              </span>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="mb-8">
            <label className={`text-[12px] font-bold uppercase tracking-wider mb-2 block ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>Who can see this</label>
            <div className="flex flex-col gap-1">
              {['everyone', 'followers', 'following'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAudience(opt)}
                  className={`flex items-center justify-between p-4 rounded-xl active:scale-95 transition-all ${
                    audience === opt 
                      ? (isDarkMode ? 'bg-white/5' : 'bg-black/5')
                      : ''
                  }`}
                >
                  <span className={`text-[15px] font-semibold capitalize ${audience === opt ? 'text-tiktok-red' : ''}`}>{opt}</span>
                  {audience === opt && <BiCheck size={20} className="text-tiktok-red" />}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-col">
            <label className={`text-[12px] font-bold uppercase tracking-wider mb-2 block ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>Permissions</label>
            <Toggle label="Allow comments" value={allowComments} onChange={setAllowComments} />
            <Toggle label="Allow downloads" value={allowDownload} onChange={setAllowDownload} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditReelSheet;
