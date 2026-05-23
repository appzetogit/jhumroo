/**
 * FCM (Firebase Cloud Messaging) service for web push notifications in Jhumroo
 */

import { firebaseApp } from "./firebase.js";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { userService } from "../services";

let messagingInstance = null;
// Singleton promise to ensure service worker is only registered once
let swRegistrationPromise = null;

async function getFCMInstance() {
  if (messagingInstance) return messagingInstance;
  
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[FCM] Messaging is not supported in this browser environment");
      return null;
    }
    
    if (firebaseApp) {
      messagingInstance = getMessaging(firebaseApp);
      return messagingInstance;
    }
  } catch (error) {
    console.error("[FCM] Error initializing Messaging instance:", error);
  }
  
  return null;
}

/**
 * Register service worker exactly once and return a singleton promise
 */
function getServiceWorkerRegistration() {
  if (!swRegistrationPromise && "serviceWorker" in navigator) {
    swRegistrationPromise = navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then(async (reg) => {
        await navigator.serviceWorker.ready;
        return reg;
      })
      .catch((err) => {
        console.error("[FCM] Service worker registration failed:", err);
        swRegistrationPromise = null; // allow retry on next call
        return null;
      });
  }
  return swRegistrationPromise;
}

/**
 * Request notification permission and return FCM token
 * @returns {Promise<string|null>} FCM token or null
 */
export async function getFcmToken() {
  try {
    if (!("Notification" in window)) {
      console.warn("[FCM] Notifications API not available in this browser");
      return null;
    }

    if (Notification.permission === "denied") {
      console.warn("[FCM] Notification permission denied");
      return null;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("[FCM] Notification permission not granted:", permission);
        return null;
      }
    }

    const messaging = await getFCMInstance();
    if (!messaging) return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BOJhJlQwJQPP5z4H5ssXAg7Cw1hbjRTBC16kU5YRNMZU2A_Bu0a81rtlGpenwbvEqLcMcRhPfN0Fk88Dl7vvAIg";

    // Use singleton SW registration to prevent multiple instances
    const serviceWorkerRegistration = await getServiceWorkerRegistration();

    const token = await getToken(messaging, {
      vapidKey: String(vapidKey).trim(),
      ...(serviceWorkerRegistration ? { serviceWorkerRegistration } : {}),
    });

    return token || null;
  } catch (err) {
    console.warn("[FCM] getFcmToken failed:", err?.message || err);
    return null;
  }
}

/**
 * Register FCM token with backend
 * @param {object} options - { fcmToken? }
 */
export async function registerFcmToken(options = {}) {
  const { fcmToken: providedToken } = options;
  
  try {
    const token = providedToken || (await getFcmToken());
    if (!token) return;

    await userService.updateFCMToken({ fcmToken: token });
    console.log("[FCM] Token registered with backend successfully");
  } catch (err) {
    console.warn("[FCM] Backend registration failed:", err?.message || err);
  }
}

/**
 * Remove FCM token on logout - clears token from backend without re-fetching
 */
export async function removeFcmToken() {
  try {
    // Directly clear the token from backend — no need to call getFcmToken() here
    // (which would unnecessarily re-register the SW and request permission again)
    await userService.updateFCMToken({ fcmToken: "" });
    console.log("[FCM] Token unregistered from backend on logout");
  } catch (err) {
    console.warn("[FCM] Backend unregistration failed:", err?.message || err);
  }
}

/**
 * Set up foreground message handler (when app is open)
 * @param {Function} callback - Function to handle notification: (payload) => void
 * @returns {Function} Cleanup function to unsubscribe
 */
export async function onForegroundMessage(callback) {
  try {
    const messaging = await getFCMInstance();
    if (!messaging) return () => {};

    // Set up the message handler
    const unsubscribe = onMessage(messaging, (payload) => {
      // Build a deduplication key from type + senderId + reelId/commentId
      // This covers all notification types, not just those with a tag field
      const type = payload.data?.type || 'unknown';
      const senderId = payload.data?.senderId || '';
      const reelId = payload.data?.reelId || '';
      const commentId = payload.data?.commentId || '';
      const dedupeKey = `fcm_fg_${type}_${senderId}_${reelId}_${commentId}`;

      const lastShown = sessionStorage.getItem(dedupeKey);
      const now = Date.now();

      // Suppress if the same notification was already handled within 3 seconds
      if (lastShown && (now - parseInt(lastShown)) < 3000) {
        console.log('[FCM] Suppressing duplicate foreground notification:', dedupeKey);
        return;
      }
      sessionStorage.setItem(dedupeKey, now.toString());
      
      if (callback && typeof callback === 'function') {
        callback(payload);
      }
    });

    return unsubscribe;
  } catch (err) {
    console.error("[FCM] onForegroundMessage setup failed:", err);
    return () => {};
  }
}
