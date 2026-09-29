import crypto from 'crypto';

/**
 * Service to generate STUN and Coturn TURN ICE server configurations
 * Uses HMAC-SHA1 ephemeral credentials based on TURN_SECRET (static-auth-secret).
 */
export const getIceServersConfig = (userId = 'guest') => {
  const turnSecret = process.env.TURN_SECRET;
  const turnUrlsStr = process.env.TURN_URLS || '';
  const stunUrlsStr = process.env.STUN_URLS || '';
  const ttl = parseInt(process.env.TURN_CREDENTIAL_TTL_SEC, 10) || 86400;

  const stunUrls = stunUrlsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const turnUrls = turnUrlsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Fast, optimal STUN servers (keep <= 2 to prevent discovery slowdown and warning)
  const defaultStuns = ['stun:stun.l.google.com:19302'];
  const allStuns = Array.from(new Set([...stunUrls, ...defaultStuns])).slice(0, 2);

  const iceServers = [
    {
      urls: allStuns
    }
  ];

  // If TURN secret and URLs are provided, generate dynamic HMAC credentials
  if (turnSecret && turnUrls.length > 0) {
    const timestamp = Math.floor(Date.now() / 1000) + ttl;
    const username = `${timestamp}:${userId}`;
    const credential = crypto
      .createHmac('sha1', turnSecret)
      .update(username)
      .digest('base64');

    iceServers.push({
      urls: turnUrls,
      username,
      credential
    });
  }

  return {
    iceServers,
    ttlSec: ttl,
    sfuEnabled: process.env.RTC_SFU_ENABLED === 'true',
    meshMaxVideo: parseInt(process.env.RTC_MESH_MAX_VIDEO, 10) || 3,
    meshMaxVoice: parseInt(process.env.RTC_MESH_MAX_VOICE, 10) || 4
  };
};

export default { getIceServersConfig };
