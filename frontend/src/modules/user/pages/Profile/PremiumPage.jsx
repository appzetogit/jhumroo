import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiArrowBack, BiCheckCircle } from 'react-icons/bi';
import { useAuth } from '../../../../context/AuthContext';
import premiumService from '../../../../services/premiumService';

const PREMIUM_FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 w-5 h-5 drop-shadow-[0_2px_6px_rgba(245,158,11,0.3)]">
        <path d="M2 19h20v2H2zm1-4h18v2H3zm9-12.2L16.2 8l4.8-4.8L19 13.8H5L3 3.2 7.8 8z" />
      </svg>
    ),
    title: 'Go Live',
    desc: 'Going live with your followers for meetups online'
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 w-5 h-5">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="17" x2="22" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
      </svg>
    ),
    title: 'Ultra HD 4K Uploads',
    desc: 'Publish your reels in flawless high-definition and maximum bitrate for crystal-clear playback.'
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    ),
    title: 'Ad-Free Browsing',
    desc: 'Enjoy an uninterrupted journey on Jhumroo without any ads or sponsor banners.'
  }
];

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PremiumPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [monthlyPrice, setMonthlyPrice] = useState(199);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Check active premium status
  const isUserPremium = Boolean(
    user?.isPremium &&
    user?.premiumExpiresAt &&
    new Date(user.premiumExpiresAt) > new Date()
  );

  const formattedExpiryDate = user?.premiumExpiresAt
    ? new Date(user.premiumExpiresAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    : null;

  const daysRemaining = user?.premiumExpiresAt
    ? Math.max(0, Math.ceil((new Date(user.premiumExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      const res = await premiumService.getPlan();
      if (res.success && res.plan) {
        setMonthlyPrice(res.plan.monthlyPrice);
      }
    } catch (err) {
      console.error('Failed to fetch premium plan details:', err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setPurchasing(true);
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        showToast('Failed to load Razorpay SDK. Please check your internet.', 'error');
        setPurchasing(false);
        return;
      }

      const res = await premiumService.createOrder();
      if (!res.success || !res.order) {
        showToast(res.message || 'Failed to initiate premium order.', 'error');
        setPurchasing(false);
        return;
      }

      const options = {
        key: res.razorpayKeyId,
        amount: res.order.amount,
        currency: res.order.currency || 'INR',
        name: 'Jhumroo Elite',
        description: '30 Days Premium Subscription',
        order_id: res.order.id,
        handler: async function (response) {
          setPurchasing(true);
          try {
            const verifyRes = await premiumService.verifyPayment({
              subscriptionId: res.subscriptionId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.success) {
              if (verifyRes.user) {
                updateUser({
                  ...verifyRes.user,
                  isOnboarded: true,
                  isProfileCompleted: true
                });
              }
              showToast('Congratulations! You are now a Jhumroo Premium member! 👑', 'success');
            } else {
              showToast(verifyRes.message || 'Payment verification failed.', 'error');
            }
          } catch (verifyErr) {
            console.error('Premium verification error:', verifyErr);
            showToast('Payment verification error with server.', 'error');
          } finally {
            setPurchasing(false);
          }
        },
        prefill: {
          name: user.fullName || user.username || '',
          email: user.email || '',
          contact: user.phoneNumber || ''
        },
        theme: {
          color: '#F59E0B' // Amber/Gold brand tone
        },
        modal: {
          ondismiss: function () {
            setPurchasing(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error('Purchase flow error:', err);
      showToast(err.response?.data?.message || 'Failed to start payment.', 'error');
      setPurchasing(false);
    }
  };

  return (
    <div className="page-container !pb-8 bg-[#0F0F14] text-white flex flex-col min-h-screen relative overflow-x-hidden overflow-y-auto no-scrollbar select-none">
      {/* Background Neon Glow Effects */}
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-amber-500/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-[40px] right-[-60px] w-[260px] h-[260px] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200 border bg-black/85 border-amber-500/40 text-amber-300">
          <BiCheckCircle size={18} className={toastMessage.type === 'error' ? 'text-red-400' : 'text-amber-400'} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition-transform hover:bg-white/10"
        >
          <BiArrowBack size={20} className="text-white" />
        </button>
        <span className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-amber-500">Jhumroo Elite</span>
        <div className="w-10 h-10" />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 flex flex-col items-center z-10 text-center pb-8 max-w-md mx-auto w-full">
        {/* Crown Icon Box */}
        <div className="relative mt-2 mb-3 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-pink-500 rounded-3xl blur-[18px] opacity-40 animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-pink-600 p-[1.5px]">
            <div className="w-full h-full bg-[#0F0F14] rounded-[22px] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]"
              >
                <path d="M2 19h20v2H2zm1-4h18v2H3zm9-12.2L16.2 8l4.8-4.8L19 13.8H5L3 3.2 7.8 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black tracking-tight mb-1 text-white shrink-0">
          Jhumroo <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-500 bg-clip-text text-transparent">Premium</span>
        </h1>

        {/* Pricing & Status Tag */}
        {isUserPremium ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] font-bold text-emerald-400">
              Active Member · Valid until {formattedExpiryDate}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 mb-5 shrink-0">
            <span className="text-[12px] font-extrabold tracking-wider text-amber-300 uppercase">
              ₹{monthlyPrice} / Month
            </span>
          </div>
        )}

        {/* Features List */}
        <div className="w-full text-left space-y-4 bg-white/[0.03] border border-white/[0.08] p-5 rounded-3xl backdrop-blur-md shrink-0 shadow-xl">
          <h3 className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-gray-400 mb-2">Exclusive Benefits</h3>
          {PREMIUM_FEATURES.map((feat, i) => (
            <div key={i} className="flex gap-3.5 items-start">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                {feat.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[14px] font-bold text-white mb-0.5">{feat.title}</h4>
                <p className="text-[12px] text-gray-400 leading-normal">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Active Premium: Countdown Widget | Non-Premium: Purchase Button */}
        <div className="w-full mt-6">
          {isUserPremium ? (
            <div className="w-full py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_8px_25px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2 select-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
              </svg>
              <span>
                {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} Remaining
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePurchase}
                disabled={purchasing || loadingPlan}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.98] transition-all duration-200 shadow-[0_8px_25px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                {purchasing ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Processing Razorpay...
                  </span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M2 19h20v2H2zm1-4h18v2H3zm9-12.2L16.2 8l4.8-4.8L19 13.8H5L3 3.2 7.8 8z" />
                    </svg>
                    <span>Purchase Premium · ₹{monthlyPrice}/mo</span>
                  </>
                )}
              </button>

              <p className="mt-2.5 text-[11px] text-gray-500 text-center">
                Secured by Razorpay · Instant activation
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
