/**
 * Safe utility to programmatically scroll to a specific target using the Lenis scroll engine.
 * Automatically falls back to native browser smooth scrolling if Lenis is not active or
 * on mobile devices where native touch scroll is preferred.
 * 
 * @param {Object|null} lenis - The active Lenis instance (obtained via useLenis hook).
 * @param {string|number|HTMLElement} target - Destination (CSS selector, pixels from top, or DOM element).
 * @param {Object} [options={}] - Custom scroll configurations (offset, duration, easing, immediate).
 */
export const scrollTo = (lenis, target, options = {}) => {
  // If Lenis is not active/available, execute standard native window scroll
  if (!lenis) {
    if (typeof window === 'undefined') return;

    const scrollOptions = {
      behavior: options.immediate ? 'auto' : 'smooth',
    };

    if (typeof target === 'number') {
      window.scrollTo({ top: target, ...scrollOptions });
    } else {
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (element) {
        element.scrollIntoView(scrollOptions);
      }
    }
    return;
  }

  // Merge default scrollTo behaviors
  const defaultOptions = {
    offset: 0,
    duration: 1.2,
    immediate: false,
  };

  // Perform smooth scroll using Lenis scrollTo method
  lenis.scrollTo(target, { ...defaultOptions, ...options });
};

export default scrollTo;
