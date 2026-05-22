import { createContext } from 'react';

/**
 * React Context that holds the active global or container-scoped Lenis smooth scroll instance.
 * Allows nested components to programmatically access controls likescrollTo, stop, and start.
 */
export const LenisContext = createContext(null);

export default LenisContext;
