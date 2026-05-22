/**
 * Centralized Lenis Smooth Scroll Configuration Object.
 * Exposes optimal parameters for a buttery-smooth, premium momentum-based scrolling experience.
 */
export const defaultLenisConfig = {
  // Duration in seconds for scroll animation
  duration: 1.2,
  
  // Custom easing function representing premium, momentum-based slowing (Awwwards style)
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  
  // Smooth scroll for mouse wheel inputs
  smoothWheel: true,
  
  // Disable smooth scroll on mobile touch events by default (respect native device momentum)
  smoothTouch: false,
  
  // Scroll speed multiplier
  wheelMultiplier: 1.0,
  
  // Whether to enable infinite scrolling loops
  infinite: false,
  
  // Axis of scroll
  orientation: 'vertical',
  
  // Axis of gesture
  gestureOrientation: 'vertical',
  
  // Normalizes mouse wheel event values across browsers (resolves Safari wheel event quirks)
  normalizeWheel: true,
};

export default defaultLenisConfig;
