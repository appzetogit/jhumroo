import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiX, BiChevronLeft, BiCheck } from 'react-icons/bi';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { useToast } from '../../../../context/ToastContext';

const AddAccountSheet = ({ isOpen, onClose, onAccountAdded }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { sendOTP, verifyOTP, completeProfile } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Profile (if needed)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  // Profile completion fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [profileError, setProfileError] = useState('');

  const otpInputsRef = useRef([]);
  const startYRef = useRef(null);
  const [currentY, setCurrentY] = useState(0);

  // Reset form when opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPhoneNumber('');
      setError('');
      setOtp(['', '', '', '', '', '']);
      setFullName('');
      setUsername('');
      setProfileError('');
      setTimer(60);
      setCanResend(false);
      setAuthenticatedUser(null);
    }
  }, [isOpen]);

  // History listener for back gesture
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ addAccountOpen: true }, '');

    const handlePopState = () => {
      onClose();
      setCurrentY(0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  // Countdown timer for OTP
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      setCurrentY(0);
      if (window.history.state?.addAccountOpen) {
        window.history.back();
      }
    }, 200);
  };

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!startYRef.current) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) {
      setCurrentY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      handleClose();
    } else {
      setCurrentY(0);
    }
    startYRef.current = null;
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      setError('Please enter a valid Indian mobile number (starts with 6–9)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await sendOTP(phoneNumber, '+91');
      setStep(2);
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);
    setError('');

    // Auto move to next input
    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto verify if full OTP is entered
    if (cleanVal && index === 5) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        verifyOtpCode(fullOtp);
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const verifyOtpCode = async (otpCode) => {
    const code = otpCode || otp.join('');
    if (code.length < 6) {
      setError('Please enter complete 6-digit verification code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await verifyOTP(phoneNumber, code);
      if (res.success && res.user) {
        const u = res.user;
        const isProfileComplete = u.isProfileCompleted !== undefined
          ? u.isProfileCompleted
          : (u.username && !u.username.startsWith('user_') && u.fullName);

        if (!isProfileComplete) {
          setAuthenticatedUser(u);
          setFullName(u.fullName || '');
          setUsername(u.username && !u.username.startsWith('user_') ? u.username : '');
          setStep(3);
        } else {
          showToast(`Switched to @${u.username}`, 'success');
          onAccountAdded?.(u);
          navigate('/profile');
          handleClose();
        }
      }
    } catch (err) {
      setError(err?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    setProfileError('');
    const cleanName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');

    if (!cleanName) {
      setProfileError('Please enter your full name');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setProfileError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await completeProfile({
        fullName: cleanName,
        username: cleanUsername,
      });

      if (res.success && res.user) {
        showToast(`Account added: @${res.user.username}`, 'success');
        onAccountAdded?.(res.user);
        navigate('/profile');
        handleClose();
      }
    } catch (err) {
      setProfileError(err?.message || 'Failed to complete profile. Username may be taken.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Sheet Container */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateY(${currentY}px)` }}
        className={`relative w-full max-h-[90vh] rounded-t-[28px] z-10 flex flex-col transition-all duration-200 shadow-2xl ${
          isDarkMode ? 'bg-[#181818] text-white border-t border-white/10' : 'bg-white text-black border-t border-gray-100'
        } ${isClosing ? 'translate-y-full' : 'animate-slide-up'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5 relative shrink-0">
          {step > 1 ? (
            <button 
              type="button"
              onClick={() => setStep(step - 1)}
              className="w-9 h-9 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 active:scale-95 transition-all"
            >
              <BiChevronLeft size={28} />
            </button>
          ) : (
            <div className="w-9" />
          )}

          <h2 className="text-[17px] font-bold text-center flex-1">
            {step === 1 ? 'Add account' : step === 2 ? 'Verification' : 'Profile Setup'}
          </h2>

          <button 
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 active:scale-95 transition-all"
          >
            <BiX size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-8 flex flex-col">
          {step === 1 && (
            <div className="flex flex-col animate-fade-in">
              <h1 className="text-[24px] font-black tracking-tight mb-1">
                Log in or Sign up
              </h1>
              <p className={`text-[13px] mb-6 leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                Enter your phone number to switch or add your account.
              </p>

              {/* Phone Input Box */}
              <div className={`flex items-center rounded-2xl border px-4 py-3.5 mb-2 transition-all ${
                isDarkMode 
                  ? 'bg-white/5 border-white/15 focus-within:border-[#FE2C55]' 
                  : 'bg-gray-50 border-gray-200 focus-within:border-[#FE2C55]'
              }`}>
                <div className={`flex items-center gap-1.5 pr-3.5 border-r font-bold text-[15px] shrink-0 ${
                  isDarkMode ? 'border-white/15 text-white' : 'border-gray-200 text-gray-800'
                }`}>
                  <span>IN +91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Phone number"
                  autoFocus
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhoneNumber(val);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && phoneNumber.length >= 10 && !loading) {
                      handleSendOTP();
                    }
                  }}
                  className={`flex-1 pl-3.5 text-[16px] font-bold outline-none bg-transparent ${
                    isDarkMode ? 'text-white placeholder:text-white/40' : 'text-black placeholder:text-gray-400'
                  }`}
                />
              </div>

              {error && (
                <p className="text-[#FE2C55] text-xs font-semibold mb-4 ml-1 animate-shake">
                  {error}
                </p>
              )}

              {/* Terms disclaimer */}
              <p className={`text-[11px] leading-relaxed mt-2 mb-6 ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>
                By continuing, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and acknowledge that you have read our <span className="underline cursor-pointer">Privacy Policy</span>.
              </p>

              {/* Continue Button */}
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading || phoneNumber.length < 10}
                className={`w-full min-h-[52px] rounded-full font-bold text-[15px] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
                  phoneNumber.length >= 10 && !loading
                    ? 'bg-[#FE2C55] text-white'
                    : isDarkMode 
                      ? 'bg-white/10 text-white/40 shadow-none cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col animate-fade-in">
              <h1 className="text-[22px] font-black tracking-tight mb-1">
                Enter 6-digit code
              </h1>
              <p className={`text-[13px] mb-6 leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                Your code was sent to <span className="font-bold text-white">+91 {phoneNumber}</span>
              </p>

              {/* OTP Inputs */}
              <div className="flex justify-between gap-2 mb-4">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={idx === 0}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border outline-none transition-all ${
                      digit 
                        ? 'border-[#FE2C55] bg-white/10' 
                        : isDarkMode 
                          ? 'border-white/15 bg-white/5 focus:border-[#FE2C55]' 
                          : 'border-gray-200 bg-gray-50 focus:border-[#FE2C55]'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <p className="text-[#FE2C55] text-xs font-semibold mb-4 text-center animate-shake">
                  {error}
                </p>
              )}

              {/* Resend Code Section */}
              <div className="flex items-center justify-between mt-2 mb-6">
                <span className={`text-[13px] ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                  Didn't get code?
                </span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="text-[13px] font-bold text-[#FE2C55] hover:underline"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span className={`text-[13px] font-semibold ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>
                    Resend in {timer}s
                  </span>
                )}
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => verifyOtpCode()}
                disabled={loading || otp.join('').length < 6}
                className={`w-full min-h-[52px] rounded-full font-bold text-[15px] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
                  otp.join('').length === 6 && !loading
                    ? 'bg-[#FE2C55] text-white'
                    : isDarkMode 
                      ? 'bg-white/10 text-white/40 shadow-none cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Verify & Log in'
                )}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col animate-fade-in">
              <h1 className="text-[22px] font-black tracking-tight mb-1">
                Complete your profile
              </h1>
              <p className={`text-[13px] mb-6 leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                Choose how you'll appear on Jhumroo.
              </p>

              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    FULL NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full h-[52px] rounded-2xl border px-4 font-semibold text-[15px] outline-none transition-all ${
                      isDarkMode ? 'bg-white/5 border-white/15 focus:border-[#FE2C55] text-white' : 'bg-gray-50 border-gray-200 focus:border-[#FE2C55] text-black'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    USERNAME
                  </label>
                  <input
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                    className={`w-full h-[52px] rounded-2xl border px-4 font-semibold text-[15px] outline-none transition-all ${
                      isDarkMode ? 'bg-white/5 border-white/15 focus:border-[#FE2C55] text-white' : 'bg-gray-50 border-gray-200 focus:border-[#FE2C55] text-black'
                    }`}
                  />
                </div>
              </div>

              {profileError && (
                <p className="text-[#FE2C55] text-xs font-semibold mb-4 ml-1 animate-shake">
                  {profileError}
                </p>
              )}

              <button
                type="button"
                onClick={handleCompleteProfile}
                disabled={loading || !fullName.trim() || username.trim().length < 3}
                className={`w-full min-h-[52px] rounded-full font-bold text-[15px] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
                  fullName.trim() && username.trim().length >= 3 && !loading
                    ? 'bg-[#FE2C55] text-white'
                    : isDarkMode 
                      ? 'bg-white/10 text-white/40 shadow-none cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Done'
                )}
              </button>
            </div>
          )}
        </div>

        <div className="h-6" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }} />
      </div>
    </div>
  );
};

export default AddAccountSheet;
