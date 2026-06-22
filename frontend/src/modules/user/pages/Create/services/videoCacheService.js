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

export const saveDraft = async (draftMeta, videoFile, sequence) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
      tx.onabort = (e) => reject(e);

      // Save video file if exists
      if (videoFile) {
        store.put(videoFile, `draft_video_${draftMeta.id}`);
      }
      // Save sequence if exists
      if (sequence) {
        store.put(sequence, `draft_sequence_${draftMeta.id}`);
      }

      // Get current drafts index
      const getRequest = store.get('drafts_index');
      getRequest.onsuccess = () => {
        const index = getRequest.result || [];
        index.unshift(draftMeta);
        store.put(index, 'drafts_index');
      };
    });
  } catch (err) {
    console.error('Failed to save draft:', err);
    throw err;
  }
};

export const getDrafts = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get('drafts_index');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Failed to get drafts:', err);
    return [];
  }
};

export const getDraftVideo = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(`draft_video_${id}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Failed to get draft video:', err);
    return null;
  }
};

export const deleteDraft = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
      tx.onabort = (e) => reject(e);

      store.delete(`draft_video_${id}`);
      store.delete(`draft_sequence_${id}`);

      // Update index
      const getRequest = store.get('drafts_index');
      getRequest.onsuccess = () => {
        const index = getRequest.result || [];
        const nextIndex = index.filter(d => d.id !== id);
        store.put(nextIndex, 'drafts_index');
      };
    });
  } catch (err) {
    console.error('Failed to delete draft:', err);
    throw err;
  }
};

export const loadDraftToCache = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
      tx.onabort = (e) => reject(e);

      // Get video & sequence
      const getVidRequest = store.get(`draft_video_${id}`);
      getVidRequest.onsuccess = () => {
        const video = getVidRequest.result;
        if (video) {
          store.put(video, 'currentVideo');
        } else {
          store.delete('currentVideo');
        }
      };

      const getSeqRequest = store.get(`draft_sequence_${id}`);
      getSeqRequest.onsuccess = () => {
        const sequence = getSeqRequest.result;
        if (sequence) {
          store.put(sequence, 'currentSequence');
        } else {
          store.delete('currentSequence');
        }
      };
    });
  } catch (err) {
    console.error('Failed to load draft to cache:', err);
    throw err;
  }
};
