import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { LenisContext } from '../context/LenisContext';
import { useInitializeLenis } from '../hooks/useLenis';

/**
 * Global Wrapper Component that integrates Lenis smooth scroll with React.
 * Mounts the Lenis context, initializes the RAF scroll engine, and manages auto-scrolling
 * on client-side route changes.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child routes/components.
 * @param {Object} [props.config={}] - Dynamic scroll configurations to override defaultLenisConfig.
 */
export const LenisProvider = ({ children, config = {} }) => {
  const lenis = useInitializeLenis(config);
  const { pathname } = useLocation();

  // "Scroll to top on route change (SPA navigation)" requirement.
  // Performs an instantaneous reset to scroll position 0,0 on every route change,
  // preventing new page screens from inheriting the scroll position of the previous page.
  useEffect(() => {
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname, lenis]);

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  );
};

LenisProvider.propTypes = {
  children: PropTypes.node.isRequired,
  config: PropTypes.object,
};

export default LenisProvider;
