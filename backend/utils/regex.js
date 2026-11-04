/** Escape user input for literal use inside a MongoDB $regex (prevents ReDoS / regex injection). */
export const escapeRegex = (s) => String(s ?? '').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
