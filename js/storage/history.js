/**
 * BIG Downloader Web — Download History (IndexedDB & LocalStorage fallback)
 */

const DB_NAME = 'BIGDownloaderDB';
const DB_VERSION = 1;
const STORE_NAME = 'download_history';

class HistoryStorage {
  constructor() {
    this.db = null;
    this.ready = this.initDB();
  }

  async initDB() {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB tidak didukung, beralih ke localStorage fallback.');
      return null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('regionName', 'regionName', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        resolve(null); // Fallback to localStorage
      };
    });
  }

  /**
   * Save a completed download to history
   * @param {Object} item 
   */
  async add(item) {
    await this.ready;
    const record = {
      ...item,
      timestamp: Date.now(),
      dateStr: new Date().toISOString()
    };

    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } else {
      // LocalStorage fallback
      try {
        const list = JSON.parse(localStorage.getItem(STORE_NAME) || '[]');
        record.id = Date.now();
        list.unshift(record);
        if (list.length > 100) list.pop(); // keep last 100
        localStorage.setItem(STORE_NAME, JSON.stringify(list));
        return record.id;
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }
    }
  }

  /**
   * Get all download records (newest first)
   */
  async getAll() {
    await this.ready;
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = req.result || [];
          items.sort((a, b) => b.timestamp - a.timestamp);
          resolve(items);
        };
        req.onerror = () => resolve([]);
      });
    } else {
      try {
        return JSON.parse(localStorage.getItem(STORE_NAME) || '[]');
      } catch {
        return [];
      }
    }
  }

  /**
   * Delete single item by ID
   * @param {number} id 
   */
  async delete(id) {
    await this.ready;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(Number(id));
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } else {
      const list = JSON.parse(localStorage.getItem(STORE_NAME) || '[]');
      const filtered = list.filter(item => item.id !== id);
      localStorage.setItem(STORE_NAME, JSON.stringify(filtered));
      return true;
    }
  }

  /**
   * Clear all history records
   */
  async clear() {
    await this.ready;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } else {
      localStorage.removeItem(STORE_NAME);
      return true;
    }
  }
}

export const historyStorage = new HistoryStorage();

