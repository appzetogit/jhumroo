import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiLink, BiShareAlt, BiQrScan, BiImage, BiCheck, BiSun, BiScan } from 'react-icons/bi';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';

// Background gradient themes matching TikTok style
const GRADIENT_THEMES = [
  {
    id: 'tiktok-blue',
    name: 'Electric Blue',
    bg: 'linear-gradient(180deg, #0052D4 0%, #4364F7 45%, #000428 100%)',
    overlay: 'radial-gradient(circle at 50% 20%, rgba(67, 100, 247, 0.4) 0%, transparent 60%)',
  },
  {
    id: 'cyber-sunset',
    name: 'Sunset Neon',
    bg: 'linear-gradient(180deg, #8A2387 0%, #E94057 50%, #F27121 100%)',
    overlay: 'radial-gradient(circle at 50% 20%, rgba(233, 64, 87, 0.4) 0%, transparent 60%)',
  },
  {
    id: 'emerald-flow',
    name: 'Emerald Aurora',
    bg: 'linear-gradient(180deg, #0BA360 0%, #3CBA92 45%, #05261A 100%)',
    overlay: 'radial-gradient(circle at 50% 20%, rgba(60, 186, 146, 0.4) 0%, transparent 60%)',
  },
  {
    id: 'midnight-violet',
    name: 'Midnight Purple',
    bg: 'linear-gradient(180deg, #4A00E0 0%, #8E2DE2 50%, #0F051D 100%)',
    overlay: 'radial-gradient(circle at 50% 20%, rgba(142, 45, 226, 0.4) 0%, transparent 60%)',
  },
  {
    id: 'dark-neon',
    name: 'Dark Obsidian',
    bg: 'linear-gradient(180deg, #181924 0%, #11121A 50%, #000000 100%)',
    overlay: 'radial-gradient(circle at 50% 30%, rgba(254, 44, 85, 0.25) 0%, transparent 70%)',
  },
];

const QrProfilePage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast?.() || { showToast: (msg) => alert(msg) };

  const [activeMode, setActiveMode] = useState('card'); // 'card' or 'scan'
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isProcessingQr, setIsProcessingQr] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanAnimationRef = useRef(null);
  const fileInputRef = useRef(null);

  const username = currentUser?.username || '';
  const fullName = currentUser?.fullName || currentUser?.username || 'User';
  const avatarUrl = currentUser?.profilePicture?.url || null;

  const profileUrl = username ? `${window.location.origin}/user/${username}` : window.location.origin;
  const currentTheme = GRADIENT_THEMES[currentThemeIndex];

  // Generate real standard QR Code data URL
  useEffect(() => {
    let isSubscribed = true;
    QRCode.toDataURL(
      profileUrl,
      {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!err && isSubscribed && url) {
          setQrCodeDataUrl(url);
        }
      }
    );
    return () => {
      isSubscribed = false;
    };
  }, [profileUrl]);

  // Decode and handle QR content
  const handleDecodedQR = (rawText) => {
    if (!rawText || isProcessingQr) return;
    const text = rawText.trim();
    setIsProcessingQr(true);

    // Haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // 1. Check if URL contains /user/:username
    const userUrlMatch = text.match(/\/user\/([a-zA-Z0-9._-]+)/i);
    if (userUrlMatch && userUrlMatch[1]) {
      const targetUsername = userUrlMatch[1];
      showToast(`Opening profile @${targetUsername}...`);
      setTimeout(() => {
        navigate(`/user/${targetUsername}`);
      }, 300);
      return;
    }

    // 2. Check if text starts with @
    if (text.startsWith('@')) {
      const targetUsername = text.replace(/^@/, '');
      showToast(`Opening profile @${targetUsername}...`);
      setTimeout(() => {
        navigate(`/user/${targetUsername}`);
      }, 300);
      return;
    }

    // 3. If relative path
    if (text.startsWith('/user/')) {
      navigate(text);
      return;
    }

    // 4. If full external URL
    if (text.startsWith('http://') || text.startsWith('https://')) {
      try {
        const urlObj = new URL(text);
        if (urlObj.origin === window.location.origin && urlObj.pathname.startsWith('/user/')) {
          navigate(urlObj.pathname);
          return;
        }
        window.location.href = text;
        return;
      } catch (e) {
        // fallback
      }
    }

    // 5. Default alphanumeric username fallback
    if (/^[a-zA-Z0-9._-]+$/.test(text)) {
      showToast(`Opening profile @${text}...`);
      setTimeout(() => {
        navigate(`/user/${text}`);
      }, 300);
      return;
    }

    showToast(`Scanned: ${text}`);
    setIsProcessingQr(false);
  };

  // Cycle gradient theme on background tap
  const handleBackgroundTap = (e) => {
    if (e.target.closest('.no-theme-tap')) return;
    setCurrentThemeIndex((prev) => (prev + 1) % GRADIENT_THEMES.length);
  };

  const handleCopyLink = async (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = profileUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showToast('Profile link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareLink = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${fullName} (@${username}) on Jhumroo`,
          text: `Check out ${fullName}'s profile on Jhumroo!`,
          url: profileUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink(e);
        }
      }
    } else {
      handleCopyLink(e);
    }
  };

  // Camera Management & Live QR Scanning Frame Loop
  useEffect(() => {
    if (activeMode === 'scan') {
      let isMounted = true;
      setIsProcessingQr(false);

      const startCamera = async () => {
        try {
          setCameraError(null);
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError('Camera access not supported on this device.');
            return;
          }
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          if (isMounted) {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.play().catch(() => {});
            }
            // Start scanning frame loop
            startScanLoop();
          } else {
            stream.getTracks().forEach((track) => track.stop());
          }
        } catch (err) {
          console.warn('Camera permission denied or unavailable:', err);
          if (isMounted) {
            setCameraError('Camera unavailable or permission denied.');
          }
        }
      };

      const scanFrame = () => {
        if (!isMounted || isProcessingQr) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              handleDecodedQR(code.data);
              return;
            }
          } catch (e) {
            // Ignore scan error
          }
        }

        scanAnimationRef.current = requestAnimationFrame(scanFrame);
      };

      const startScanLoop = () => {
        if (scanAnimationRef.current) {
          cancelAnimationFrame(scanAnimationRef.current);
        }
        scanAnimationRef.current = requestAnimationFrame(scanFrame);
      };

      startCamera();

      return () => {
        isMounted = false;
        if (scanAnimationRef.current) {
          cancelAnimationFrame(scanAnimationRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };
    }
  }, [activeMode, isProcessingQr]);

  // Torch Toggle
  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn }],
          });
          setTorchOn(!torchOn);
          return;
        } catch (e) {
          console.warn('Failed to toggle torch track:', e);
        }
      }
    }
    setTorchOn(!torchOn);
  };

  // Gallery Image QR Scanner
  const handleGallerySelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleDecodedQR(code.data);
        } else {
          showToast('No QR code detected in this photo.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    // Reset file input so user can pick same file again if needed
    e.target.value = '';
  };

  return (
    <div
      onClick={activeMode === 'card' ? handleBackgroundTap : undefined}
      className="relative w-full h-full min-h-screen flex flex-col justify-between select-none overflow-hidden transition-all duration-700"
      style={{
        background: activeMode === 'card' ? currentTheme.bg : '#000000',
      }}
    >
      {/* Background Radial Glow Effect */}
      {activeMode === 'card' && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-all duration-700"
          style={{ background: currentTheme.overlay }}
        />
      )}

      {/* Hidden Canvas for QR video frame processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ======================= HEADER ======================= */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-6 pb-2 text-white">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (activeMode === 'scan') {
              setActiveMode('card');
            } else {
              navigate(-1);
            }
          }}
          className="no-theme-tap w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md active:scale-95 transition-transform"
          aria-label="Back"
        >
          <BiChevronLeft size={28} className="text-white" />
        </button>

        {activeMode === 'scan' ? (
          <h2 className="text-[18px] font-bold text-white tracking-wide">Scan</h2>
        ) : (
          <div className="text-center"></div>
        )}

        {/* Top-Right Action Button */}
        {activeMode === 'card' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMode('scan');
            }}
            className="no-theme-tap w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md active:scale-95 transition-transform"
            aria-label="Scan QR Code"
            title="Scan friend's QR code"
          >
            {/* Viewfinder icon matching Screenshot 3 */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M4 8V4m0 0h4M4 4l5 5" />
              <path d="M20 8V4m0 0h-4m4 0l-5 5" />
              <path d="M4 16v4m0 0h4m-4 0l5-5" />
              <path d="M20 16v4m0 0h-4m4 0l-5-5" />
            </svg>
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* ======================= MODE: CARD VIEW (Screenshot 3) ======================= */}
      {activeMode === 'card' && (
        <>
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4">
            {/* Floating White QR Card */}
            <div className="no-theme-tap w-full max-w-[320px] bg-white rounded-[32px] pt-0 pb-7 px-6 shadow-2xl shadow-black/40 flex flex-col items-center relative animate-fade-in">
              {/* Profile Avatar Overlapping Top */}
              <div className="w-[84px] h-[84px] rounded-full p-[3px] bg-white shadow-lg -mt-[42px] mb-2 shrink-0 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextSibling) {
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div
                  className="w-full h-full bg-[#d6d9df] rounded-full flex items-center justify-center"
                  style={{ display: avatarUrl ? 'none' : 'flex' }}
                >
                  <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="37" r="18" fill="#ffffff" />
                    <path d="M18 88 C 18 64, 32 54, 50 54 C 68 54, 82 64, 82 88 Z" fill="#ffffff" />
                  </svg>
                </div>
              </div>

              {/* Name and Username */}
              <h3 className="text-[20px] font-extrabold text-black tracking-tight leading-tight text-center">
                {fullName}
              </h3>
              {username && (
                <p className="text-[13px] font-semibold text-[#737373] mt-0.5 mb-5 text-center">
                  @{username}
                </p>
              )}

              {/* High-Resolution Scannable QR Code */}
              <div className="relative flex items-center justify-center p-2 bg-white rounded-2xl select-none">
                {qrCodeDataUrl ? (
                  <div className="relative">
                    <img
                      src={qrCodeDataUrl}
                      alt={`QR Code for @${username}`}
                      className="w-[210px] h-[210px] object-contain rounded-xl"
                    />
                    {/* TikTok Style Corner Accents */}
                    <div className="pointer-events-none absolute inset-0">
                      <span className="absolute top-2 left-2 w-3 h-3 rounded-full bg-[#25F4EE]/60" />
                      <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#FE2C55]/60" />
                      <span className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-[#FE2C55]/60" />
                    </div>
                  </div>
                ) : (
                  <div className="w-[210px] h-[210px] bg-gray-100 rounded-xl flex items-center justify-center animate-pulse">
                    <span className="text-gray-400 text-[12px]">Generating QR...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Below Card (Screenshot 3 style) */}
            <div className="no-theme-tap w-full max-w-[320px] grid grid-cols-2 gap-3.5 mt-5">
              <button
                onClick={handleCopyLink}
                className="bg-white hover:bg-gray-50 active:scale-[0.97] transition-all rounded-[20px] py-4 px-3 flex flex-col items-center justify-center shadow-lg shadow-black/25 text-black cursor-pointer"
              >
                {copied ? (
                  <BiCheck size={24} className="text-emerald-500 mb-1" />
                ) : (
                  <BiLink size={24} className="text-black mb-1 rotate-[-45deg]" />
                )}
                <span className="text-[13px] font-bold tracking-tight">
                  {copied ? 'Copied!' : 'Copy link'}
                </span>
              </button>

              <button
                onClick={handleShareLink}
                className="bg-white hover:bg-gray-50 active:scale-[0.97] transition-all rounded-[20px] py-4 px-3 flex flex-col items-center justify-center shadow-lg shadow-black/25 text-black cursor-pointer"
              >
                <BiShareAlt size={24} className="text-black mb-1" />
                <span className="text-[13px] font-bold tracking-tight">Share link</span>
              </button>
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="relative z-10 pb-8 pt-2 text-center">
            <p className="text-[13px] font-medium text-white/80 tracking-wide drop-shadow-sm">
              Tap background to change style
            </p>
          </div>
        </>
      )}

      {/* ======================= MODE: SCANNER VIEW (Screenshot 5) ======================= */}
      {activeMode === 'scan' && (
        <div className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden">
          {/* Viewfinder Area */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-8">
            {/* Live Camera Video Feed */}
            <div className="relative w-[280px] h-[280px] rounded-[24px] overflow-hidden flex items-center justify-center bg-black/60 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {cameraError && (
                <div className="absolute inset-0 bg-[#161823]/90 flex flex-col items-center justify-center p-4 text-center z-10">
                  <p className="text-[13px] text-white/80">{cameraError}</p>
                </div>
              )}

              {/* Viewfinder Target Frame with 4 Corner Brackets */}
              <div className="pointer-events-none absolute inset-4 border border-white/20 rounded-[18px]">
                {/* Top-Left Corner */}
                <span className="absolute -top-[2px] -left-[2px] w-6 h-6 border-t-[3.5px] border-l-[3.5px] border-white rounded-tl-[8px]" />
                {/* Top-Right Corner */}
                <span className="absolute -top-[2px] -right-[2px] w-6 h-6 border-t-[3.5px] border-r-[3.5px] border-white rounded-tr-[8px]" />
                {/* Bottom-Left Corner */}
                <span className="absolute -bottom-[2px] -left-[2px] w-6 h-6 border-b-[3.5px] border-l-[3.5px] border-white rounded-bl-[8px]" />
                {/* Bottom-Right Corner */}
                <span className="absolute -bottom-[2px] -right-[2px] w-6 h-6 border-b-[3.5px] border-r-[3.5px] border-white rounded-br-[8px]" />

                {/* Animated Futuristic Laser Scan Line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#25F4EE] to-transparent animate-scan shadow-[0_0_12px_#25F4EE]" />
              </div>
            </div>

            {/* Flashlight Button */}
            <button
              onClick={toggleTorch}
              className="mt-6 flex items-center gap-2 text-white/90 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-full text-[13px] font-semibold active:scale-95 transition-all cursor-pointer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={torchOn ? 'text-yellow-400' : 'text-white'}
              >
                <path d="M18 6c0 2-2 4-2 7v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-6c0-3-2-5-2-7V3h12v3z" />
                <line x1="6" y1="6" x2="18" y2="6" />
              </svg>
              <span>{torchOn ? 'Tap to turn light off' : 'Tap to turn light on'}</span>
            </button>

            {/* Instruction Text */}
            <p className="text-[13px] font-medium text-white/70 mt-3 text-center">
              Scan your friend's QR code to connect
            </p>
          </div>

          {/* Bottom Actions Bar matching Screenshot 5 */}
          <div className="flex items-center justify-around px-8 pb-10 pt-4 bg-gradient-to-t from-black via-black/80 to-transparent">
            {/* Return to My QR Code */}
            <button
              onClick={() => setActiveMode('card')}
              className="flex flex-col items-center gap-2 text-white/90 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                <BiQrScan size={26} className="text-white" />
              </div>
              <span className="text-[12px] font-semibold">My QR code</span>
            </button>

            {/* Scan from Gallery */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 text-white/90 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                <BiImage size={26} className="text-white" />
              </div>
              <span className="text-[12px] font-semibold">Gallery</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleGallerySelect}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Laser Scanning Animation CSS */}
      <style>{`
        @keyframes scanLaser {
          0% { top: 0%; opacity: 0.2; }
          50% { opacity: 1; }
          100% { top: 96%; opacity: 0.2; }
        }
        .animate-scan {
          animation: scanLaser 2.2s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
};

export default QrProfilePage;
