const DB_NAME = "agriseth_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "queue_store";
const QUEUE_KEY = "offline_sync_queue";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getQueue() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(QUEUE_KEY);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]); // return empty on error
    });
  } catch (e) {
    return [];
  }
}

export async function saveQueue(queue) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(queue, QUEUE_KEY);
      tx.oncomplete = () => {
        window.dispatchEvent(new Event("offlineQueueChanged"));
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Failed to save offline queue", e);
  }
}

export async function addToQueue(method, path, body) {
  const queue = await getQueue();
  queue.push({
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    method,
    path,
    body,
    timestamp: new Date().toISOString(),
  });
  await saveQueue(queue);
}

let isSyncing = false;

export async function syncQueue() {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;
  
  window.dispatchEvent(new Event("offlineSyncStarted"));
  
  const queue = await getQueue();
  if (queue.length === 0) {
    isSyncing = false;
    window.dispatchEvent(new Event("offlineSyncCompleted"));
    return;
  }

  const newQueue = [];
  let syncedCount = 0;

  for (const item of queue) {
    try {
      const BASE = "/api";
      const res = await fetch(`${BASE}${item.path}`, {
        method: item.method,
        headers: item.body ? { "Content-Type": "application/json" } : {},
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (!res.ok) {
        if (res.status >= 500 || res.status === 409) {
          newQueue.push(item);
        } else {
          console.warn("Offline item permanently rejected by server", res.status, item);
        }
      } else {
        syncedCount++;
      }
    } catch (err) {
      newQueue.push(item);
    }
  }

  await saveQueue(newQueue);
  isSyncing = false;
  window.dispatchEvent(new Event("offlineSyncCompleted"));
  
  if (syncedCount > 0) {
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { type: "success", message: `Synced ${syncedCount} items` } }));
  }
}
