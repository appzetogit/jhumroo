import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiCloudUpload, BiX, BiMap, BiLink, BiMusic } from 'react-icons/bi';
import AdCalendarPicker from '../../../../components/AdCalendarPicker';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import adService from '../../../../services/adService';

import { INDIAN_STATES, STATE_DISTRICTS } from '../../../../utils/indiaLocations';

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia", 
  "Germany", "France", "United Arab Emirates", "Saudi Arabia", "Singapore",
  "Japan", "China", "Brazil", "South Africa", "Italy", "Spain", "Mexico"
];

const COUNTRY_STATES = {
  "India": INDIAN_STATES,
  "United States": [
    "California", "Texas", "New York", "Florida", "Illinois", "Pennsylvania", "Ohio",
    "Georgia", "North Carolina", "Michigan", "Washington", "Arizona", "Massachusetts"
  ],
  "United Kingdom": [
    "England", "Scotland", "Wales", "Northern Ireland"
  ],
  "Canada": [
    "Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba", "Saskatchewan"
  ]
};

const CreateAdPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { user: reqUser } = useAuth();
  const fileInputRef = useRef(null);
  
  const [pricing, setPricing] = useState({ shopPricePerDay: 0, chatPricePerDay: 0 });
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
  const [targetCountry, setTargetCountry] = useState('India');
  const [targetStates, setTargetStates] = useState([]);
  const [targetDistricts, setTargetDistricts] = useState([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Today's date string for min validation
  const todayStr = new Date().toISOString().split('T')[0];

  // Compute duration and total price
  const pricePerDay = adType === 'chat' ? pricing.chatPricePerDay : pricing.shopPricePerDay;
  const durationDays = (() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();
  const totalAmount = Math.round(pricePerDay * durationDays);

  // Helpers used by quick-select buttons
  const applyStartDate = (ymd) => setStartDate(ymd);
  const applyEndDate = (ymd) => setEndDate(ymd);

  // Google Maps API Key from env
  const GOOGLE_MAP_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API_KEY;

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await adService.getPricing();
        if (res.success && res.pricing) {
          setPricing({
            shopPricePerDay: res.pricing.shopPricePerDay ?? res.pricing.shopPrice ?? 0,
            chatPricePerDay: res.pricing.chatPricePerDay ?? res.pricing.chatPrice ?? 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
      }
    };
    fetchPricing();
  }, []);

  useEffect(() => {
    const scriptId = 'google-maps-script';
    let existingScript = document.getElementById(scriptId);

    const handleLoad = () => {
      if (window.google && window.google.maps) {
        setIsMapLoaded(true);
      }
    };

    if (window.google && window.google.maps) {
      setIsMapLoaded(true);
      return;
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad);
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAP_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = handleLoad;
      document.head.appendChild(script);
      existingScript = script;
    }

    return () => {
      if (existingScript) {
        existingScript.removeEventListener('load', handleLoad);
      }
    };
  }, [GOOGLE_MAP_API_KEY]);

  const handleFileSelect = (e) => {
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

  const toggleDistrict = (district) => {
    if (targetDistricts.includes(district)) {
      setTargetDistricts(targetDistricts.filter(d => d !== district));
    } else {
      setTargetDistricts([...targetDistricts, district]);
    }
  };

  const toggleState = (stateName) => {
    if (targetStates.includes(stateName)) {
      setTargetStates(targetStates.filter(s => s !== stateName));
      if (targetCountry === 'India' && STATE_DISTRICTS[stateName]) {
        const districtsToRemove = STATE_DISTRICTS[stateName];
        setTargetDistricts(prev => prev.filter(d => !districtsToRemove.includes(d)));
      }
    } else {
      setTargetStates([...targetStates, stateName]);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!media) return alert('Please upload a video or photo for your advertisement');
    if (!caption.trim()) return alert('Please enter a caption for your ad');
    
    // Date range validation
    if (!startDate || !endDate) return alert('Please select a start date and end date for your advertisement.');
    if (durationDays < 1) return alert('End date must be after start date.');

    // Ad type specific validation
    if (adType === 'shop') {
      if (!link.trim()) return alert('Please enter the Shop Link (URL)');
    } else if (adType === 'chat') {
      if (!whatsappNumber.trim()) return alert('Please enter the WhatsApp number');
      const whatsappRegex = /^\d{10}$/;
      if (!whatsappRegex.test(whatsappNumber.trim())) {
        return alert('WhatsApp number must be exactly 10 digits and contain only numbers.');
      }
      if (!welcomeMessage.trim()) return alert('Please enter the pre-filled welcome message');
    }


    // Geographic targeting validation
    if (!targetCountry) {
      return alert('Please select a target country.');
    }

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
      if (musicFile) {
        formData.append('musicFile', musicFile);
      }
      formData.append('targetCountry', targetCountry);
      formData.append('targetState', JSON.stringify(targetStates));
      formData.append('targetDistricts', JSON.stringify(targetDistricts));
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);

      const res = await adService.createAd(formData);
      if (res.success) {
        if (res.order) {
          const isScriptLoaded = await loadRazorpayScript();
          if (!isScriptLoaded) {
            alert('Failed to load Razorpay SDK. Please check your internet connection.');
            setLoading(false);
            return;
          }

          const options = {
            key: res.razorpayKeyId,
            amount: res.order.amount,
            currency: res.order.currency,
            name: 'Jhumroo Ads',
            description: `Create Advertisement (${adType === 'shop' ? 'Shop Link' : 'Chat WhatsApp'})`,
            order_id: res.order.id,
            handler: async function (response) {
              setLoading(true);
              try {
                const verifyRes = await adService.verifyPayment({
                  adId: res.ad._id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });
                if (verifyRes.success) {
                  alert('Payment successful! Your advertisement has been submitted for admin approval.');
                  navigate('/settings/ads-manager');
                } else {
                  alert(verifyRes.message || 'Payment verification failed.');
                }
              } catch (verifyErr) {
                console.error('Payment verification error:', verifyErr);
                alert('Failed to verify payment with server. Please contact support.');
              } finally {
                setLoading(false);
              }
            },
            prefill: {
              name: reqUser?.fullName || '',
              email: reqUser?.email || '',
              contact: reqUser?.phoneNumber || ''
            },
            theme: {
              color: '#FE2C55',
            },
            modal: {
              ondismiss: async function () {
                try {
                  await adService.deleteAd(res.ad._id);
                } catch (err) {
                  console.error('Failed to clean up unpaid ad:', err);
                }
                alert('Payment cancelled.');
              }
            }
          };

          const paymentObject = new window.Razorpay(options);
          paymentObject.open();
        } else {
          alert('Advertisement created successfully!');
          navigate('/settings/ads-manager');
        }
      }
    } catch (error) {
      console.error('Failed to create ad:', error);
      alert('Failed to create advertisement. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0 border-b theme-panel-divider">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(-1)}
            className="theme-icon-button w-10 h-10 rounded-full flex items-center justify-center"
          >
            <BiChevronLeft size={24} className="theme-text-primary" />
          </button>
          <h2 className="theme-text-primary text-[17px] font-bold">Create Advertisement</h2>
        </div>
        <span className="w-10 h-10" aria-hidden="true" />
      </div>

      <div className="scrollable flex-1 px-4 pb-28">
        <div className="flex flex-col gap-6 mt-6">
          {/* Media Upload */}
          <div 
            onClick={() => fileInputRef.current.click()}
            className="relative aspect-[3/4] rounded-[24px] border-2 border-dashed theme-panel-divider bg-black/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
          >
            {mediaPreview ? (
              <>
                {mediaType === 'video' ? (
                  <video src={mediaPreview} className="w-full h-full object-cover" />
                ) : (
                  <img src={mediaPreview} className="w-full h-full object-cover" alt="" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-full text-[13px]">Change Media</span>
                </div>
              </>
            ) : (
              <>
                <BiCloudUpload size={48} className="theme-text-muted mb-2" />
                <p className="theme-text-primary font-bold text-[15px]">Upload Video or Photo</p>
                <p className="theme-text-muted text-[12px] mt-1">Recommended: 1080x1920 (9:16)</p>
              </>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="video/*,image/*" 
              className="hidden" 
              onChange={handleFileSelect} 
            />
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            {/* Ad Type Toggle */}
            <div className="theme-panel-card p-1 rounded-[24px] flex gap-1">
              <button 
                onClick={() => setAdType('shop')}
                className={`flex-1 py-3 rounded-[20px] font-bold text-[14px] transition-all ${adType === 'shop' ? 'bg-[#FE2C55] text-white shadow-lg' : 'theme-text-primary hover:bg-black/5'}`}
              >
                Shop (Link)
              </button>
              <button 
                onClick={() => setAdType('chat')}
                className={`flex-1 py-3 rounded-[20px] font-bold text-[14px] transition-all ${adType === 'chat' ? 'bg-[#FE2C55] text-white shadow-lg' : 'theme-text-primary hover:bg-black/5'}`}
              >
                Chat (WhatsApp)
              </button>
            </div>

            {/* Date Range Picker */}
            <div className="theme-panel-card p-4 rounded-[20px]">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[20px]">📅</span>
                <div>
                  <h3 className="theme-text-primary text-[15px] font-bold">Ad Duration <span className="text-red-500">*</span></h3>
                  <p className="theme-text-muted text-[12px]">Choose the dates your ad will be live.</p>
                </div>
              </div>
              {/* Calendar Picker */}
              <AdCalendarPicker
                startDate={startDate}
                endDate={endDate}
                onStartChange={(ymd) => {
                  setStartDate(ymd);
                  if (endDate && ymd >= endDate) setEndDate('');
                }}
                onEndChange={(ymd) => setEndDate(ymd)}
                isDarkMode={isDarkMode}
              />

              {/* Live Cost Calculator */}
              {durationDays > 0 ? (
                <div className="mt-4 rounded-[16px] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(254,44,85,0.08) 0%, rgba(254,44,85,0.03) 100%)', border: '1px solid rgba(254,44,85,0.2)' }}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#FE2C55] text-[18px]">🧮</span>
                      <div>
                        <p className="theme-text-primary text-[13px] font-bold">{durationDays} day{durationDays !== 1 ? 's' : ''} × ₹{pricePerDay}/day</p>
                        <p className="theme-text-muted text-[11px]">Total campaign cost</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[#FE2C55] text-[22px] font-black">₹{totalAmount}</p>
                    </div>
                  </div>
                </div>
              ) : (
                pricePerDay > 0 && (
                  <div className="mt-3 px-3 py-2 rounded-xl bg-black/5 flex items-center gap-2">
                    <span className="theme-text-muted text-[12px]">Rate: <strong className="text-[#FE2C55]">₹{pricePerDay}/day</strong> · Pick dates above to see total</span>
                  </div>
                )
              )}
            </div>

            <div className="theme-panel-card p-4 rounded-[20px]">
              <label className="theme-text-primary text-[11px] font-bold uppercase tracking-wider mb-1 block">
                Caption <span className="text-red-500">*</span>
              </label>
              <textarea 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a catchy caption for your ad..."
                className="w-full bg-transparent theme-text-primary text-[15px] outline-none resize-none min-h-[80px]"
              />
            </div>

            {/* Optional Music Section */}
            <div className="theme-panel-card p-4 rounded-[20px]">
              <div className="flex items-center gap-3 mb-3">
                <BiMusic size={20} className="theme-text-muted" />
                <h4 className="theme-text-primary font-bold text-[15px]">Background Music (Optional)</h4>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="theme-text-primary text-[11px] font-bold uppercase tracking-wider mb-1 block">Music Name</label>
                  <input 
                    type="text"
                    value={musicName}
                    onChange={(e) => setMusicName(e.target.value)}
                    placeholder="e.g. Chill Summer Lo-fi"
                    className="w-full bg-transparent theme-text-primary text-[14px] outline-none border-b theme-panel-divider pb-1"
                  />
                </div>
                <div>
                  <label className="theme-text-primary text-[11px] font-bold uppercase tracking-wider mb-1 block">Audio File</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="file"
                      accept="audio/*"
                      id="music-upload"
                      className="hidden"
                      onChange={(e) => setMusicFile(e.target.files[0])}
                    />
                    <label 
                      htmlFor="music-upload"
                      className="bg-black/5 dark:bg-white/5 theme-text-primary px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer hover:bg-black/10 transition-colors"
                    >
                      {musicFile ? 'Change Audio' : 'Upload Audio'}
                    </label>
                    {musicFile && (
                      <span className="theme-text-muted text-[11px] truncate flex-1">
                        {musicFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {adType === 'shop' ? (
              <div className="theme-panel-card p-4 rounded-[20px] flex items-center gap-3 animate-slide-in">
                <BiLink size={20} className="theme-text-muted" />
                <div className="flex-1">
                  <label className="theme-text-primary text-[11px] font-bold uppercase tracking-wider mb-0.5 block">
                    Shop Link (URL) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://example.com/shop"
                    className="w-full bg-transparent theme-text-primary text-[15px] outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-slide-in">
                <div className="theme-panel-card p-4 rounded-[20px] flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <label className="theme-text-primary text-[11px] font-bold uppercase tracking-wider mb-0.5 block">
                      WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) {
                          setWhatsappNumber(val);
                        }
                      }}
                      placeholder="Enter Whatsapp Number"
                      maxLength={10}
                      className="w-full bg-transparent theme-text-primary text-[15px] outline-none"
                    />
                  </div>
                </div>
                <div className="theme-panel-card p-4 rounded-[20px]">
                  <label className="theme-text-primary text-[11px] font-bold uppercase tracking-wider mb-1 block">
                    Pre-filled Welcome Message <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="e.g. Hello! I'm interested in your product..."
                    className="w-full bg-transparent theme-text-primary text-[15px] outline-none resize-none min-h-[60px]"
                  />
                </div>
              </div>
            )}

            {/* Targeting Section */}
            <div className="theme-panel-card p-4 rounded-[20px]">
              <div className="flex items-center gap-3 mb-4">
                <BiMap size={20} className="text-[#FE2C55]" />
                <div>
                  <h3 className="theme-text-primary text-[15px] font-bold">Target Locations <span className="text-red-500">*</span></h3>
                  <p className="theme-text-muted text-[12px]">Your ad will show strictly to users in this location.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="theme-text-primary text-[11px] font-bold uppercase tracking-wider mb-1 block">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={targetCountry}
                    onChange={(e) => {
                      setTargetCountry(e.target.value);
                      setTargetStates([]);
                      setTargetDistricts([]);
                    }}
                    className="w-full theme-panel-divider border rounded-xl px-4 py-3 bg-black/5 theme-text-primary text-[14px] outline-none appearance-none"
                  >
                    {COUNTRIES.map(country => (
                      <option className="bg-white text-black dark:bg-[#1A1A1A] dark:text-white" key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="theme-text-primary text-[11px] font-bold uppercase tracking-wider mb-1 block">
                    States (Optional)
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {targetStates.map(state => (
                      <div key={state} className="bg-[#FE2C55]/10 text-[#FE2C55] px-3 py-1.5 rounded-full flex items-center gap-1 text-[13px] font-bold">
                        {state}
                        <button type="button" onClick={() => toggleState(state)}><BiX size={16} /></button>
                      </div>
                    ))}
                    {targetStates.length === 0 && <p className="text-[13px] theme-text-muted italic mb-2">All States</p>}
                  </div>

                  {COUNTRY_STATES[targetCountry] ? (
                    <select 
                      value=""
                      onChange={(e) => {
                        if (e.target.value) toggleState(e.target.value);
                      }}
                      className="w-full theme-panel-divider border rounded-xl px-4 py-3 bg-black/5 theme-text-primary text-[14px] outline-none appearance-none"
                    >
                      <option className="bg-white text-black dark:bg-[#1A1A1A] dark:text-white" value="">Select to add a state...</option>
                      {COUNTRY_STATES[targetCountry]
                        .filter(state => !targetStates.includes(state))
                        .map(state => (
                          <option className="bg-white text-black dark:bg-[#1A1A1A] dark:text-white" key={state} value={state}>{state}</option>
                        ))}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        id="custom-state-input"
                        placeholder="Enter state name and click add"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.target.value.trim();
                            if (val && !targetStates.includes(val)) {
                              toggleState(val);
                              e.target.value = '';
                            }
                          }
                        }}
                        className="flex-1 theme-panel-divider border rounded-xl px-4 py-3 bg-black/5 theme-text-primary text-[14px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('custom-state-input');
                          const val = input?.value.trim();
                          if (val && !targetStates.includes(val)) {
                            toggleState(val);
                            input.value = '';
                          }
                        }}
                        className="bg-[#FE2C55] text-white px-4 rounded-xl text-[13px] font-bold"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="theme-text-primary text-[11px] font-bold uppercase tracking-wider mb-1 block">
                    Districts / Cities (Optional)
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {targetDistricts.map(district => (
                      <div key={district} className="bg-[#FE2C55]/10 text-[#FE2C55] px-3 py-1.5 rounded-full flex items-center gap-1 text-[13px] font-bold">
                        {district}
                        <button type="button" onClick={() => toggleDistrict(district)}><BiX size={16} /></button>
                      </div>
                    ))}
                    {targetDistricts.length === 0 && <p className="text-[13px] theme-text-muted italic mb-2">All Districts / Cities</p>}
                  </div>

                  {targetCountry === 'India' ? (
                    targetStates.length > 0 ? (
                      (() => {
                        const availableDistricts = targetStates.reduce((acc, state) => {
                          if (STATE_DISTRICTS[state]) {
                            return [...acc, ...STATE_DISTRICTS[state]];
                          }
                          return acc;
                        }, []);
                        return (
                          <select 
                            value=""
                            onChange={(e) => {
                              if (e.target.value) toggleDistrict(e.target.value);
                            }}
                            className="w-full theme-panel-divider border rounded-xl px-4 py-3 bg-black/5 theme-text-primary text-[14px] outline-none appearance-none"
                          >
                            <option className="bg-white text-black dark:bg-[#1A1A1A] dark:text-white" value="">Select to add a district...</option>
                            {availableDistricts
                              .filter(d => !targetDistricts.includes(d))
                              .map(district => (
                                <option className="bg-white text-black dark:bg-[#1A1A1A] dark:text-white" key={district} value={district}>{district}</option>
                              ))}
                          </select>
                        );
                      })()
                    ) : (
                      <input 
                        type="text"
                        value=""
                        onChange={() => {}}
                        placeholder="Select a state first to see districts"
                        disabled
                        className="w-full theme-panel-divider border rounded-xl px-4 py-3 bg-black/5 theme-text-primary text-[14px] outline-none opacity-50 cursor-not-allowed"
                      />
                    )
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        id="custom-district-input"
                        placeholder="Enter city/district name and click add"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.target.value.trim();
                            if (val && !targetDistricts.includes(val)) {
                              toggleDistrict(val);
                              e.target.value = '';
                            }
                          }
                        }}
                        className="flex-1 theme-panel-divider border rounded-xl px-4 py-3 bg-black/5 theme-text-primary text-[14px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('custom-district-input');
                          const val = input?.value.trim();
                          if (val && !targetDistricts.includes(val)) {
                            toggleDistrict(val);
                            input.value = '';
                          }
                        }}
                        className="bg-[#FE2C55] text-white px-4 rounded-xl text-[13px] font-bold"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed footer Pay/Create button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-3 theme-panel-card border-t theme-panel-divider" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={handleSubmit}
          disabled={loading || !media}
          className={`w-full h-[52px] rounded-full font-bold text-[16px] transition-all active:scale-[0.98] ${
            loading || !media ? 'bg-gray-300 text-gray-500' : 'bg-[#FE2C55] text-white'
          }`}
        >
          {loading ? 'Processing...' : (
            pricePerDay > 0 && durationDays > 0
              ? `Pay ₹${totalAmount}`
              : pricePerDay > 0
              ? `₹${pricePerDay}/day`
              : 'Create'
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateAdPage;
