import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BiUser, BiChevronLeft } from 'react-icons/bi';

import PhoneInput from './components/PhoneInput';
import OtpScreen from './components/OtpScreen';

// Import background image
import loginBg from '../../../../assets/loginPage/LoginPageImage.webp';
import logo from '../../../../assets/loginPage/Logo.png';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';

/* ──────────────── Reusable UI Components ──────────────── */

const useProgressiveImage = (src) => {
  const [loadedSource, setLoadedSource] = useState(null);

  useEffect(() => {
    if (!src) return;
    
    // Check if the image is already cached/loaded
    const img = new Image();
    img.src = src;
    if (img.complete) {
      setLoadedSource(src);
      return;
    }

    img.onload = () => {
      setLoadedSource(src);
    };
  }, [src]);

  return loadedSource;
};

const BackgroundWrapper = ({ children, blur = false }) => {
  const loadedBg = useProgressiveImage(loginBg);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#18110f]">
      {/* Warm gradient placeholder that renders instantly */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2c1a17] to-[#140d0c]" />
      
      {/* The high-res background image, fading in smoothly when loaded */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-all duration-[800ms] ease-out ${
          blur ? 'blur-[8px] scale-110' : 'blur-0 scale-100'
        } ${loadedBg ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          backgroundImage: loadedBg ? `url(${loadedBg})` : 'none',
          willChange: 'opacity, transform' 
        }}
      />
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative z-10 h-full w-full flex flex-col">
        {children}
      </div>
    </div>
  );
};

const AuthCard = ({ children, title, subtitle }) => (
  <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-[28px] p-5 sm:rounded-[32px] sm:p-8 flex flex-col shadow-2xl animate-scale-in">
    {title && <h2 className="text-[1.65rem] sm:text-2xl font-black text-white mb-1 tracking-tight">{title}</h2>}
    {subtitle && <p className="text-sm text-gray-300 mb-6 sm:mb-8 leading-snug">{subtitle}</p>}
    {children}
  </div>
);

const PrimaryButton = ({ onClick, children, variant = 'solid', disabled = false, className = "" }) => {
  const baseStyles = "w-full min-h-[54px] rounded-full px-4 py-3.5 text-[15px] sm:py-4 sm:text-[16px] font-bold transition-all duration-200 active:scale-[0.96] flex items-center justify-center gap-3";
  const variants = {
    solid: "bg-[#fe2c55] text-white shadow-lg shadow-[#fe2c55]/30",
    outline: "bg-white/10 border border-white/30 text-white backdrop-blur-md",
    ghost: "bg-transparent text-white"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 grayscale' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

/* ──────────────── Scroll Picker Column ──────────────── */
const ITEM_H = 36;

const PickerColumn = ({ items, selectedIndex, onChange }) => {
  const ref = useRef(null);
  const isScrolling = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (ref.current && !isScrolling.current) {
      ref.current.scrollTop = selectedIndex * ITEM_H;
    }
  }, [selectedIndex, items.length]);

  // Cancel any pending scroll-snap timeout on unmount - otherwise it fires
  // after the component (and its ref) is gone, crashing on ref.current.scrollTop.
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    isScrolling.current = true;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      ref.current.scrollTop = clamped * ITEM_H;
      onChange(clamped);
      isScrolling.current = false;
    }, 80);
  }, [items.length, onChange]);

  return (
    <div className="relative h-full flex-1 overflow-hidden">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[36px] border-t border-b border-white/20 pointer-events-none z-10" />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-auto no-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        <div style={{ height: `calc(50% - ${ITEM_H / 2}px)` }} />
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-center text-[13px] transition-all cursor-pointer select-none ${i === selectedIndex ? 'text-white font-bold text-[15px]' : 'text-gray-500'
              }`}
            style={{ height: `${ITEM_H}px`, scrollSnapAlign: 'center' }}
            onClick={() => onChange(i)}
          >
            {item}
          </div>
        ))}
        <div style={{ height: `calc(50% - ${ITEM_H / 2}px)` }} />
      </div>
    </div>
  );
};

/* ──────────────── Auth Page ──────────────── */
const DEFAULT_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 60 }, (_, i) => 2025 - i);

const AuthPage = ({ onComplete, initialMode = 'signup' }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { config } = useAppContent();
  const months = config?.auth?.months || DEFAULT_MONTHS;
  const { user: authUser, completeProfile } = useAuth();

  // Set mode based on current URL path
  const [mode, setMode] = useState(pathname === '/login' ? 'login' : initialMode);

  // Steps: 1=Welcome, 2=Methods, 3=Birthday, 4=PhoneInput, 5=OTP
  const [step, setStep] = useState(() => {
    const isSignupMode = pathname === '/signup';
    const isProfileCompleted = authUser?.isProfileCompleted !== undefined
      ? authUser.isProfileCompleted
      : (authUser?.username && !authUser.username.startsWith('user_') && authUser.fullName);

    // Only force complete profile during signup if profile is incomplete
    if (isSignupMode && authUser && !isProfileCompleted) {
      return 6;
    }

    if (pathname === '/signup') {
      const savedStep = sessionStorage.getItem('signup_step');
      return savedStep !== null ? parseInt(savedStep, 10) : 3;
    }
    return pathname === '/login' ? 4 : 1;
  });

  // Sync mode and step with URL changes
  useEffect(() => {
    const p = pathname;
    const currentMode = p === '/login' ? 'login' : 'signup';
    setMode(currentMode);

    const isProfileCompleted = authUser?.isProfileCompleted !== undefined
      ? authUser.isProfileCompleted
      : (authUser?.username && !authUser.username.startsWith('user_') && authUser.fullName);

    // Only redirect to complete profile during signup flow
    if (currentMode === 'signup' && authUser && !isProfileCompleted) {
      setStep(6);
      return;
    }

    // Explicitly set step based on route
    if (p === '/signup') {
      if (authUser) {
        setStep(6);
      } else {
        const savedStep = sessionStorage.getItem('signup_step');
        setStep(savedStep !== null ? parseInt(savedStep, 10) : 3);
      }
    } else if (p === '/login') {
      setStep(4);
    } else if (p === '/' || p === '' || p === '/welcome' || p.includes('index.html')) {
      // Clear saved signup state when going back to welcome screen
      sessionStorage.removeItem('signup_step');
      sessionStorage.removeItem('signup_month_idx');
      sessionStorage.removeItem('signup_day_idx');
      sessionStorage.removeItem('signup_year_idx');
      sessionStorage.removeItem('signup_birthday_selected');
      sessionStorage.removeItem('temp_phone_number');
      setStep(1); // Force welcome screen on root or /welcome
    } else {
      // For any other subroutes during auth, keep as welcome or default to methods
      setStep(1);
    }
  }, [pathname, authUser]);

  const [monthIdx, setMonthIdx] = useState(() => {
    const val = sessionStorage.getItem('signup_month_idx');
    return val !== null ? parseInt(val, 10) : 7;
  });
  const [dayIdx, setDayIdx] = useState(() => {
    const val = sessionStorage.getItem('signup_day_idx');
    return val !== null ? parseInt(val, 10) : 22;
  });
  const [yearIdx, setYearIdx] = useState(() => {
    const val = sessionStorage.getItem('signup_year_idx');
    return val !== null ? parseInt(val, 10) : 39;
  });
  const [showBirthdayPrompt, setShowBirthdayPrompt] = useState(false);

  // Auth state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthdaySelected, setBirthdaySelected] = useState(() => {
    return sessionStorage.getItem('signup_birthday_selected') === 'true';
  });

  // Sync state changes with sessionStorage
  useEffect(() => {
    if (mode === 'signup' && step > 2) {
      sessionStorage.setItem('signup_step', step.toString());
    }
  }, [step, mode]);

  useEffect(() => {
    sessionStorage.setItem('signup_month_idx', monthIdx.toString());
  }, [monthIdx]);

  useEffect(() => {
    sessionStorage.setItem('signup_day_idx', dayIdx.toString());
  }, [dayIdx]);

  useEffect(() => {
    sessionStorage.setItem('signup_year_idx', yearIdx.toString());
  }, [yearIdx]);

  useEffect(() => {
    sessionStorage.setItem('signup_birthday_selected', birthdaySelected.toString());
  }, [birthdaySelected]);

  const selectedDate = new Date(YEARS[yearIdx], months.indexOf(months[monthIdx]), DAYS[dayIdx]).toISOString();
  const displayDate = `${DAYS[dayIdx]} ${months[monthIdx]} ${YEARS[yearIdx]}`;

  const handleNextBirthday = () => {
    if (!birthdaySelected) {
      setBirthdaySelected(true);
      return;
    }
    setShowBirthdayPrompt(true);
  };

  const handleConfirmBirthday = () => {
    setShowBirthdayPrompt(false);
    setStep(4);
  };

  const handleAuthSuccess = useCallback(async (userData) => {
    console.log('✅ Auth success triggered!', userData);
    
    // Auto-complete and go to home
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Clear temp phone number from sessionStorage
    sessionStorage.removeItem('temp_phone_number');

    // Only force profile completion for new users during signup flow
    // Existing users logging in should always proceed to home
    const isNewUser = mode === 'signup' && (
      userData?.isProfileCompleted !== undefined
        ? !userData.isProfileCompleted
        : (userData?.username?.startsWith('user_') || !userData?.fullName)
    );
    const needsOnboarding = !userData?.isOnboarded;
    
    if (isNewUser) {
      setStep(6);
    } else {
      // Clear signup state if not a new user
      sessionStorage.removeItem('signup_step');
      sessionStorage.removeItem('signup_month_idx');
      sessionStorage.removeItem('signup_day_idx');
      sessionStorage.removeItem('signup_year_idx');
      sessionStorage.removeItem('signup_birthday_selected');
      
      if (needsOnboarding) {
        onComplete(true);
      } else {
        onComplete(false);
      }
    }
  }, [onComplete, mode]);


  /* ─── Step 6: Complete Profile ─── */
  const getInitialFullName = (name) => {
    if (!name || /^User \d+$/i.test(name.trim())) return '';
    return name;
  };

  const [fullName, setFullName] = useState(getInitialFullName(authUser?.fullName));
  const [username, setUsername] = useState((authUser?.username && !authUser.username.startsWith('user_')) ? authUser.username : '');
  const [email, setEmail] = useState(authUser?.email || '');
  const [country, setCountry] = useState(authUser?.country || 'India');
  const [state, setState] = useState(authUser?.state || '');

  useEffect(() => {
    if (authUser) {
      if (authUser.fullName && !/^User \d+$/i.test(authUser.fullName.trim())) {
        setFullName(authUser.fullName);
      }
      if (authUser.username && !authUser.username.startsWith('user_')) setUsername(authUser.username);
      if (authUser.email) setEmail(authUser.email);
      if (authUser.country) setCountry(authUser.country);
      if (authUser.state) setState(authUser.state);
    }
  }, [authUser]);

  const [isCompleting, setIsCompleting] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [stateError, setStateError] = useState('');

  const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const handleCompleteProfile = async () => {
    setUsernameError('');
    setFullNameError('');
    setEmailError('');
    setStateError('');

    let hasError = false;

    // Validate Full Name
    const cleanFullName = fullName.trim();
    if (!cleanFullName) {
      setFullNameError('Full name is required');
      hasError = true;
    } else {
      const nameRegex = /^[a-zA-Z]{2,}(?:\s+[a-zA-Z]+)*$/;
      if (!nameRegex.test(cleanFullName)) {
        setFullNameError('Please enter a valid full name (letters and spaces only, min 2 characters)');
        hasError = true;
      }
    }

    // Validate Username
    if (!username || username.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      hasError = true;
    } else if (!/^[a-z0-9._]+$/.test(username)) {
      setUsernameError('Username can only contain lowercase letters, numbers, dots, and underscores');
      hasError = true;
    } else if (!/[0-9._]/.test(username)) {
      setUsernameError('Username must contain at least one number or special character (e.g. . or _)');
      hasError = true;
    }

    // Validate State
    if (!state || state.trim() === '') {
      setStateError('State is a mandatory field');
      hasError = true;
    }

    // Validate Email (optional, but if provided, must be valid)
    const cleanEmail = email.trim();
    if (cleanEmail) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|co|in|net|org|edu|gov|mil|info|biz)$/i;
      if (!emailRegex.test(cleanEmail)) {
        setEmailError('Please enter a valid email address (e.g. name@domain.com)');
        hasError = true;
      } else {
        const domain = cleanEmail.split('@')[1].toLowerCase();
        if (domain.includes('gamil') || domain.includes('gmaill') || domain.includes('yaho') || domain.includes('hotmal')) {
          setEmailError('Please enter a valid email domain (e.g. @gmail.com)');
          hasError = true;
        }
      }
    }

    if (hasError) return;

    setIsCompleting(true);
    try {
      await completeProfile({
        fullName: cleanFullName,
        username,
        email: cleanEmail,
        country,
        state,
        dateOfBirth: selectedDate
      });
      // Clear temp storage on profile completion success
      sessionStorage.removeItem('signup_step');
      sessionStorage.removeItem('signup_month_idx');
      sessionStorage.removeItem('signup_day_idx');
      sessionStorage.removeItem('signup_year_idx');
      sessionStorage.removeItem('signup_birthday_selected');
      onComplete(true);
    } catch (err) {
      setUsernameError(err?.message || 'Username is not available');
    } finally {
      setIsCompleting(false);
    }
  };

  if (step === 6) {
    return (
      <BackgroundWrapper blur>
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-6 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-md animate-scale-in">
          <AuthCard title="Complete your profile" subtitle="Choose how you'll appear on Jhumroo">
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto no-scrollbar py-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">FULL NAME</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[a-zA-Z\s]*$/.test(val)) {
                      setFullName(val);
                      setFullNameError('');
                    }
                  }}
                  className={`w-full h-[54px] bg-white/5 border ${fullNameError ? 'border-[#fe2c55]' : 'border-white/10'} rounded-2xl px-4 text-white outline-none focus:border-[#fe2c55] transition-all`}
                />
                {fullNameError && (
                  <p className="text-[#fe2c55] text-xs font-semibold ml-1 mt-1">{fullNameError}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">USERNAME</label>
                <input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''));
                    setUsernameError('');
                  }}
                  className={`w-full h-[54px] bg-white/5 border ${usernameError ? 'border-[#fe2c55]' : 'border-white/10'} rounded-2xl px-4 text-white outline-none focus:border-[#fe2c55] transition-all`}
                />
                {usernameError && (
                  <p className="text-[#fe2c55] text-xs font-semibold ml-1 mt-1">{usernameError}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">EMAIL (OPTIONAL)</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  className={`w-full h-[54px] bg-white/5 border ${emailError ? 'border-[#fe2c55]' : 'border-white/10'} rounded-2xl px-4 text-white outline-none focus:border-[#fe2c55] transition-all`}
                />
                {emailError && (
                  <p className="text-[#fe2c55] text-xs font-semibold ml-1 mt-1">{emailError}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-400 ml-1">COUNTRY</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full h-[54px] bg-white/5 border border-white/10 rounded-2xl px-4 text-white outline-none focus:border-[#fe2c55] transition-all appearance-none"
                  >
                    <option value="India" className="bg-[#1a1a1a]">India</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-400 ml-1">STATE</label>
                  <select
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      setStateError('');
                    }}
                    className={`w-full h-[54px] bg-white/5 border ${stateError ? 'border-[#fe2c55]' : 'border-white/10'} rounded-2xl px-4 text-white outline-none focus:border-[#fe2c55] transition-all appearance-none`}
                  >
                    <option value="" disabled className="bg-[#1a1a1a]">Select State</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>
                    ))}
                  </select>
                  {stateError && (
                    <p className="text-[#fe2c55] text-xs font-semibold ml-1 mt-1">{stateError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <PrimaryButton onClick={handleCompleteProfile} disabled={!username || username.length < 3 || isCompleting}>
                {isCompleting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Next'}
              </PrimaryButton>
            </div>
          </AuthCard>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  /* ─── Step 1: New Welcome Screen ─── */
  if (step === 1) {
    return (
      <BackgroundWrapper>
        <div
          className="flex-1 min-h-0 flex flex-col items-start overflow-y-auto px-5 sm:px-8"
          style={{
            paddingTop: 'max(1.5rem, calc(env(safe-area-inset-top) + 1rem))',
            paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1.25rem))',
          }}
        >
          {/* Logo Section */}
          <div
            className="flex max-w-[22rem] sm:max-w-[26rem] flex-col items-start animate-fade-in"
            style={{ marginTop: 'clamp(0.5rem, 5vh, 4rem)' }}
          >
            <p className="text-gray-300 text-xl sm:text-2xl font-semibold tracking-wide mb-2">Welcome to</p>
            <h1
              className="text-white tracking-tight text-left"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(2.8rem, 14vw, 4.2rem)',
                fontWeight: 900,
                lineHeight: 1.05,
              }}
            >
              The Jhumroo App
            </h1>
          </div>

          {/* Spacer that pushes buttons to ~65% from top */}
          <div className="flex-1" style={{ maxHeight: '52vh' }} />

          {/* Action Buttons */}
          <div className="w-full self-stretch max-w-none sm:max-w-[360px] flex flex-col gap-4 animate-slide-up pb-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex min-h-[56px] w-full items-center justify-center rounded-full border border-[#ff7ba5]/30 bg-[linear-gradient(180deg,#ff5d90_0%,#ff2e69_55%,#ff245f_100%)] px-4 text-[1.05rem] font-extrabold text-white shadow-[0_10px_30px_rgba(255,53,108,0.45)] transition-transform duration-200 active:scale-[0.97] sm:min-h-[60px] sm:text-[1.15rem]"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="flex min-h-[56px] w-full items-center justify-center rounded-full border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.08)_100%)] px-4 text-[1rem] font-extrabold text-white shadow-[0_12px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md transition-transform duration-200 active:scale-[0.97] sm:min-h-[60px] sm:text-[1.1rem]"
            >
              Sign Up
            </button>
            <p className="text-[11px] sm:text-[12px] text-gray-400 text-center px-2 sm:px-4 mt-2 sm:mt-4 leading-snug">
              By continuing you agree to our <span onClick={() => navigate('/settings/terms-and-condition')} className="text-white font-semibold cursor-pointer hover:underline">Terms</span> and <span onClick={() => navigate('/settings/privacy-policy')} className="text-white font-semibold cursor-pointer hover:underline">Privacy</span>
            </p>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  /* ─── Step 2: Auth Methods ─── */
  if (step === 2) {
    const methodConfigs = config?.auth?.methods || [
      { id: 'phone', label: 'Use phone or email' },
    ];

    const methods = methodConfigs.map((method) => {
      switch (method.id) {
        case 'phone':
          return {
            ...method,
            icon: <BiUser size={22} className="text-white shrink-0" />,
            onClick: () => setStep(mode === 'signup' ? 3 : 4),
          };
        default:
          return {
            ...method,
            icon: <BiUser size={22} className="text-white shrink-0" />,
          };
      }
    });

    const filteredMethods = methods.filter(m => m.id === 'phone');

    return (
      <BackgroundWrapper blur>
        <div
          className="flex-1 min-h-0 flex flex-col justify-end overflow-y-auto px-4 pt-6 sm:p-6"
          style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
        >
          <AuthCard
            title={mode === 'signup' ? "Sign up" : "Log in"}
            subtitle="Choose a method to continue your journey"
          >
            <div className="flex flex-col gap-3">
              {filteredMethods.map((m, i) => (
                <button
                  key={i}
                  onClick={m.onClick}
                  className={`w-full min-h-[54px] flex items-center border border-white/10 rounded-2xl active:scale-[0.98] transition-all bg-white/5 relative group ${m.className || ''}`}
                >
                  <div className="absolute left-[16px] flex items-center justify-center">
                    {m.icon}
                  </div>
                  <span className="w-full text-center font-bold text-[15px] text-white">
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-[14px] text-center text-gray-300">
                {mode === 'signup' ? (
                  <>Already have an account? <span className="text-[#fe2c55] font-bold cursor-pointer hover:underline ml-1" onClick={() => navigate('/login')}>Log in</span></>
                ) : (
                  <>Don't have an account? <span className="text-[#fe2c55] font-bold cursor-pointer hover:underline ml-1" onClick={() => navigate('/signup')}>Sign up</span></>
                )}
              </p>
            </div>
          </AuthCard>

          <div style={{ height: 'max(0.5rem, env(safe-area-inset-bottom))' }} />
        </div>

      </BackgroundWrapper>
    );
  }

  /* ─── Step 3: Birthday ─── */
  if (step === 3) {
    return (
      <BackgroundWrapper blur>
        <div className="flex flex-col h-full min-h-0">
          <div
            className="min-h-[56px] flex items-center px-4 shrink-0"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
          >
            <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white">
              <BiChevronLeft size={28} />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-center items-center overflow-y-auto px-4 pb-4 sm:p-6">
            <div className="w-full max-w-md animate-scale-in">
              <AuthCard title="When's your birthday?" subtitle="Your birthday won't be shown publicly.">
                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6">
                    <p className={`text-[17px] font-bold ${birthdaySelected ? 'text-white' : 'text-gray-500'}`}>
                      {birthdaySelected ? displayDate : 'Birthday'}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-[#fe2c55]/10 rounded-2xl flex items-center justify-center text-3xl">🎂</div>
                </div>

                <PrimaryButton onClick={handleNextBirthday} disabled={!birthdaySelected}>
                  Next Step
                </PrimaryButton>
              </AuthCard>
            </div>
          </div>

          <div
            className="bg-white/10 backdrop-blur-2xl px-4 pt-4 rounded-t-[32px] sm:rounded-t-[40px] shrink-0"
            style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))' }}
          >
            <div className="flex" style={{ height: 'clamp(150px, 28vh, 180px)' }}>
              <PickerColumn items={months} selectedIndex={monthIdx} onChange={(i) => { setMonthIdx(i); setBirthdaySelected(true); }} />
              <PickerColumn items={DAYS} selectedIndex={dayIdx} onChange={(i) => { setDayIdx(i); setBirthdaySelected(true); }} />
              <PickerColumn items={YEARS} selectedIndex={yearIdx} onChange={(i) => { setYearIdx(i); setBirthdaySelected(true); }} />
            </div>
          </div>
        </div>

        {showBirthdayPrompt && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end justify-center px-4 sm:px-6"
            style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))' }}
          >
            <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-[28px] sm:rounded-[32px] overflow-hidden animate-slide-up shadow-2xl">
              <div className="p-6 sm:p-8 text-center text-white">
                <h3 className="text-xl font-bold mb-3">Add birthday to enjoy</h3>
                <p className="text-sm text-gray-400 leading-relaxed font-medium">
                  This is required to give you the best experience on The Jhumroo App.
                </p>
              </div>
              <div className="flex border-t border-white/5 h-[70px]">
                <button onClick={() => setShowBirthdayPrompt(false)} className="flex-1 font-bold text-gray-500 hover:text-white transition-colors border-r border-white/5">
                  Go back
                </button>
                <button onClick={handleConfirmBirthday} className="flex-1 font-bold text-[#fe2c55] hover:text-[#ff4572] transition-colors">
                  Add birthday
                </button>
              </div>
            </div>
          </div>
        )}
      </BackgroundWrapper>
    );
  }

  /* ─── Step 4 & 5: Phone/OTP ─── */
  if (step === 4 || step === 5) {
    return (
      <BackgroundWrapper blur>
        <div className="flex-1 flex flex-col min-h-0">
          <div
            className="min-h-[56px] flex items-center px-4 shrink-0"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
          >
            <button 
              onClick={() => {
                if (step === 4) {
                  if (mode === 'signup') {
                    setStep(3);
                  } else {
                    navigate('/');
                  }
                } else {
                  setStep(4);
                }
              }} 
              className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white"
            >
              <BiChevronLeft size={28} />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center px-4 pb-8 pt-2 overflow-y-auto">
            <div className="w-full max-w-md animate-scale-in">
              <AuthCard>
                {step === 4 ? (
                  <PhoneInput
                    mode={mode}
                    onNext={(phone) => {
                      setPhoneNumber(phone);
                      setStep(5);
                    }}
                    onBack={() => {
                      if (mode === 'signup') {
                        setStep(3);
                      } else {
                        navigate('/');
                      }
                    }}
                    onSwitchMode={() => navigate(mode === 'signup' ? '/login' : '/signup')}
                    isThemed={true}
                  />
                ) : (
                  <OtpScreen
                    phoneNumber={phoneNumber}
                    onVerifySuccess={handleAuthSuccess}
                    onBack={() => setStep(4)}
                    onEditPhone={() => setStep(4)}
                    isThemed={true}
                  />
                )}
              </AuthCard>
            </div>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  return null;
};

export default AuthPage;
