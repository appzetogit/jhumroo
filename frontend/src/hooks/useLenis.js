import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { LenisContext } from '../context/LenisContext';
import { defaultLenisConfig } from '../config/lenisConfig';

/**
 * Custom React Hook to consume the Lenis smooth scroll instance.
 * 
 * Usage 1 (Retrieve Instance):
 *   const lenis = useLenis();
 *   lenis.stop(); // e.g. pause scrolling
 * 
 * Usage 2 (Register Scroll Listener with auto-cleanup):
 *   useLenis((e) => {
 *     console.log('Scroll Progress:', e.progress);
 *   }, [dependency]);
 * 
 * @param {Function} [callback] - Optional scroll event listener callback.
 * @param {Array} [deps=[]] - Optional dependencies array to re-bind the listener if variables change.
 * @returns {Object|null} The active Lenis instance.
 */
export const useLenis = (callback, deps = []) => {
  const lenis = useContext(LenisContext);

  useEffect(() => {
    if (!lenis || !callback) return;

    // Attach scroll listener
    lenis.on('scroll', callback);

    // Self-cleaning hook: remove event listener on unmount/dependency change
    return () => {
      lenis.off('scroll', callback);
    };
  }, [lenis, callback, ...deps]);

  return lenis;
};

/**
 * Advanced React Hook to initialize and manage the global/container-bound Lenis instance.
 * Performs dynamic scroll-container binding, client-side route navigation awareness,
 * requestAnimationFrame loop driving, and dynamic GSAP ScrollTrigger synchronization.
 * 
 * @param {Object} [customConfig={}] - Config overrides to merge with defaultLenisConfig.
 * @returns {Object|null} The initialized Lenis instance.
 */
export const useInitializeLenis = (customConfig = {}) => {
  const [lenisInstance, setLenisInstance] = useState(null);
  const lenisRef = useRef(null);
  const rafRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lenis = null;
    let ScrollTriggerModule = null;
    let activeContainer = null;

    const setupLenis = (container) => {
      if (activeContainer === container) return;

      // Clean up previous instance if container changed
      if (lenis) {
        lenis.destroy();
        lenis = null;
        lenisRef.current = null;
        setLenisInstance(null);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }

      if (!container) {
        activeContainer = null;
        return;
      }

      activeContainer = container;

      const mergedConfig = {
        ...defaultLenisConfig,
        ...customConfig,
      };

      // Respect mobile touch fallback
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isTouchDevice && !mergedConfig.smoothTouch) {
        return;
      }

      mergedConfig.wrapper = container;
      lenis = new Lenis(mergedConfig);
      lenisRef.current = lenis;
      setLenisInstance(lenis);

      const handleScroll = () => {
        if (ScrollTriggerModule?.ScrollTrigger) {
          ScrollTriggerModule.ScrollTrigger.update();
        }
      };
      lenis.on('scroll', handleScroll);

      // Load GSAP ScrollTrigger dynamically to register the scrollerProxy
      import('gsap/ScrollTrigger')
        .then((module) => {
          ScrollTriggerModule = module;
          
          module.ScrollTrigger.scrollerProxy(container, {
            scrollTop(value) {
              return arguments.length 
                ? lenis.scrollTo(value, { immediate: true }) 
                : lenis.scroll;
            },
            getBoundingClientRect() {
              return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
            },
            pinType: container.style.transform ? "transform" : "fixed"
          });
          
          module.ScrollTrigger.addEventListener('refresh', () => lenis.resize());
          module.ScrollTrigger.refresh();
        })
        .catch(() => {
          // GSAP is not used or imported on the current page, fail silently
        });

      // requestAnimationFrame (RAF) driving loop
      const raf = (time) => {
        if (!lenis) return;
        
        lenis.raf(time);
        
        if (ScrollTriggerModule?.ScrollTrigger) {
          ScrollTriggerModule.ScrollTrigger.update();
        }
        
        rafRef.current = requestAnimationFrame(raf);
      };
      
      rafRef.current = requestAnimationFrame(raf);
    };

    const checkAndSetup = () => {
      // Find the scrollable container in the current DOM.
      const scrollContainer = document.querySelector('.scrollable') || document.querySelector('.reels-feed-container');
      setupLenis(scrollContainer);
    };

    // Run initial check
    checkAndSetup();

    // Setup MutationObserver to watch for container mounting/rendering
    const observer = new MutationObserver(() => {
      checkAndSetup();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (lenis) {
        lenis.destroy();
        lenis = null;
        lenisRef.current = null;
        setLenisInstance(null);
      }
      activeContainer = null;
    };
  }, [location.pathname, JSON.stringify(customConfig)]);

  return lenisInstance;
};
