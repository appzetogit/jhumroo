import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  BiChevronLeft, 
  BiCloudUpload, 
  BiX, 
  BiMap, 
  BiLink, 
  BiMusic,
  BiTargetLock,
  BiCheck
} from 'react-icons/bi';
import adService from '../../../services/adService';

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const AdminCreateAd = () => {
  const navigate = useNavigate();
  const { adId } = useParams();
  const isEditMode = !!adId;
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [caption, setCaption] = useState('');
  const [link, setLink] = useState('');
  const [adType, setAdType] = useState('shop'); // 'chat' or 'shop'
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [musicName, setMusicName] = useState('');
  const [musicFile, setMusicFile] = useState(null);
  const [selectedStates, setSelectedStates] = useState([]);
  const [searchState, setSearchState] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isEditMode) {
      const fetchAdData = async () => {
        try {
          setLoading(true);
          const res = await adService.getAdById(adId);
          if (res.success) {
            const ad = res.ad;
            setCaption(ad.caption || '');
            setLink(ad.link || '');
            setAdType(ad.adType || 'shop');
            setWhatsappNumber(ad.whatsappNumber || '');
            setWelcomeMessage(ad.welcomeMessage || '');
            setMusicName(ad.music?.name || '');
            setSelectedStates(ad.targetStates || []);
            setMediaPreview(ad.media?.url || '');
            setMediaType(ad.media?.type || '');
            setIsActive(ad.isActive !== false);
          }
        } catch (err) {
          console.error("Failed to fetch ad details:", err);
          alert("Error loading ad details");
        } finally {
          setLoading(false);
        }
      };
      fetchAdData();
    }
  }, [adId, isEditMode]);

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMedia(file);
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setMediaType(type);
      
      const reader = new FileReader();
      reader.onload = () => setMediaPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const toggleState = (state) => {
    if (selectedStates.includes(state)) {
      setSelectedStates(selectedStates.filter(s => s !== state));
    } else {
      setSelectedStates([...selectedStates, state]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!media && !isEditMode) return alert('Please upload a video or photo');
    if (!caption.trim()) return alert('Please enter a caption');
    if (adType === 'shop' && !link.trim()) return alert('Please enter a shop link');
    if (adType === 'chat') {
      if (!whatsappNumber.trim()) return alert('Please enter WhatsApp number');
      if (!welcomeMessage.trim()) return alert('Please enter welcome message');
    }
    if (selectedStates.length === 0) return alert('Please select at least one target state');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('media', media);
      formData.append('caption', caption);
      formData.append('link', link);
      formData.append('adType', adType);
      formData.append('whatsappNumber', whatsappNumber);
      formData.append('welcomeMessage', welcomeMessage);
      formData.append('musicName', musicName);
      formData.append('isActive', isActive);
      if (musicFile) formData.append('musicFile', musicFile);
      formData.append('targetStates', JSON.stringify(selectedStates));
      formData.append('isPlatformAd', 'true');

      let res;
      if (isEditMode) {
        res = await adService.updateAdAdmin(adId, formData);
      } else {
        res = await adService.createAd(formData);
      }

      if (res.success) {
        alert(isEditMode ? 'Advertisement updated successfully!' : 'Advertisement created successfully!');
        navigate('/admin/ads');
      }
    } catch (error) {
      console.error('Failed to create ad:', error);
      alert('Failed to create advertisement');
    } finally {
      setLoading(false);
    }
  };

  const filteredStates = INDIAN_STATES.filter(s => 
    s.toLowerCase().includes(searchState.toLowerCase())
  );

  return (
    <div className="admin-page p-6 bg-[#FAFAFA] dark:bg-[#0A0A0A] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1A1A] border border-[#EEE] dark:border-[#333] flex items-center justify-center hover:bg-[#F5F5F5] transition-all"
          >
            <BiChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-[24px] font-black text-[#1A1A1A] dark:text-white">
              {isEditMode ? 'Edit Advertisement' : 'Create Advertisement'}
            </h1>
            <p className="text-[#666] dark:text-[#AAA] text-[14px]">
              {isEditMode ? 'Modify your campaign details and settings.' : 'Launch a new sponsored campaign for the platform.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Media Upload */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#111] p-6 rounded-[24px] border border-[#EEE] dark:border-[#222] shadow-sm">
              <h3 className="text-[16px] font-bold mb-4">Media Content <span className="text-red-500">*</span></h3>
              <div 
                onClick={() => fileInputRef.current.click()}
                className="aspect-[9/16] bg-[#F8F8F8] dark:bg-[#1A1A1A] rounded-[20px] border-2 border-dashed border-[#DDD] dark:border-[#333] flex flex-col items-center justify-center cursor-pointer hover:border-[#FE2C55] transition-all relative overflow-hidden group"
              >
                {mediaPreview ? (
                  mediaType === 'video' ? (
                    <video src={mediaPreview} className="w-full h-full object-cover" autoPlay muted loop />
                  ) : (
                    <img src={mediaPreview} className="w-full h-full object-cover" alt="preview" />
                  )
                ) : (
                  <>
                    <BiCloudUpload size={48} className="text-[#999] group-hover:text-[#FE2C55] mb-2" />
                    <p className="text-[#666] font-medium">Click to upload photo or video</p>
                    <p className="text-[#999] text-[12px]">Recommended ratio: 9:16</p>
                  </>
                )}
                {mediaPreview && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white font-bold">Change Media</p>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleMediaSelect}
                accept="video/*,image/*"
                className="hidden"
              />
            </div>

            {/* Optional Music Section */}
            <div className="bg-white dark:bg-[#111] p-6 rounded-[24px] border border-[#EEE] dark:border-[#222] shadow-sm">
              <h3 className="text-[16px] font-bold mb-4 flex items-center gap-2">
                <BiMusic className="text-[#FE2C55]" />
                Background Music (Optional)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-bold text-[#666] uppercase mb-1 block">Music Name</label>
                  <input 
                    type="text"
                    value={musicName}
                    onChange={(e) => setMusicName(e.target.value)}
                    placeholder="e.g. Chill Beats"
                    className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] px-4 py-2.5 rounded-xl text-[14px] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#666] uppercase mb-1 block">Audio File</label>
                  <input 
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setMusicFile(e.target.files[0])}
                    className="w-full text-[13px] text-[#666]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Details & Targeting */}
          <div className="space-y-6">
            {/* Campaign Details */}
            <div className="bg-white dark:bg-[#111] p-6 rounded-[24px] border border-[#EEE] dark:border-[#222] shadow-sm">
              <h3 className="text-[16px] font-bold mb-4 text-[#1A1A1A] dark:text-white">Campaign Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-bold text-[#666] uppercase mb-1 block">Ad Objective <span className="text-red-500">*</span></label>
                  <div className="flex bg-[#F5F5F5] dark:bg-[#1A1A1A] p-1 rounded-xl">
                    <button 
                      onClick={() => setAdType('shop')}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${adType === 'shop' ? 'bg-white dark:bg-[#333] shadow-sm text-[#FE2C55]' : 'text-[#666]'}`}
                    >
                      Shop (Link)
                    </button>
                    <button 
                      onClick={() => setAdType('chat')}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${adType === 'chat' ? 'bg-white dark:bg-[#333] shadow-sm text-[#FE2C55]' : 'text-[#666]'}`}
                    >
                      Chat (WhatsApp)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[#666] uppercase mb-1 block">Caption <span className="text-red-500">*</span></label>
                  <textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Enter ad caption..."
                    className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] px-4 py-2.5 rounded-xl text-[14px] outline-none min-h-[100px] resize-none"
                  />
                </div>

                {adType === 'shop' ? (
                  <div>
                    <label className="text-[12px] font-bold text-[#666] uppercase mb-1 block">Shop URL <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-2 bg-[#F5F5F5] dark:bg-[#1A1A1A] px-4 py-2.5 rounded-xl">
                      <BiLink className="text-[#999]" />
                      <input 
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://example.com/shop"
                        className="flex-1 bg-transparent text-[14px] outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[12px] font-bold text-[#666] uppercase mb-1 block">WhatsApp Number <span className="text-red-500">*</span></label>
                      <input 
                        type="tel"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] px-4 py-2.5 rounded-xl text-[14px] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-[#666] uppercase mb-1 block">Welcome Message <span className="text-red-500">*</span></label>
                      <textarea 
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        placeholder="Pre-filled message for WhatsApp..."
                        className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] px-4 py-2.5 rounded-xl text-[14px] outline-none min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                )}

                {isEditMode && (
                  <div>
                    <label className="text-[12px] font-bold text-[#666] uppercase mb-1 block">Campaign Status</label>
                    <div className="flex bg-[#F5F5F5] dark:bg-[#1A1A1A] p-1 rounded-xl">
                      <button 
                        onClick={() => setIsActive(true)}
                        className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${isActive ? 'bg-white dark:bg-[#333] shadow-sm text-[#10b981]' : 'text-[#666]'}`}
                      >
                        Active
                      </button>
                      <button 
                        onClick={() => setIsActive(false)}
                        className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${!isActive ? 'bg-white dark:bg-[#333] shadow-sm text-[#EF4444]' : 'text-[#666]'}`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Targeting */}
            <div className="bg-white dark:bg-[#111] p-6 rounded-[24px] border border-[#EEE] dark:border-[#222] shadow-sm">
              <h3 className="text-[16px] font-bold mb-4 flex items-center gap-2 text-[#1A1A1A] dark:text-white">
                <BiMap className="text-[#FE2C55]" />
                Target States <span className="text-red-500">*</span>
              </h3>
              
              <div className="mb-4">
                <input 
                  type="text"
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value)}
                  placeholder="Search states in India..."
                  className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] px-4 py-2.5 rounded-xl text-[14px] outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2 mb-4 max-h-[150px] overflow-y-auto p-2 border border-[#F0F0F0] dark:border-[#222] rounded-xl">
                {filteredStates.map(state => (
                  <button 
                    key={state}
                    onClick={() => toggleState(state)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-2 ${
                      selectedStates.includes(state) 
                        ? 'bg-[#FE2C55] text-white' 
                        : 'bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666] hover:bg-[#EEE]'
                    }`}
                  >
                    {state}
                    {selectedStates.includes(state) && <BiCheck size={14} />}
                  </button>
                ))}
              </div>
              <p className="text-[#999] text-[11px] italic">
                {selectedStates.length} states selected. Your ad will only show in these locations.
              </p>
            </div>

            {/* Submit */}
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#FE2C55] text-white py-4 rounded-[20px] font-black text-[16px] hover:bg-[#E2264D] transition-all shadow-xl shadow-[#FE2C55]/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isEditMode ? 'Update Advertisement' : 'Launch Advertisement'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCreateAd;
