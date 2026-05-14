import React, { useEffect } from 'react';

const AddToFavoritesModal = ({ isOpen, onCancel, onConfirm }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const root = document.getElementById('root');
    const feedContainer = document.querySelector('.home-feed-scroll-lockable');

    const previousStyles = {
      bodyOverflow: document.body.style.overflow,
      bodyTouchAction: document.body.style.touchAction,
      bodyOverscrollBehavior: document.body.style.overscrollBehavior,
      htmlOverflow: document.documentElement.style.overflow,
      htmlTouchAction: document.documentElement.style.touchAction,
      rootOverflow: root?.style.overflow,
      feedOverflow: feedContainer instanceof HTMLElement ? feedContainer.style.overflow : '',
      feedTouchAction: feedContainer instanceof HTMLElement ? feedContainer.style.touchAction : '',
    };

    const preventScroll = (event) => {
      event.preventDefault();
    };

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.touchAction = 'none';

    if (root) {
      root.style.overflow = 'hidden';
    }

    if (feedContainer instanceof HTMLElement) {
      feedContainer.style.overflow = 'hidden';
      feedContainer.style.touchAction = 'none';
    }

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = previousStyles.bodyOverflow;
      document.body.style.touchAction = previousStyles.bodyTouchAction;
      document.body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
      document.documentElement.style.overflow = previousStyles.htmlOverflow;
      document.documentElement.style.touchAction = previousStyles.htmlTouchAction;

      if (root) {
        root.style.overflow = previousStyles.rootOverflow || '';
      }

      if (feedContainer instanceof HTMLElement) {
        feedContainer.style.overflow = previousStyles.feedOverflow;
        feedContainer.style.touchAction = previousStyles.feedTouchAction;
      }

      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[2000] flex items-end justify-center overscroll-none touch-none"
      style={{ pointerEvents: 'auto' }}
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onCancel} />

      <div className="relative w-full max-w-[480px] overflow-hidden rounded-t-[28px] border border-black/5 border-b-0 bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.28)] animate-slide-up">
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-11 rounded-full bg-black/10" />
        </div>

        <button
          onClick={onCancel}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/40 transition-colors hover:bg-black/[0.07] active:scale-95"
          style={{ pointerEvents: 'auto' }}
          aria-label="Close favorites popup"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>

        <div className="flex justify-center px-6 pb-4 pt-5">
          <div className="relative flex h-[126px] w-[220px] items-center justify-center overflow-hidden rounded-[20px] border border-black/5 bg-gradient-to-br from-[#f7f8fb] via-[#eef1f7] to-[#e9edf5] shadow-inner">
            <div className="absolute inset-x-6 top-4 h-10 rounded-full bg-white/55 blur-xl" />
            <div className="relative z-10 flex h-[74px] w-[170px] items-center gap-3 rounded-[14px] border border-black/[0.04] bg-white px-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#9ca3af">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>

              <div className="flex-1">
                <div className="mb-2 h-2.5 w-20 rounded-full bg-gray-200" />
                <div className="h-2.5 w-14 rounded-full bg-gray-200" />
              </div>

              <div className="absolute -right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-yellow-400 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 h-[56px] w-[150px] -translate-x-1/2 rounded-[16px] border border-white/50 bg-white/65 shadow-sm" />
          </div>
        </div>

        <div className="px-6 pb-5 text-center">
          <h3 className="mx-auto mb-2 max-w-[290px] text-[15px] font-extrabold leading-[1.35] text-[#111827] sm:text-[17px]">
            Creators will be notified that you added their post to Favourites
          </h3>
          <p className="text-[13px] leading-relaxed text-black/45">
            Your support means a lot to creators.
          </p>
        </div>

        <div className="mx-0 h-px bg-black/[0.06]" />

        <div className="flex gap-3 bg-white px-4 pb-4 pt-4">
          <button
            onClick={onCancel}
            className="min-h-[54px] flex-1 rounded-[14px] border border-[#d1d5db] bg-[#f7f8fb] py-4 text-[15px] font-semibold text-black/60 transition-all active:scale-[0.98] active:bg-black/[0.04]"
            style={{ pointerEvents: 'auto' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="min-h-[54px] flex-1 rounded-[14px] py-4 text-[15px] font-extrabold tracking-[0.01em] text-white transition-all active:scale-[0.98] active:brightness-95"
            style={{
              background: 'linear-gradient(180deg, #ff4d73 0%, var(--color-accent-red, #FE2C55) 100%)',
              boxShadow: '0 12px 24px rgba(254, 44, 85, 0.22)',
              pointerEvents: 'auto',
            }}
          >
            OK
          </button>
        </div>

        <div style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
      </div>
    </div>
  );
};

export default AddToFavoritesModal;
