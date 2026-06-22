import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiHistory, BiTimeFive, BiCheckCircle, BiPlayCircle, BiLoaderAlt } from 'react-icons/bi';
import { useToast } from '../../../../context/ToastContext';
import userService from '../../../../services/userService';

const SupportPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        reason: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    
    // History state
    const [showHistory, setShowHistory] = useState(false);
    const [myRequests, setMyRequests] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    React.useEffect(() => {
        fetchMyRequests();
    }, []);

    const fetchMyRequests = async () => {
        setLoadingHistory(true);
        try {
            const res = await userService.getMySupportRequests();
            if (res.success) {
                setMyRequests(res.requests);
            }
        } catch (error) {
            console.error('Failed to fetch support history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const cleanName = formData.name.trim();
        const cleanEmail = formData.email.trim();
        const cleanPhone = formData.phoneNumber.trim();

        // Validate Full Name
        const nameRegex = /^[a-zA-Z]{2,}(?:\s+[a-zA-Z]+)*$/;
        if (!nameRegex.test(cleanName)) {
            showToast('Please enter a valid full name (letters and spaces only, min 2 characters)', 'error');
            return;
        }

        // Validate Email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|co|in|net|org|edu|gov|mil|info|biz)$/i;
        if (!emailRegex.test(cleanEmail)) {
            showToast('Please enter a valid email address (e.g. name@domain.com)', 'error');
            return;
        }
        const domain = cleanEmail.split('@')[1].toLowerCase();
        if (domain.includes('gamil') || domain.includes('gmaill') || domain.includes('yaho') || domain.includes('hotmal')) {
            showToast('Please enter a valid email domain (e.g. @gmail.com)', 'error');
            return;
        }

        // Validate Phone Number
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(cleanPhone)) {
            showToast('Please enter a valid 10-digit mobile number', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await userService.submitSupportRequest({
                name: cleanName,
                email: cleanEmail,
                phoneNumber: cleanPhone,
                reason: formData.reason
            });
            if (res.success) {
                setShowPopup(true);
                setFormData({ name: '', email: '', phoneNumber: '', reason: '' });
            }
        } catch (error) {
            console.error('Support request failed:', error);
            showToast('Failed to submit support request. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen font-sans">
            {/* Header */}
            <div className="theme-page-header flex items-center px-4 pt-6 pb-4">
                <div 
                  className="theme-icon-button w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                  onClick={() => showHistory ? setShowHistory(false) : navigate(-1)}
                >
                    <BiChevronLeft size={24} className="theme-text-primary" />
                </div>
                <h2 className="flex-1 text-[18px] font-bold theme-text-primary text-center">{showHistory ? 'Support History' : 'Support'}</h2>
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${showHistory ? 'bg-[#FE2C55] text-white' : 'theme-icon-button'}`}
                  onClick={() => setShowHistory(!showHistory)}
                >
                    <BiHistory size={22} />
                </div>
            </div>

            <div className="scrollable flex-1 px-5 pt-8 pb-24">
                <div className="max-w-md mx-auto">
                    {showHistory ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             {loadingHistory ? (
                                 <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                     <BiLoaderAlt className="animate-spin mb-2 theme-text-primary" size={32} />
                                     <p className="text-[14px] theme-text-muted">Loading history...</p>
                                 </div>
                             ) : myRequests.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                                     <BiHistory size={48} className="mb-4 theme-text-primary" />
                                     <p className="text-[15px] font-medium theme-text-primary">No support history found</p>
                                     <p className="text-[13px] theme-text-muted mt-1">Your submitted requests will appear here</p>
                                 </div>
                             ) : (
                                 myRequests.map((request) => (
                                     <div key={request._id} className="theme-panel-card rounded-[24px] p-5 border theme-panel-divider shadow-sm hover:shadow-md transition-all">
                                         <div className="flex items-center justify-between mb-4">
                                             <div className="flex items-center gap-2">
                                                 {request.status === 'pending' && <BiTimeFive className="text-yellow-500" size={18} />}
                                                 {request.status === 'resolved' && <BiCheckCircle className="text-green-500" size={18} />}
                                                 {request.status === 'in_progress' && <BiPlayCircle className="text-blue-500" size={18} />}
                                                 <span className={`text-[12px] font-bold uppercase tracking-wider ${
                                                     request.status === 'pending' ? 'text-yellow-600' : 
                                                     request.status === 'resolved' ? 'text-green-600' : 'text-blue-600'
                                                 }`}>
                                                     {request.status.replace('_', ' ')}
                                                 </span>
                                             </div>
                                             <span className="text-[11px] theme-text-muted font-medium">
                                                 {new Date(request.createdAt).toLocaleDateString()}
                                             </span>
                                         </div>
                                         <p className="text-[15px] theme-text-primary font-semibold mb-2 line-clamp-1">{request.name}</p>
                                         <p className="text-[14px] theme-text-muted leading-relaxed line-clamp-3">{request.reason}</p>
                                     </div>
                                 ))
                             )}
                        </div>
                    ) : (
                        <>
                            <p className="text-[14px] theme-text-muted mb-8 leading-relaxed">
                                Please fill out the form below and our team will get back to you as soon as possible.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[12px] font-bold theme-text-muted uppercase tracking-widest mb-2 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^[a-zA-Z\s]*$/.test(val)) {
                                                setFormData({ ...formData, name: val });
                                            }
                                        }}
                                        required
                                        placeholder="Enter your name"
                                        className="w-full h-[56px] rounded-[18px] theme-input-shell px-5 text-[15px] outline-none focus:border-[#FE2C55]/30 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold theme-text-muted uppercase tracking-widest mb-2 ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase();
                                            setFormData({ ...formData, email: val });
                                        }}
                                        required
                                        placeholder="Enter your email"
                                        className="w-full h-[56px] rounded-[18px] theme-input-shell px-5 text-[15px] outline-none focus:border-[#FE2C55]/30 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold theme-text-muted uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 10) {
                                                setFormData({ ...formData, phoneNumber: val });
                                            }
                                        }}
                                        required
                                        placeholder="Enter your phone number"
                                        className="w-full h-[56px] rounded-[18px] theme-input-shell px-5 text-[15px] outline-none focus:border-[#FE2C55]/30 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold theme-text-muted uppercase tracking-widest mb-2 ml-1">Reason for Support</label>
                                    <textarea
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleChange}
                                        required
                                        placeholder="How can we help you?"
                                        className="w-full h-32 rounded-[18px] theme-input-shell p-5 text-[15px] outline-none focus:border-[#FE2C55]/30 transition-all resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full h-[58px] rounded-[22px] bg-[#FE2C55] text-white text-[16px] font-bold shadow-lg shadow-[#FE2C55]/20 active:scale-[0.98] transition-all mt-4 ${
                                        isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {/* Success Popup */}
            {showPopup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPopup(false)} />
                    <div className="relative theme-panel-card border theme-panel-divider rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-[20px] font-bold theme-text-primary mb-3">Request Received!</h3>
                        <p className="text-[14px] theme-text-muted leading-relaxed mb-8">
                            Thank you for reaching out. Our support team will provide a resolution within <span className="font-bold theme-text-primary">24-48 hours</span>.
                        </p>
                        <button 
                            onClick={() => {
                                setShowPopup(false);
                                navigate('/settings');
                            }}
                            className="w-full h-[54px] rounded-[18px] bg-[#FE2C55] text-white font-bold active:scale-95 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportPage;
