import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiHistory, BiTimeFive, BiCheckCircle, BiPlayCircle, BiLoaderAlt } from 'react-icons/bi';
import userService from '../../../../services/userService';

const SupportPage = () => {
    const navigate = useNavigate();
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

        setIsSubmitting(true);
        try {
            const res = await userService.submitSupportRequest(formData);
            if (res.success) {
                setShowPopup(true);
                setFormData({ name: '', email: '', phoneNumber: '', reason: '' });
            }
        } catch (error) {
            console.error('Support request failed:', error);
            alert('Failed to submit support request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-container theme-surface-page flex flex-col min-h-screen font-sans bg-white">
            {/* Header */}
            <div className="flex items-center px-4 pt-6 pb-4 border-b border-gray-100">
                <div 
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                  onClick={() => showHistory ? setShowHistory(false) : navigate(-1)}
                >
                    <BiChevronLeft size={24} className="text-gray-800" />
                </div>
                <h2 className="flex-1 text-[18px] font-bold text-gray-900 text-center">{showHistory ? 'Support History' : 'Support'}</h2>
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${showHistory ? 'bg-[#FE2C55] text-white' : 'bg-gray-50 text-gray-800'}`}
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
                                    <BiLoaderAlt className="animate-spin mb-2" size={32} />
                                    <p className="text-[14px]">Loading history...</p>
                                </div>
                            ) : myRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                                    <BiHistory size={48} className="mb-4" />
                                    <p className="text-[15px] font-medium">No support history found</p>
                                    <p className="text-[13px] mt-1">Your submitted requests will appear here</p>
                                </div>
                            ) : (
                                myRequests.map((request) => (
                                    <div key={request._id} className="bg-gray-50 rounded-[24px] p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
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
                                            <span className="text-[11px] text-gray-400 font-medium">
                                                {new Date(request.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-[15px] text-gray-900 font-semibold mb-2 line-clamp-1">{request.name}</p>
                                        <p className="text-[14px] text-gray-500 leading-relaxed line-clamp-3">{request.reason}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <>
                            <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
                                Please fill out the form below and our team will get back to you as soon as possible.
                            </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Enter your name"
                                className="w-full h-[56px] rounded-[18px] bg-gray-50 border border-gray-100 px-5 text-[15px] outline-none focus:border-[#FE2C55]/30 focus:bg-white transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="Enter your email"
                                className="w-full h-[56px] rounded-[18px] bg-gray-50 border border-gray-100 px-5 text-[15px] outline-none focus:border-[#FE2C55]/30 focus:bg-white transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                required
                                placeholder="Enter your phone number"
                                className="w-full h-[56px] rounded-[18px] bg-gray-50 border border-gray-100 px-5 text-[15px] outline-none focus:border-[#FE2C55]/30 focus:bg-white transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Reason for Support</label>
                            <textarea
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                required
                                placeholder="How can we help you?"
                                className="w-full h-32 rounded-[18px] bg-gray-50 border border-gray-100 p-5 text-[15px] outline-none focus:border-[#FE2C55]/30 focus:bg-white transition-all resize-none"
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
                    <div className="relative bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-[20px] font-bold text-gray-900 mb-3">Request Received!</h3>
                        <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
                            Thank you for reaching out. Our support team will provide a resolution within <span className="font-bold text-gray-900">24-48 hours</span>.
                        </p>
                        <button 
                            onClick={() => {
                                setShowPopup(false);
                                navigate('/settings');
                            }}
                            className="w-full h-[54px] rounded-[18px] bg-gray-900 font-bold active:scale-95 transition-all"
                            style={{ color: '#ffffff' }}
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
