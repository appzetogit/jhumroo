/**
 * Age gate for signup. dob: 'YYYY-MM-DD' (an ISO timestamp works too; only its date part is used,
 * so the phone's timezone can't shift the day). False for garbage, impossible dates and the future.
 */
export const isAdult = (dob, now = new Date(), minAge = 18) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dob ?? ''));
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const born = new Date(Date.UTC(y, mo - 1, d));
  if (born.getUTCMonth() !== mo - 1 || born.getUTCDate() !== d || born > now) return false;
  // The 18th birthday itself counts. 29 Feb babies turn 18 on 1 Mar in non-leap years (Date.UTC rolls over).
  return new Date(Date.UTC(y + minAge, mo - 1, d)) <= now;
};
