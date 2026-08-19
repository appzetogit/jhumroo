import React from 'react';
import { BiX } from 'react-icons/bi';

export const sheetOverlayClass =
  'fixed inset-0 z-[500] bg-black/60 backdrop-blur-xs flex items-end justify-center';

export const Toggle = ({ enabled, onToggle, isDarkMode = false }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border transition-all duration-200 ${
      enabled
        ? isDarkMode
          ? 'border-[#2fd96b]/40 bg-[linear-gradient(180deg,#31df70_0%,#21c45f_100%)] shadow-[0_8px_20px_rgba(33,196,95,0.24)]'
          : 'border-[#2fd96b]/35 bg-[linear-gradient(180deg,#34de73_0%,#25c863_100%)] shadow-[0_8px_18px_rgba(37,200,99,0.18)]'
        : isDarkMode
          ? 'border-white/10 bg-white/10'
          : 'border-black/10 bg-black/10'
    }`}
    aria-pressed={enabled}
  >
    <span
      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.22)] transition-transform duration-200 ${
        enabled ? 'translate-x-[24px]' : 'translate-x-[2px]'
      }`}
    />
  </button>
);

export const BottomSheet = ({ title, onClose, children, compact = false, scrollable = false, transparentOverlay = false, isDarkMode = true }) => (
  <div className={transparentOverlay ? "absolute inset-0 z-[500] flex items-end justify-center bg-transparent" : sheetOverlayClass} onClick={onClose}>
    <div
      className={`flex w-full max-w-[450px] flex-col overflow-hidden rounded-t-[24px] shadow-2xl transition-all ${
        isDarkMode
          ? 'bg-[#1c1c1e] text-white border-t border-white/10 shadow-[0_-12px_45px_rgba(0,0,0,0.9)]'
          : 'bg-white text-black'
      } ${
        compact ? 'pb-[max(1rem,env(safe-area-inset-bottom))]' : 'max-h-[78%] pb-[max(1.25rem,env(safe-area-inset-bottom))]'
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3">
        <h3 className={`text-[17px] font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{title}</h3>
        <button type="button" onClick={onClose} className={`${isDarkMode ? 'text-white/70 hover:text-white' : 'text-black/65'} active:opacity-60`}>
          <BiX size={22} />
        </button>
      </div>
      <div className={scrollable ? 'min-h-0 overflow-y-auto' : ''}>{children}</div>
    </div>
  </div>
);

export const CenterModal = ({ title, description, primaryLabel, secondaryLabel, onPrimary, onSecondary, isDarkMode = false }) => (
  <div className={`absolute inset-0 z-40 flex items-center justify-center px-6 ${isDarkMode ? 'bg-black/58' : 'bg-black/45'}`}>
    <div
      className={`w-full max-w-[300px] rounded-[18px] px-5 py-5 text-center shadow-xl ${
        isDarkMode
          ? 'border border-white/10 bg-[#17181c] text-white shadow-[0_24px_48px_rgba(0,0,0,0.45)]'
          : 'bg-white text-black'
      }`}
    >
      <h3 className="text-[18px] font-semibold">{title}</h3>
      <p className={`mt-3 text-[13px] leading-5 ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{description}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onSecondary}
          className={`rounded-[10px] px-4 py-2.5 text-[14px] font-medium active:opacity-70 ${
            isDarkMode
              ? 'border border-white/10 bg-white/5 text-white/75'
              : 'border border-black/10 text-black/70'
          }`}
        >
          {secondaryLabel}
        </button>
        <button
          type="button"
          onClick={onPrimary}
          className="rounded-[10px] bg-[#fe2c55] px-4 py-2.5 text-[14px] font-semibold text-white active:opacity-80"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  </div>
);
