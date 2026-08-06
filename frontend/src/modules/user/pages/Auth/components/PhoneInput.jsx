import React, { useState } from 'react';
import { BiChevronLeft } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';

const PhoneInput = ({ onNext, onBack, onSwitchMode, mode = 'signup', isThemed = false }) => {
  const navigate = useNavigate();
  const { sendOTP } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return sessionStorage.getItem('temp_phone_number') || '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
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
    
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    try {
      // Call backend API to send OTP
      await sendOTP(phoneNumber, '+91', mode);
      console.log('📱 OTP sent successfully');
      
      setLoading(false);
      onNext(phoneNumber);
    } catch (err) {
      if (!err?.requireSignup) {
        console.error('❌ Failed to send OTP:', err);
      }
      setError(err?.message || 'Failed to send code. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={`h-full min-h-0 w-full flex flex-col overflow-hidden ${isThemed ? 'bg-transparent' : 'bg-white'}`}>
      {!isThemed && (
        <div className="h-11 flex items-center px-2 shrink-0">
          <button onClick={onBack} className="p-2">
            <BiChevronLeft size={26} className="text-black" />
          </button>
          <h3 className="flex-1 text-center font-bold text-black text-[15px] pr-10">
            {mode === 'login' ? 'Log in' : 'Sign up'}
          </h3>
        </div>
      )}
      
      <div
        className={`flex-1 overflow-y-auto no-scrollbar min-h-0 ${isThemed ? 'px-0 pt-4 sm:pt-6' : 'px-5 pt-5'}`}
        style={{ paddingBottom: isThemed ? 'max(0.25rem, env(safe-area-inset-bottom))' : undefined }}
      >
         <h2 className={`text-[22px] sm:text-[24px] font-black mb-1 leading-tight ${isThemed ? 'text-white/95' : 'text-black'}`}>Enter phone number</h2>
         <p className={`text-[13px] mb-6 sm:mb-8 leading-snug ${isThemed ? 'text-white/75' : 'text-gray-500'}`}>
            We'll send a 6-digit verification code to this number.
         </p>
         
         <div className={`flex items-center border-b pb-3 mb-3 transition-all ${isThemed ? 'border-white/20 focus-within:border-[#fe2c55]' : 'border-gray-200 focus-within:border-black'}`}>
            <div className={`flex items-center gap-1 pr-4 border-r cursor-default shrink-0 ${isThemed ? 'border-white/10' : 'border-gray-200'}`}>
              <span className={`text-[15px] font-bold ${isThemed ? 'text-white' : 'text-black'}`}>IN +91</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Enter Your Phone Number"
              autoFocus
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneNumber(val);
                sessionStorage.setItem('temp_phone_number', val);
              }}
              className={`flex-1 pl-4 text-[17px] font-bold outline-none bg-transparent ${isThemed ? 'text-white placeholder:text-white/45' : 'text-black placeholder:text-gray-600'}`}
             />
         </div>
         {error && (
           <div className="mb-6 flex flex-col items-center">
             <p className="text-[#fe2c55] text-xs font-semibold animate-shake">{error}</p>
             {error.includes('sign up') && mode === 'login' && (
               <button
                 type="button"
                 onClick={() => {
                   setError('');
                   (onSwitchMode || onBack)();
                 }}
                 className="mt-2 text-[13px] text-[#fe2c55] font-bold hover:underline"
               >
                 Switch to Sign up
               </button>
             )}
             {error.includes('already registered') && mode === 'signup' && (
               <button
                 type="button"
                 onClick={() => {
                   setError('');
                   (onSwitchMode || onBack)();
                 }}
                 className="mt-2 text-[13px] text-[#fe2c55] font-bold hover:underline"
               >
                 Switch to Log in
               </button>
             )}
           </div>
         )}
         {!error && <p className={`text-[11px] leading-relaxed mb-6 sm:mb-8 ${isThemed ? 'text-white/50' : 'text-gray-400'}`}>
            By continuing, you agree to our <span onClick={() => navigate('/settings/terms-and-condition')} className={`${isThemed ? 'text-white' : 'text-black'} font-semibold cursor-pointer hover:underline`}>Terms</span> and <span onClick={() => navigate('/settings/privacy-policy')} className={`${isThemed ? 'text-white' : 'text-black'} font-semibold cursor-pointer hover:underline`}>Policy</span>. Standard data rates may apply.
         </p>}

         <button
           onClick={handleSendCode}
           disabled={loading || phoneNumber.length < 10}
           className={`w-full min-h-[54px] rounded-full px-4 py-3.5 sm:py-4 font-bold text-[15px] sm:text-[16px] transition-all active:scale-[0.96] flex justify-center items-center gap-2 shadow-xl ${
             phoneNumber.length >= 10 
              ? 'bg-[#fe2c55] text-white shadow-[#fe2c55]/30' 
              : isThemed ? 'bg-white/10 text-white/60 shadow-none' : 'bg-gray-100 text-gray-300 shadow-none'
           }`}
         >
           {loading ? (
             <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
           ) : 'Send Code'}
         </button>
      </div>
    </div>
  );
};

export default PhoneInput;
