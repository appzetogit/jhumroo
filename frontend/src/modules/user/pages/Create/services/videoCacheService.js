const DB_NAME = 'JhumrooCreateDB';
const STORE_NAME = 'videoCache';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveVideoToCache = async (file) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, 'currentVideo');
  } catch (err) {
    console.error('Failed to save video to IndexedDB:', err);
  }
};

export const getVideoFromCache = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get('currentVideo');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get video from IndexedDB:', err);
    return null;
  }
};

export const saveSequenceToCache = async (sequence) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(sequence, 'currentSequence');
  } catch (err) {
    console.error('Failed to save sequence to IndexedDB:', err);
  }
};

export const getSequenceFromCache = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get('currentSequence');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get sequence from IndexedDB:', err);
    return null;
  }
};

export const clearVideoCache = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('currentVideo');
    tx.objectStore(STORE_NAME).delete('currentSequence');
  } catch (err) {
    console.error('Failed to clear video cache:', err);
  }
};
