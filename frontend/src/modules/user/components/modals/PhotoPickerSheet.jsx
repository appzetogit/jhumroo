import React, { useRef } from 'react';
import { BiCamera, BiImageAlt, BiTrash, BiX } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
const PhotoPickerSheet = ({
  isOpen,
  onClose,
  onFileSelected,
  hasExistingPhoto = false,
  onRemovePhoto,
}) => {
  const { isDarkMode } = useTheme();
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  /* ── File handlers ─────────────────────────────── */
  const handleGalleryChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (file) {
      onFileSelected(file); // pass file to parent FIRST
      onClose();            // then close sheet
    }
  };

  const handleCameraChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      onFileSelected(file);
      onClose();
    }
  };

  const options = [
    {
      id: 'camera',
      label: 'Camera',
      icon: <BiCamera size={24} />,
      color: '#20D5EC',
      bgColor: isDarkMode ? 'rgba(32,213,236,0.12)' : 'rgba(32,213,236,0.1)',
      action: () => cameraRef.current?.click(),
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: <BiImageAlt size={24} />,
      color: '#FE2C55',
      bgColor: isDarkMode ? 'rgba(254,44,85,0.12)' : 'rgba(254,44,85,0.1)',
      action: () => galleryRef.current?.click(),
    },
  ];

  return (
    <>
      {/* ── Hidden inputs — always in DOM so refs stay valid ── */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleGalleryChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={handleCameraChange}
      />

      {/* ── Sheet UI — only visible when isOpen ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[7000] flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={onClose}
        >
          <div
            className={`w-full rounded-t-[24px] pb-[calc(var(--safe-area-bottom,0px)+24px)] animate-slide-up ${isDarkMode ? 'bg-[#161823]' : 'bg-white'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex flex-col items-center pt-3 pb-2">
              <div
                className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-black/10'
                  }`}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2
                className={`text-[17px] font-bold ${isDarkMode ? 'text-white' : 'text-black'
                  }`}
              >
                Profile Upload
              </h2>
              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform ${isDarkMode
                  ? 'bg-white/10 text-white'
                  : 'bg-black/5 text-black'
                  }`}
              >
                <BiX size={20} />
              </button>
            </div>

            {/* Option buttons */}
            <div className="px-4 pt-2 pb-4 flex flex-col gap-3">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={opt.action}
                  className={`flex items-center gap-4 w-full p-4 rounded-[18px] active:scale-[0.97] transition-all text-left ${isDarkMode
                    ? 'bg-white/[0.04] hover:bg-white/[0.07]'
                    : 'bg-black/[0.03] hover:bg-black/[0.05]'
                    }`}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: opt.bgColor, color: opt.color }}
                  >
                    {opt.icon}
                  </div>
                  <div>
                    <p
                      className={`text-[15px] font-semibold ${isDarkMode ? 'text-white' : 'text-black'
                        }`}
                    >
                      {opt.label}
                    </p>
                    <p
                      className={`text-[12px] mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-black/40'
                        }`}
                    >
                      {opt.sublabel}
                    </p>
                  </div>
                </button>
              ))}

              {/* Remove photo */}
              {hasExistingPhoto && onRemovePhoto && (
                <button
                  onClick={() => {
                    onRemovePhoto();
                    onClose();
                  }}
                  className={`flex items-center gap-4 w-full p-4 rounded-[18px] active:scale-[0.97] transition-all text-left ${isDarkMode
                    ? 'bg-white/[0.04] hover:bg-white/[0.07]'
                    : 'bg-black/[0.03] hover:bg-black/[0.05]'
                    }`}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: isDarkMode
                        ? 'rgba(255,59,48,0.12)'
                        : 'rgba(255,59,48,0.1)',
                      color: '#FF3B30',
                    }}
                  >
                    <BiTrash size={24} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#FF3B30]">
                      Remove Photo
                    </p>
                    <p
                      className={`text-[12px] mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-black/40'
                        }`}
                    >
                      Remove Profile Picture
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoPickerSheet;
