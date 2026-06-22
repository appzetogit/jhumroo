import React, { useState, useEffect, useRef } from 'react';
import { BiChevronLeft } from 'react-icons/bi';
import { useAuth } from '../../../../../context/AuthContext';

const OTP_LENGTH = 6;
const EXPIRY_TIME = 120; // 2 minutes

const OtpScreen = ({ phoneNumber, generatedOtp, onVerifySuccess, onBack, onEditPhone, onRegenerateOtp, isThemed = false }) => {
  const { verifyOTP, sendOTP } = useAuth();
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(EXPIRY_TIME);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const handleVerify = (code) => {
    console.log('🔍 Verifying OTP:', code);
    
    if (timer === 0) {
      setError('OTP Expired. Please resend.');
      setOtp('');
      inputRefs.current[0]?.focus();
      return;
    }

    // Call backend API to verify OTP
    setLoading(true);
    verifyOTP(phoneNumber, code)
      .then((response) => {
        console.log('✨ OTP Verified! Auth successful:', response);
        inputRefs.current.forEach(ref => ref?.blur());
        setLoading(false);
        onVerifySuccess(response.user);
      })
      .catch((err) => {
        // console.error('❌ OTP verification failed:', err);
        setError(err?.message || 'Incorrect code. Please try again.');
        setOtp('');
        setLoading(false);
        inputRefs.current[0]?.focus();
      });
  };

  // Handle OTP digit entry
  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = otp.split('');
    newOtp[index] = value.slice(-1);
    const joined = newOtp.join('').replace(/undefined/g, '');
    
    setOtp(joined);
    setError('');
    
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (joined.length === OTP_LENGTH) {
      handleVerify(joined);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Call backend API to resend OTP
      const response = await sendOTP(phoneNumber, '+91');
      console.log('📱 OTP resent successfully:', response);
      
      // In development, the OTP is returned in the response for testing
      const newOtp = response.otp || '0000'; // Fallback for production
      onRegenerateOtp(newOtp);
      
      setTimer(EXPIRY_TIME);
      setOtp('');
      setLoading(false);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('❌ Failed to resend OTP:', err);
      setError(err?.message || 'Failed to resend code. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`h-full min-h-0 w-full flex flex-col overflow-hidden ${isThemed ? 'bg-transparent' : 'bg-white'}`}>
      {!isThemed && (
        <div className="h-11 flex items-center px-2 shrink-0">
          <button onClick={onBack} className="p-2">
            <BiChevronLeft size={26} className="text-black" />
          </button>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto no-scrollbar min-h-0 ${isThemed ? 'px-0 pt-4 sm:pt-6' : 'px-5 pt-3'}`}
        style={{ paddingBottom: isThemed ? 'max(0.25rem, env(safe-area-inset-bottom))' : undefined }}
      >
        <h2 className={`text-[22px] sm:text-[24px] font-black mb-1 leading-tight ${isThemed ? 'text-white' : 'text-black'}`}>Verify it's you</h2>
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <p className={`text-[13px] leading-snug ${isThemed ? 'text-gray-400' : 'text-gray-500'}`}>
            Enter the 6-digit code sent to <span className={isThemed ? 'text-white font-bold' : 'text-black font-bold'}>+91 {phoneNumber}</span>
          </p>
          {onEditPhone && (
            <button
              type="button"
              onClick={onEditPhone}
              className="ml-3 shrink-0 text-[12px] font-bold text-[#fe2c55] hover:underline active:scale-95 transition-transform"
            >
              Edit
            </button>
          )}
        </div>

        <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8">
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <div key={i} className="flex-1">
              <input
                ref={(el) => (inputRefs.current[i] = el)}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={otp[i] || ''}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoFocus={i === 0}
                className={`w-full h-14 sm:h-16 text-center text-[22px] sm:text-2xl font-black rounded-xl sm:rounded-2xl outline-none transition-all duration-200 ${
                  isThemed 
                    ? `bg-white/5 border-2 ${error ? 'border-[#fe2c55] text-[#fe2c55]' : 'border-white/10 focus:border-[#fe2c55] text-white'}`
                    : `bg-gray-50 border-2 ${error ? 'border-[#fe2c55] text-[#fe2c55]' : 'border-transparent focus:border-black text-black'}`
                }`}
                disabled={loading}
              />
            </div>
          ))}
        </div>

        <div className="min-h-[24px] mb-6 sm:mb-8">
           {error && <p className="text-[#fe2c55] text-sm font-bold animate-shake">{error}</p>}
           {!error && loading && (
             <div className="flex items-center gap-2 text-[#fe2c55] text-sm font-bold">
               <div className="w-5 h-5 border-[3px] border-white/30 border-t-[#fe2c55] rounded-full animate-spin" />
               Verifying Code...
             </div>
           )}
        </div>

        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <p className={`text-[13px] ${isThemed ? 'text-gray-500' : 'text-gray-400'}`}>
            Didn't receive code? {timer > 0 ? <span className="font-bold text-gray-300 ml-1">{formatTime(timer)}</span> : ''}
          </p>
          {(timer === 0 || timer <= (EXPIRY_TIME - 10)) && (
            <button
              onClick={handleResend}
              disabled={loading}
              className="text-[15px] font-black text-[#fe2c55] active:scale-95 transition-transform disabled:opacity-50"
            >
              Resend New Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpScreen;
