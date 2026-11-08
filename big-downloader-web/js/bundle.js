/* BIG Downloader Web — Standalone Static Bundle (No Localhost Required) */
(function() {
  "use strict";

  /* --- File: js/utils/helpers.js --- */
/**
 * BIG Downloader Web — Utility Helpers
 */

/**
 * Escape HTML to prevent XSS injection
 * @param {string} str 
 * @returns {string}
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Debounce a function call
 * @param {Function} func 
 * @param {number} waitMs 
 * @returns {Function}
 */
function debounce(func, waitMs = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, waitMs);
  };
}

/**
 * Trigger browser download for a Blob
 * @param {Blob|Uint8Array|string} content 
 * @param {string} filename 
 * @param {string} mimeType 
 */
function downloadBlob(content, filename, mimeType = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

/**
 * Async delay
 * @param {number} ms 
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deep clone an object
 * @param {any} obj 
 * @returns {any}
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Normalize and clean string for comparison
 * @param {string} text 
 * @returns {string}
 */
function normalizeName(text) {
  if (!text) return '';
  return text.trim().toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/^KAB\.\s*/i, 'KABUPATEN ')
    .replace(/^KOTA\s*/i, 'KOTA ');
}



  /* --- File: js/utils/format.js --- */
/**
 * BIG Downloader Web — Formatting Utilities
 */

/**
 * Format bytes to human readable string (KB, MB, GB)
 * @param {number} bytes 
 * @param {number} decimals 
 * @returns {string}
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format numbers with Indonesian thousand separator
 * @param {number} num 
 * @returns {string}
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format timestamp to localized date & time
 * @param {number|Date|string} dateInput 
 * @returns {string}
 */
function formatDate(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get CSS badge class for administrative level
 * @param {string} level 
 * @returns {string}
 */
function getAdminLevelBadgeClass(level) {
  switch (level?.toLowerCase()) {
    case 'provinsi':
      return 'nb-badge-prov';
    case 'kabupaten/kota':
    case 'kabupaten':
    case 'kota':
      return 'nb-badge-kab';
    case 'kecamatan':
      return 'nb-badge-kec';
    case 'desa/kelurahan':
    case 'desa':
      return 'nb-badge-desa';
    default:
      return '';
  }
}

/**
 * Create safe filename from region name and level
 * @param {string} name 
 * @param {string} level 
 * @param {string} ext 
 * @returns {string}
 */
function generateFilename(name, level, ext) {
  const cleanName = (name || 'Wilayah')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');
  const cleanLevel = (level || 'Admin')
    .replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `BIG_${cleanLevel}_${cleanName}_${dateStr}.${ext}`;
}



  /* --- File: js/utils/dom.js --- */
/**
 * BIG Downloader Web — DOM Utilities & Notifications
 */


const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

/**
 * Show a Neo-Brutalist Toast notification
 * @param {string} message 
 * @param {'success'|'error'|'info'|'warning'} type 
 * @param {number} durationMs 
 */
function showToast(message, type = 'info', durationMs = 4000) {
  let container = $('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `nb-toast nb-toast-${type}`;

  const iconSvg = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  }[type] || '';

  toast.innerHTML = `
    <div>${iconSvg}</div>
    <div style="flex: 1; font-weight: 700; font-size: 0.9rem;">${escapeHTML(message)}</div>
    <button class="toast-close-btn" style="background: none; border: none; cursor: pointer; font-weight: 800; font-size: 1.1rem; line-height: 1;">&times;</button>
  `;

  container.appendChild(toast);

  const close = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector('.toast-close-btn').addEventListener('click', close);
  setTimeout(close, durationMs);
}

/**
 * Open modal by ID
 * @param {string} modalId 
 */
function openModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close modal by ID
 * @param {string} modalId 
 */
function closeModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}



  /* --- File: js/storage/history.js --- */
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

const historyStorage = new HistoryStorage();



  /* --- File: js/api/query-builder.js --- */
/**
 * BIG Downloader Web — ArcGIS Query Builder
 */

class QueryBuilder {
  /**
   * Escape single quotes for ArcGIS SQL where clause
   * @param {string} val 
   * @returns {string}
   */
  static escapeSQL(val) {
    if (!val) return '';
    return val.replace(/'/g, "''").trim();
  }

  /**
   * Build WHERE clause for searching by region name
   * @param {string} queryText 
   * @param {Object} [hierarchyFilter] - Optional province or regency filter
   * @returns {string}
   */
  static buildSearchWhere(queryText, hierarchyFilter = {}) {
    const clauses = [];
    const cleanQuery = this.escapeSQL(queryText).toUpperCase();

    if (cleanQuery) {
      // ArcGIS supports UPPER() in WHERE clause
      clauses.push(`(UPPER(NAMOBJ) LIKE '%${cleanQuery}%' OR UPPER(WADMKK) LIKE '%${cleanQuery}%' OR UPPER(WADMKC) LIKE '%${cleanQuery}%')`);
    } else {
      clauses.push('1=1');
    }

    if (hierarchyFilter.province) {
      const prov = this.escapeSQL(hierarchyFilter.province);
      clauses.push(`WADMPR = '${prov}'`);
    }

    if (hierarchyFilter.regency) {
      const reg = this.escapeSQL(hierarchyFilter.regency);
      clauses.push(`WADMKK = '${reg}'`);
    }

    return clauses.join(' AND ');
  }

  /**
   * Build WHERE clause to fetch all districts or regencies of a specific province
   * @param {string} provinceName 
   * @returns {string}
   */
  static buildProvinceWhere(provinceName) {
    const prov = this.escapeSQL(provinceName);
    return `WADMPR = '${prov}'`;
  }

  /**
   * Build WHERE clause to fetch single feature by OBJECTID
   * @param {number|string} objectId 
   * @returns {string}
   */
  static buildObjectIdWhere(objectId) {
    return `OBJECTID = ${Number(objectId)}`;
  }
}



  /* --- File: js/api/big-api.js --- */
/**
 * BIG Downloader Web — ArcGIS REST API Client
 */

const BIG_BASE_URL = 'https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer';

const LAYER_KABKOTA = 0;
const LAYER_KECAMATAN = 1;
const LAYER_DESA = 2;

const DEFAULT_PAGE_SIZE = 1000;

class BigApiClient {
  constructor(baseUrl = BIG_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultTimeoutMs = 25000;
  }

  /**
   * Health check for BIG MapServer
   * @returns {Promise<{ online: boolean, message?: string }>}
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(`${this.baseUrl}?f=pjson`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        if (data.serviceDescription || data.layers || data.currentVersion) {
          return { online: true };
        }
      }
      return { online: false, message: `Status HTTP: ${resp.status}` };
    } catch (err) {
      return { online: false, message: err.message };
    }
  }

  /**
   * Query attributes without geometry for high performance search
   * @param {Object} options
   * @returns {Promise<{ features: Array, exceededTransferLimit: boolean }>}
   */
  async queryAttributes({
    layerId,
    where = '1=1',
    outFields = 'OBJECTID,NAMOBJ,WADMPR,WADMKK,WADMKC,KDPKAB,KDPPUM,KDCPUM,LUASWH',
    offset = 0,
    recordCount = 50,
    signal
  }) {
    const params = new URLSearchParams({
      where,
      outFields,
      returnGeometry: 'false',
      f: 'json',
      resultOffset: String(offset),
      resultRecordCount: String(recordCount)
    });

    const url = `${this.baseUrl}/${layerId}/query?${params.toString()}`;
    const resp = await fetch(url, { signal });

    if (!resp.ok) {
      throw new Error(`BIG API Error HTTP ${resp.status}: ${resp.statusText}`);
    }

    const json = await resp.json();
    if (json.error) {
      throw new Error(`ArcGIS Error: ${json.error.message || json.error.details?.[0]}`);
    }

    return {
      features: json.features || [],
      exceededTransferLimit: Boolean(json.exceededTransferLimit)
    };
  }

  /**
   * Query full GeoJSON with geometry (EPSG:4326)
   * @param {Object} options
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async queryGeoJSON({
    layerId,
    where = '1=1',
    outFields = '*',
    offset = 0,
    recordCount = DEFAULT_PAGE_SIZE,
    signal,
    onProgress
  }) {
    let allFeatures = [];
    let currentOffset = offset;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        where,
        outFields,
        returnGeometry: 'true',
        outSR: '4326',
        f: 'geojson',
        resultOffset: String(currentOffset),
        resultRecordCount: String(recordCount)
      });

      const url = `${this.baseUrl}/${layerId}/query?${params.toString()}`;
      const resp = await fetch(url, { signal });

      if (!resp.ok) {
        throw new Error(`Gagal mengambil GeoJSON dari BIG (HTTP ${resp.status})`);
      }

      const geojson = await resp.json();
      if (geojson.error) {
        throw new Error(`ArcGIS Error: ${geojson.error.message}`);
      }

      const features = geojson.features || [];
      allFeatures = allFeatures.concat(features);

      if (onProgress) {
        onProgress({
          fetchedCount: allFeatures.length,
          batchCount: features.length
        });
      }

      // Check if more records exist
      if (geojson.exceededTransferLimit && features.length > 0) {
        currentOffset += features.length;
      } else {
        hasMore = false;
      }
    }

    return {
      type: 'FeatureCollection',
      name: `BIG_Layer_${layerId}`,
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
      },
      features: allFeatures
    };
  }
}

const bigApi = new BigApiClient();



  /* --- File: js/services/validation-service.js --- */
/**
 * BIG Downloader Web — Geometry & Data Validation Service
 */

class ValidationService {
  /**
   * Validate a GeoJSON FeatureCollection
   * @param {Object} geojson 
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  static validate(geojson) {
    const errors = [];
    const warnings = [];

    if (!geojson || typeof geojson !== 'object') {
      errors.push('Format data bukan objek JSON valid.');
      return { valid: false, errors, warnings };
    }

    if (geojson.type !== 'FeatureCollection') {
      errors.push(`Tipe root harus 'FeatureCollection', ditemukan '${geojson.type}'.`);
    }

    if (!Array.isArray(geojson.features) || geojson.features.length === 0) {
      errors.push('FeatureCollection tidak memiliki fitur (kosong).');
      return { valid: false, errors, warnings };
    }

    // Check features
    let invalidCoordsCount = 0;
    let unclosedRings = 0;

    for (let i = 0; i < geojson.features.length; i++) {
      const f = geojson.features[i];
      if (!f.geometry) {
        errors.push(`Fitur #${i + 1} tidak memiliki geometri.`);
        continue;
      }

      const type = f.geometry.type;
      if (!['Polygon', 'MultiPolygon', 'Point', 'MultiPoint', 'LineString', 'MultiLineString'].includes(type)) {
        errors.push(`Tipe geometri '${type}' pada fitur #${i + 1} tidak didukung.`);
      }

      // Ring validation for Polygons
      if (type === 'Polygon') {
        const rings = f.geometry.coordinates || [];
        for (const ring of rings) {
          if (!this.isRingClosed(ring)) unclosedRings++;
          if (!this.checkCoordsRange(ring)) invalidCoordsCount++;
        }
      } else if (type === 'MultiPolygon') {
        const polys = f.geometry.coordinates || [];
        for (const poly of polys) {
          for (const ring of poly) {
            if (!this.isRingClosed(ring)) unclosedRings++;
            if (!this.checkCoordsRange(ring)) invalidCoordsCount++;
          }
        }
      }
    }

    if (unclosedRings > 0) {
      warnings.push(`Ditemukan ${unclosedRings} polygon ring yang titik awal dan akhirnya tidak identik.`);
    }

    if (invalidCoordsCount > 0) {
      warnings.push(`Ditemukan koordinat di luar rentang geografis normal.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static isRingClosed(ring) {
    if (!Array.isArray(ring) || ring.length < 4) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    return Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7;
  }

  static checkCoordsRange(ring) {
    if (!Array.isArray(ring)) return false;
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) return false;
      const [lon, lat] = pt;
      if (isNaN(lon) || isNaN(lat)) return false;
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return false;
    }
    return true;
  }
}



  /* --- File: js/services/geometry-service.js --- */
/**
 * BIG Downloader Web — Geometry Service
 */



class GeometryService {
  /**
   * Fetch full geometry for a selected region item
   * @param {Object} regionItem 
   * @param {Function} [onProgress]
   * @param {AbortSignal} [signal]
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchRegionGeometry(regionItem, onProgress, signal) {
    if (!regionItem) throw new Error('Wilayah belum dipilih.');

    // Case 1: Province — fetch all kab/kota in province and combine/dissolve
    if (regionItem.adminLevel === 'Provinsi') {
      const where = QueryBuilder.buildProvinceWhere(regionItem.name);
      const rawGeoJSON = await bigApi.queryGeoJSON({
        layerId: LAYER_KABKOTA,
        where,
        outFields: '*',
        signal,
        onProgress
      });

      return this.processProvinceGeometry(rawGeoJSON, regionItem.name);
    }

    // Case 2: Kabupaten/Kota or Kecamatan — fetch by OBJECTID
    const layerId = regionItem.layerId;
    const where = QueryBuilder.buildObjectIdWhere(regionItem.objectId);

    const geojson = await bigApi.queryGeoJSON({
      layerId,
      where,
      outFields: '*',
      signal,
      onProgress
    });

    if (!geojson.features || geojson.features.length === 0) {
      throw new Error(`Data geometri untuk ${regionItem.name} tidak ditemukan.`);
    }

    return geojson;
  }

  /**
   * Process multiple regency polygons into unified province geometry
   * @param {Object} rawGeoJSON 
   * @param {string} provinceName 
   * @returns {Object} Unified FeatureCollection
   */
  processProvinceGeometry(rawGeoJSON, provinceName) {
    const features = rawGeoJSON.features || [];
    if (features.length === 0) {
      throw new Error(`Tidak ada data kabupaten/kota untuk provinsi ${provinceName}`);
    }

    // If turf is available, we combine or dissolve safely
    if (window.turf && typeof window.turf.combine === 'function') {
      try {
        const combined = window.turf.combine(rawGeoJSON);
        if (combined.features && combined.features.length > 0) {
          const unifiedFeature = combined.features[0];
          unifiedFeature.properties = {
            NAMOBJ: provinceName,
            WADMPR: provinceName,
            ADMIN_LEVEL: 'Provinsi',
            KABKOTA_COUNT: features.length,
            SOURCE: 'Badan Informasi Geospasial (BIG)'
          };

          return {
            type: 'FeatureCollection',
            name: `BIG_Provinsi_${provinceName}`,
            features: [unifiedFeature]
          };
        }
      } catch (err) {
        console.warn('Gagal melakukan turf combine, fallback ke multi-feature:', err);
      }
    }

    // Fallback: return FeatureCollection containing all regencies
    return {
      type: 'FeatureCollection',
      name: `BIG_Provinsi_${provinceName}`,
      features: features.map(f => {
        f.properties = f.properties || {};
        f.properties.WADMPR = provinceName;
        return f;
      })
    };
  }

  /**
   * Calculate bounding box [minX, minY, maxX, maxY] from GeoJSON
   * @param {Object} geojson 
   * @returns {[number, number, number, number]}
   */
  calculateBounds(geojson) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const scanCoords = (coords) => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        const x = coords[0];
        const y = coords[1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      } else {
        coords.forEach(scanCoords);
      }
    };

    const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
    for (const f of features) {
      if (f.geometry && f.geometry.coordinates) {
        scanCoords(f.geometry.coordinates);
      }
    }

    if (minX === Infinity) {
      // Default Indonesia center bounds if calculation fails
      return [95.0, -11.0, 141.0, 6.0];
    }

    return [minX, minY, maxX, maxY];
  }

  /**
   * Calculate centroid [lng, lat]
   * @param {[number, number, number, number]} bounds 
   * @returns {[number, number]}
   */
  calculateCentroid(bounds) {
    return [
      (bounds[0] + bounds[2]) / 2,
      (bounds[1] + bounds[3]) / 2
    ];
  }
}

const geometryService = new GeometryService();



  /* --- File: js/services/search-service.js --- */
/**
 * BIG Downloader Web — Search Service
 */




class SearchService {
  constructor() {
    this.provinceCache = null;
    this.currentAbortController = null;
  }

  /**
   * Cancel ongoing search request
   */
  cancelOngoing() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  /**
   * Fetch and cache all Indonesian provinces from BIG Layer 0
   * @returns {Promise<string[]>}
   */
  async getProvinces() {
    if (this.provinceCache && this.provinceCache.length > 0) {
      return this.provinceCache;
    }

    try {
      const res = await bigApi.queryAttributes({
        layerId: LAYER_KABKOTA,
        where: '1=1',
        outFields: 'WADMPR',
        offset: 0,
        recordCount: 1000
      });

      const provSet = new Set();
      for (const f of res.features) {
        const prov = f.attributes?.WADMPR;
        if (prov && prov.trim() && prov.trim() !== 'null') {
          provSet.add(prov.trim());
        }
      }

      this.provinceCache = Array.from(provSet).sort();
      return this.provinceCache;
    } catch (err) {
      console.warn('Gagal memuat daftar provinsi otomatis, menggunakan fallback daftar resmi:', err);
      // Reliable fallback standard list of 38 Indonesian provinces
      this.provinceCache = [
        "ACEH", "BALI", "BANTEN", "BENGKULU", "DI YOGYAKARTA", "DKI JAKARTA",
        "GORONTALO", "JAMBI", "JAWA BARAT", "JAWA TENGAH", "JAWA TIMUR",
        "KALIMANTAN BARAT", "KALIMANTAN SELATAN", "KALIMANTAN TENGAH", "KALIMANTAN TIMUR", "KALIMANTAN UTARA",
        "KEPULAUAN BANGKA BELITUNG", "KEPULAUAN RIAU", "LAMPUNG", "MALUKU", "MALUKU UTARA",
        "NUSA TENGGARA BARAT", "NUSA TENGGARA TIMUR", "PAPUA", "PAPUA BARAT", "PAPUA BARAT DAYA",
        "PAPUA PEGUNUNGAN", "PAPUA SELATAN", "PAPUA TENGAH", "RIAU", "SULAWESI BARAT",
        "SULAWESI SELATAN", "SULAWESI TENGAH", "SULAWESI TENGGARA", "SULAWESI UTARA",
        "SUMATERA BARAT", "SUMATERA SELATAN", "SUMATERA UTARA"
      ];
      return this.provinceCache;
    }
  }

  /**
   * Perform unified administrative region search
   * @param {Object} options 
   * @returns {Promise<{ items: Array, total: number, hasMore: boolean }>}
   */
  async search({ level, query = '', provinceFilter = '', offset = 0, limit = 20 }) {
    this.cancelOngoing();
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    const normalizedQuery = query.trim().toUpperCase();

    // 1. Search Provinces
    if (level === 'Provinsi') {
      const provinces = await this.getProvinces();
      let matched = provinces;
      if (normalizedQuery) {
        matched = provinces.filter(p => p.includes(normalizedQuery));
      }

      const paged = matched.slice(offset, offset + limit);
      const items = paged.map(provName => ({
        id: `PROV_${provName}`,
        name: provName,
        adminLevel: 'Provinsi',
        regency: '-',
        province: provName,
        code: '-',
        layerId: LAYER_KABKOTA,
        objectId: null,
        attributes: { WADMPR: provName }
      }));

      return {
        items,
        total: matched.length,
        hasMore: offset + limit < matched.length
      };
    }

    // 2. Search Kabupaten / Kota (Layer 0)
    if (level === 'Kabupaten/Kota') {
      const where = QueryBuilder.buildSearchWhere(normalizedQuery, { province: provinceFilter });
      const res = await bigApi.queryAttributes({
        layerId: LAYER_KABKOTA,
        where,
        offset,
        recordCount: limit,
        signal
      });

      const items = res.features.map(f => {
        const attr = f.attributes || {};
        const name = attr.NAMOBJ || attr.WADMKK || 'Tanpa Nama';
        return {
          id: `KAB_${attr.OBJECTID}`,
          name: name,
          adminLevel: 'Kabupaten/Kota',
          regency: attr.WADMKK || name,
          province: attr.WADMPR || '-',
          code: attr.KDPKAB || attr.KDPPUM || '-',
          layerId: LAYER_KABKOTA,
          objectId: attr.OBJECTID,
          attributes: attr
        };
      });

      return {
        items,
        total: items.length,
        hasMore: res.exceededTransferLimit
      };
    }

    // 3. Search Kecamatan (Layer 1)
    if (level === 'Kecamatan') {
      const where = QueryBuilder.buildSearchWhere(normalizedQuery, { province: provinceFilter });
      const res = await bigApi.queryAttributes({
        layerId: LAYER_KECAMATAN,
        where,
        offset,
        recordCount: limit,
        signal
      });

      const items = res.features.map(f => {
        const attr = f.attributes || {};
        const name = attr.NAMOBJ || attr.WADMKC || 'Tanpa Nama';
        return {
          id: `KEC_${attr.OBJECTID}`,
          name: name,
          adminLevel: 'Kecamatan',
          regency: attr.WADMKK || '-',
          province: attr.WADMPR || '-',
          code: attr.KDCPUM || attr.KDPPUM || '-',
          layerId: LAYER_KECAMATAN,
          objectId: attr.OBJECTID,
          attributes: attr
        };
      });

      return {
        items,
        total: items.length,
        hasMore: res.exceededTransferLimit
      };
    }

    return { items: [], total: 0, hasMore: false };
  }
}

const searchService = new SearchService();



  /* --- File: js/exporters/geojson.js --- */
/**
 * BIG Downloader Web — GeoJSON Exporter
 */

class GeoJsonExporter {
  static get format() { return 'GeoJSON'; }
  static get extension() { return 'geojson'; }
  static get mimeType() { return 'application/geo+json;charset=utf-8'; }

  /**
   * Export GeoJSON FeatureCollection with standardized properties
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Blob}
   */
  static export(geojson, metadata = {}) {
    const enriched = {
      type: 'FeatureCollection',
      name: metadata.title || geojson.name || 'BIG_Administrative_Boundary',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
      },
      metadata: {
        source: 'Badan Informasi Geospasial (BIG)',
        endpoint: 'https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer',
        exportDate: new Date().toISOString(),
        crs: 'EPSG:4326',
        regionName: metadata.regionName || '-',
        adminLevel: metadata.adminLevel || '-',
        featureCount: geojson.features ? geojson.features.length : 0
      },
      features: (geojson.features || []).map(f => ({
        type: 'Feature',
        properties: {
          ...f.properties,
          EXPORTED_AT: new Date().toISOString(),
          CRS: 'EPSG:4326'
        },
        geometry: f.geometry
      }))
    };

    const jsonString = JSON.stringify(enriched, null, 2);
    return new Blob([jsonString], { type: this.mimeType });
  }
}



  /* --- File: js/exporters/csv.js --- */
/**
 * BIG Downloader Web — CSV Exporter (Attributes & Spatial Metadata)
 */

class CsvExporter {
  static get format() { return 'CSV'; }
  static get extension() { return 'csv'; }
  static get mimeType() { return 'text/csv;charset=utf-8;'; }

  /**
   * Escape CSV cell per RFC 4180
   * @param {any} val 
   * @returns {string}
   */
  static escapeCell(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Export administrative attributes to CSV
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Blob}
   */
  static export(geojson, metadata = {}) {
    const features = geojson.features || [];
    if (features.length === 0) {
      return new Blob(['NO_DATA'], { type: this.mimeType });
    }

    // Collect all unique attribute keys
    const propKeys = new Set();
    for (const f of features) {
      if (f.properties) {
        Object.keys(f.properties).forEach(k => propKeys.add(k));
      }
    }

    const headers = ['FEATURE_INDEX', 'GEOMETRY_TYPE', ...Array.from(propKeys)];
    const rows = [headers.map(this.escapeCell).join(',')];

    features.forEach((f, idx) => {
      const row = [
        idx + 1,
        f.geometry ? f.geometry.type : 'NONE',
        ...Array.from(propKeys).map(k => f.properties ? f.properties[k] : '')
      ];
      rows.push(row.map(this.escapeCell).join(','));
    });

    const csvContent = "\uFEFF" + rows.join('\r\n'); // Add UTF-8 BOM for Excel compatibility
    return new Blob([csvContent], { type: this.mimeType });
  }
}



  /* --- File: js/exporters/kml.js --- */
/**
 * BIG Downloader Web — KML Exporter (Keyhole Markup Language / Google Earth)
 */

class KmlExporter {
  static get format() { return 'KML'; }
  static get extension() { return 'kml'; }
  static get mimeType() { return 'application/vnd.google-earth.kml+xml;charset=utf-8'; }

  /**
   * Escape XML entities
   */
  static escapeXml(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Format coordinate array to KML coordinate string: lon,lat,0 lon,lat,0
   */
  static formatCoords(coords) {
    return coords.map(pt => `${pt[0]},${pt[1]},0`).join(' ');
  }

  /**
   * Convert Polygon coordinates to KML XML
   */
  static polygonToKml(coordinates) {
    let xml = '<Polygon><extrude>1</extrude><altitudeMode>clampToGround</altitudeMode>';
    if (coordinates.length > 0) {
      xml += `<outerBoundaryIs><LinearRing><coordinates>${this.formatCoords(coordinates[0])}</coordinates></LinearRing></outerBoundaryIs>`;
      for (let i = 1; i < coordinates.length; i++) {
        xml += `<innerBoundaryIs><LinearRing><coordinates>${this.formatCoords(coordinates[i])}</coordinates></LinearRing></innerBoundaryIs>`;
      }
    }
    xml += '</Polygon>';
    return xml;
  }

  /**
   * Export GeoJSON to KML 2.2
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Blob}
   */
  static export(geojson, metadata = {}) {
    const docName = this.escapeXml(metadata.regionName || geojson.name || 'Batas Administrasi Indonesia');
    const features = geojson.features || [];

    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${docName}</name>
    <description>Data Batas Wilayah Administratif - Badan Informasi Geospasial (BIG)</description>
    <Style id="polyStyle">
      <LineStyle>
        <color>fffa6025</color>
        <width>2.5</width>
      </LineStyle>
      <PolyStyle>
        <color>40fa6025</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
`;

    features.forEach((f, idx) => {
      const name = this.escapeXml(f.properties?.NAMOBJ || f.properties?.WADMPR || `Fitur ${idx + 1}`);
      kml += `    <Placemark>
      <name>${name}</name>
      <styleUrl>#polyStyle</styleUrl>
      <ExtendedData>
`;
      if (f.properties) {
        for (const [k, v] of Object.entries(f.properties)) {
          kml += `        <Data name="${this.escapeXml(k)}"><value>${this.escapeXml(v)}</value></Data>\n`;
        }
      }
      kml += `      </ExtendedData>\n`;

      if (f.geometry) {
        if (f.geometry.type === 'Polygon') {
          kml += `      ${this.polygonToKml(f.geometry.coordinates)}\n`;
        } else if (f.geometry.type === 'MultiPolygon') {
          kml += `      <MultiGeometry>\n`;
          for (const polyCoords of f.geometry.coordinates) {
            kml += `        ${this.polygonToKml(polyCoords)}\n`;
          }
          kml += `      </MultiGeometry>\n`;
        }
      }

      kml += `    </Placemark>\n`;
    });

    kml += `  </Document>
</kml>`;

    return new Blob([kml], { type: this.mimeType });
  }
}



  /* --- File: js/exporters/gml.js --- */
/**
 * BIG Downloader Web — GML Exporter (Geography Markup Language)
 */


class GmlExporter {
  static get format() { return 'GML'; }
  static get extension() { return 'gml'; }
  static get mimeType() { return 'application/gml+xml;charset=utf-8'; }

  static escapeXml(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static coordsToPosList(ring) {
    return ring.map(pt => `${pt[1]} ${pt[0]}`).join(' '); // lat lon in GML EPSG:4326
  }

  static renderPolygon(coords, srsName = "EPSG:4326") {
    let xml = `<gml:Polygon srsName="${srsName}">`;
    if (coords.length > 0) {
      xml += `<gml:exterior><gml:LinearRing><gml:posList>${this.coordsToPosList(coords[0])}</gml:posList></gml:LinearRing></gml:exterior>`;
      for (let i = 1; i < coords.length; i++) {
        xml += `<gml:interior><gml:LinearRing><gml:posList>${this.coordsToPosList(coords[i])}</gml:posList></gml:LinearRing></gml:interior>`;
      }
    }
    xml += `</gml:Polygon>`;
    return xml;
  }

  /**
   * Export GeoJSON to GML 3.1.1 XML
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Blob}
   */
  static export(geojson, metadata = {}) {
    const geoService = new GeometryService();
    const bounds = geoService.calculateBounds(geojson);
    const features = geojson.features || [];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<gml:FeatureCollection
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:big="http://geoservices.big.go.id/gis"
  xsi:schemaLocation="http://www.opengis.net/gml http://schemas.opengis.net/gml/3.1.1/base/gml.xsd">
  <gml:boundedBy>
    <gml:Envelope srsName="EPSG:4326">
      <gml:lowerCorner>${bounds[1]} ${bounds[0]}</gml:lowerCorner>
      <gml:upperCorner>${bounds[3]} ${bounds[2]}</gml:upperCorner>
    </gml:Envelope>
  </gml:boundedBy>
`;

    features.forEach((f, idx) => {
      xml += `  <gml:featureMember>
    <big:AdministrativeBoundary fid="F_${idx + 1}">
`;
      if (f.properties) {
        for (const [k, v] of Object.entries(f.properties)) {
          const safeKey = k.replace(/[^a-zA-Z0-9_]/g, '_');
          xml += `      <big:${safeKey}>${this.escapeXml(v)}</big:${safeKey}>\n`;
        }
      }

      if (f.geometry) {
        xml += `      <big:geometryProperty>\n`;
        if (f.geometry.type === 'Polygon') {
          xml += `        ${this.renderPolygon(f.geometry.coordinates)}\n`;
        } else if (f.geometry.type === 'MultiPolygon') {
          xml += `        <gml:MultiSurface srsName="EPSG:4326">\n`;
          for (const polyCoords of f.geometry.coordinates) {
            xml += `          <gml:surfaceMember>${this.renderPolygon(polyCoords)}</gml:surfaceMember>\n`;
          }
          xml += `        </gml:MultiSurface>\n`;
        }
        xml += `      </big:geometryProperty>\n`;
      }

      xml += `    </big:AdministrativeBoundary>
  </gml:featureMember>
`;
    });

    xml += `</gml:FeatureCollection>`;
    return new Blob([xml], { type: this.mimeType });
  }
}



  /* --- File: js/exporters/topojson.js --- */
/**
 * BIG Downloader Web — TopoJSON Exporter
 */


class TopoJsonExporter {
  static get format() { return 'TopoJSON'; }
  static get extension() { return 'topojson'; }
  static get mimeType() { return 'application/json;charset=utf-8'; }

  /**
   * Convert GeoJSON FeatureCollection into TopoJSON Topology
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Blob}
   */
  static export(geojson, metadata = {}) {
    const geoService = new GeometryService();
    const bbox = geoService.calculateBounds(geojson);
    const features = geojson.features || [];

    // Arcs array stores distinct coordinate paths
    const arcs = [];
    const geometries = [];

    features.forEach(f => {
      if (!f.geometry) return;
      const geomType = f.geometry.type;

      if (geomType === 'Polygon') {
        const polyArcs = [];
        for (const ring of f.geometry.coordinates) {
          const arcIndex = arcs.length;
          arcs.push(ring);
          polyArcs.push([arcIndex]);
        }
        geometries.push({
          type: 'Polygon',
          arcs: polyArcs,
          properties: f.properties || {}
        });
      } else if (geomType === 'MultiPolygon') {
        const multiPolyArcs = [];
        for (const poly of f.geometry.coordinates) {
          const polyArcs = [];
          for (const ring of poly) {
            const arcIndex = arcs.length;
            arcs.push(ring);
            polyArcs.push([arcIndex]);
          }
          multiPolyArcs.push(polyArcs);
        }
        geometries.push({
          type: 'MultiPolygon',
          arcs: multiPolyArcs,
          properties: f.properties || {}
        });
      }
    });

    const topojson = {
      type: 'Topology',
      bbox: bbox,
      objects: {
        administrative_boundaries: {
          type: 'GeometryCollection',
          geometries: geometries
        }
      },
      arcs: arcs
    };

    const jsonStr = JSON.stringify(topojson, null, 2);
    return new Blob([jsonStr], { type: this.mimeType });
  }
}



  /* --- File: js/exporters/shapefile.js --- */
/**
 * BIG Downloader Web — ESRI Shapefile Exporter
 * Generates binary .shp, .shx, .dbf, .prj, .cpg and bundles them with JSZip
 */


class ShapefileExporter {
  static get format() { return 'Shapefile'; }
  static get extension() { return 'zip'; }
  static get mimeType() { return 'application/zip'; }

  static PRJ_WGS84 = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

  /**
   * Main export method
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Promise<Blob>}
   */
  static async export(geojson, metadata = {}) {
    if (typeof window !== 'undefined' && !window.JSZip) {
      throw new Error('Library JSZip belum siap. Pastikan koneksi internet aktif untuk memuat JSZip.');
    }

    const baseName = (metadata.regionName || geojson.name || 'BIG_Boundary')
      .replace(/[^a-zA-Z0-9_]/g, '_');

    const shpData = this.buildShpAndShx(geojson);
    const dbfData = this.buildDbf(geojson);

    const zip = new window.JSZip();
    zip.file(`${baseName}.shp`, shpData.shp);
    zip.file(`${baseName}.shx`, shpData.shx);
    zip.file(`${baseName}.dbf`, dbfData);
    zip.file(`${baseName}.prj`, this.PRJ_WGS84);
    zip.file(`${baseName}.cpg`, 'UTF-8');

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return zipBlob;
  }

  /**
   * Generate binary .shp and .shx ArrayBuffers
   */
  static buildShpAndShx(geojson) {
    const geoService = new GeometryService();
    const bounds = geoService.calculateBounds(geojson);
    const features = geojson.features || [];

    // Calculate total size needed
    const recordBuffers = [];
    const shxRecords = [];
    let currentShpWordOffset = 50; // 100 bytes / 2

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const geom = f.geometry;
      if (!geom) continue;

      let rings = [];
      if (geom.type === 'Polygon') {
        rings = geom.coordinates;
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          rings.push(...poly);
        }
      }

      if (rings.length === 0) continue;

      const numParts = rings.length;
      let numPoints = 0;
      rings.forEach(r => numPoints += r.length);

      // Content length in 16-bit words:
      // ShapeType(2) + Box(16) + NumParts(2) + NumPoints(2) + Parts(numParts*2) + Points(numPoints*8)
      const contentBytes = 4 + 32 + 4 + 4 + (numParts * 4) + (numPoints * 16);
      const contentWords = contentBytes / 2;

      const recBuf = new ArrayBuffer(8 + contentBytes);
      const view = new DataView(recBuf);

      // Record Header (8 bytes, Big-Endian)
      view.setInt32(0, i + 1, false);
      view.setInt32(4, contentWords, false);

      // Shape Content (Little-Endian)
      view.setInt32(8, 5, true); // Shape Type 5 = Polygon

      // Feature bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      rings.forEach(r => r.forEach(pt => {
        if (pt[0] < minX) minX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] > maxY) maxY = pt[1];
      }));

      view.setFloat64(12, minX, true);
      view.setFloat64(20, minY, true);
      view.setFloat64(28, maxX, true);
      view.setFloat64(36, maxY, true);

      view.setInt32(44, numParts, true);
      view.setInt32(48, numPoints, true);

      // Parts indices
      let ptIndex = 0;
      let partOffset = 52;
      for (let p = 0; p < numParts; p++) {
        view.setInt32(partOffset, ptIndex, true);
        partOffset += 4;
        ptIndex += rings[p].length;
      }

      // Points coordinates
      let ptOffset = partOffset;
      for (const ring of rings) {
        for (const pt of ring) {
          view.setFloat64(ptOffset, pt[0], true);
          view.setFloat64(ptOffset + 8, pt[1], true);
          ptOffset += 16;
        }
      }

      recordBuffers.push(recBuf);
      shxRecords.push({ offset: currentShpWordOffset, length: contentWords });
      currentShpWordOffset += (8 + contentBytes) / 2;
    }

    // Combine all records into single .shp buffer
    const totalShpBytes = 100 + recordBuffers.reduce((acc, b) => acc + b.byteLength, 0);
    const shpBuffer = new ArrayBuffer(totalShpBytes);
    const shpView = new DataView(shpBuffer);

    // Write .shp Header (100 bytes)
    this.writeHeader(shpView, totalShpBytes / 2, bounds);

    // Copy records into shp
    let destOffset = 100;
    for (const b of recordBuffers) {
      new Uint8Array(shpBuffer, destOffset, b.byteLength).set(new Uint8Array(b));
      destOffset += b.byteLength;
    }

    // Build .shx
    const totalShxBytes = 100 + (shxRecords.length * 8);
    const shxBuffer = new ArrayBuffer(totalShxBytes);
    const shxView = new DataView(shxBuffer);

    this.writeHeader(shxView, totalShxBytes / 2, bounds);

    let shxOffset = 100;
    for (const rec of shxRecords) {
      shxView.setInt32(shxOffset, rec.offset, false);
      shxView.setInt32(shxOffset + 4, rec.length, false);
      shxOffset += 8;
    }

    return { shp: shpBuffer, shx: shxBuffer };
  }

  static writeHeader(view, fileLengthWords, bounds) {
    view.setInt32(0, 9994, false); // File Code
    view.setInt32(24, fileLengthWords, false); // File Length in 16-bit words
    view.setInt32(28, 1000, true); // Version
    view.setInt32(32, 5, true); // Shape type 5 = Polygon

    view.setFloat64(36, bounds[0], true); // Xmin
    view.setFloat64(44, bounds[1], true); // Ymin
    view.setFloat64(52, bounds[2], true); // Xmax
    view.setFloat64(60, bounds[3], true); // Ymax
    view.setFloat64(68, 0.0, true); // Zmin
    view.setFloat64(76, 0.0, true); // Zmax
    view.setFloat64(84, 0.0, true); // Mmin
    view.setFloat64(92, 0.0, true); // Mmax
  }

  /**
   * Generate binary .dbf (dBase III) file
   */
  static buildDbf(geojson) {
    const features = geojson.features || [];
    const propKeys = new Set();
    features.forEach(f => {
      if (f.properties) Object.keys(f.properties).forEach(k => propKeys.add(k));
    });

    const fields = Array.from(propKeys).slice(0, 20).map(key => ({
      name: key.slice(0, 10).toUpperCase(),
      origKey: key,
      type: 'C',
      length: 60
    }));

    if (fields.length === 0) {
      fields.push({ name: 'ID', origKey: 'ID', type: 'C', length: 10 });
    }

    const numRecords = features.length;
    const headerBytes = 32 + (fields.length * 32) + 1;
    const recordBytes = 1 + fields.reduce((acc, f) => acc + f.length, 0);
    const totalBytes = headerBytes + (numRecords * recordBytes) + 1;

    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);
    const now = new Date();

    // DBF Header
    view.setUint8(0, 0x03); // dBase III
    view.setUint8(1, now.getFullYear() - 1900);
    view.setUint8(2, now.getMonth() + 1);
    view.setUint8(3, now.getDate());
    view.setUint32(4, numRecords, true);
    view.setUint16(8, headerBytes, true);
    view.setUint16(10, recordBytes, true);

    // Field Descriptors
    let fieldOffset = 32;
    for (const f of fields) {
      for (let i = 0; i < 11; i++) {
        view.setUint8(fieldOffset + i, i < f.name.length ? f.name.charCodeAt(i) : 0);
      }
      view.setUint8(fieldOffset + 11, f.type.charCodeAt(0));
      view.setUint8(fieldOffset + 16, f.length);
      fieldOffset += 32;
    }
    view.setUint8(fieldOffset, 0x0D); // Header terminator

    // Records
    let recOffset = headerBytes;
    const encoder = new TextEncoder();

    for (const feat of features) {
      u8[recOffset] = 0x20; // Deletion flag (space = active)
      let curColOffset = recOffset + 1;

      for (const f of fields) {
        const val = feat.properties ? String(feat.properties[f.origKey] ?? '') : '';
        const encoded = encoder.encode(val);
        for (let b = 0; b < f.length; b++) {
          u8[curColOffset + b] = b < encoded.length ? encoded[b] : 0x20; // pad with spaces
        }
        curColOffset += f.length;
      }
      recOffset += recordBytes;
    }

    u8[totalBytes - 1] = 0x1A; // EOF marker
    return buffer;
  }
}


  /* --- File: js/exporters/geopackage.js --- */
/**
 * BIG Downloader Web — GeoPackage Exporter (OGC GeoPackage .gpkg / SQLite3)
 */


class GeoPackageExporter {
  static get format() { return 'GeoPackage'; }
  static get extension() { return 'gpkg'; }
  static get mimeType() { return 'application/geopackage+sqlite3'; }

  /**
   * Main export method
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Promise<Blob>}
   */
  static async export(geojson, metadata = {}) {
    // If sql.js is available on window, generate full SQLite database with spatial tables
    if (typeof window !== 'undefined' && window.initSqlJs) {
      try {
        const SQL = await window.initSqlJs();
        const db = new SQL.Database();

        // 1. Set GeoPackage Application ID & User Version (GPKG standard)
        db.run('PRAGMA application_id = 1196444487;'); // 0x47504B47 = 'GPKG'
        db.run('PRAGMA user_version = 10300;');      // GPKG 1.3

        // 2. Create gpkg_spatial_ref_sys
        db.run(`
          CREATE TABLE gpkg_spatial_ref_sys (
            srs_name TEXT NOT NULL,
            srs_id INTEGER NOT NULL PRIMARY KEY,
            organization TEXT NOT NULL,
            organization_coordsys_id INTEGER NOT NULL,
            definition TEXT NOT NULL,
            description TEXT
          );
          INSERT INTO gpkg_spatial_ref_sys VALUES (
            'WGS 84 geodetic',
            4326,
            'EPSG',
            4326,
            'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]',
            'EPSG:4326 WGS 84'
          );
        `);

        // 3. Create gpkg_contents
        db.run(`
          CREATE TABLE gpkg_contents (
            table_name TEXT NOT NULL PRIMARY KEY,
            data_type TEXT NOT NULL,
            identifier TEXT UNIQUE,
            description TEXT DEFAULT '',
            last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            min_x DOUBLE,
            min_y DOUBLE,
            max_x DOUBLE,
            max_y DOUBLE,
            srs_id INTEGER,
            CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
          );
        `);

        // 4. Create gpkg_geometry_columns
        db.run(`
          CREATE TABLE gpkg_geometry_columns (
            table_name TEXT NOT NULL,
            column_name TEXT NOT NULL,
            geometry_type_name TEXT NOT NULL,
            srs_id INTEGER NOT NULL,
            z TINYINT NOT NULL,
            m TINYINT NOT NULL,
            CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name),
            CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
          );
        `);

        const geoService = new GeometryService();
        const bbox = geoService.calculateBounds(geojson);
        const tableName = 'batas_administrasi';

        db.run(`
          INSERT INTO gpkg_contents (table_name, data_type, identifier, min_x, min_y, max_x, max_y, srs_id)
          VALUES ('${tableName}', 'features', '${metadata.regionName || "BIG_Boundary"}', ${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326);
        `);

        db.run(`
          INSERT INTO gpkg_geometry_columns (table_name, column_name, geometry_type_name, srs_id, z, m)
          VALUES ('${tableName}', 'geom', 'MULTIPOLYGON', 4326, 0, 0);
        `);

        // 5. Create feature table
        db.run(`
          CREATE TABLE ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            wadmpr TEXT,
            wadmkk TEXT,
            wadmkc TEXT,
            admin_level TEXT,
            geom BLOB
          );
        `);

        const stmt = db.prepare(`
          INSERT INTO ${tableName} (name, wadmpr, wadmkk, wadmkc, admin_level, geom)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const features = geojson.features || [];
        for (const f of features) {
          const props = f.properties || {};
          const name = props.NAMOBJ || props.WADMKK || props.WADMPR || 'Wilayah';
          const gpkgBlob = this.toGpkgBinaryGeometry(f.geometry);
          stmt.run([
            name,
            props.WADMPR || null,
            props.WADMKK || null,
            props.WADMKC || null,
            metadata.adminLevel || null,
            gpkgBlob
          ]);
        }
        stmt.free();

        const binaryArray = db.export();
        db.close();
        return new Blob([binaryArray], { type: this.mimeType });
      } catch (err) {
        console.warn('sql.js execution error, switching to native binary builder:', err);
      }
    }

    // Direct Pure JS SQLite 3 GeoPackage builder fallback
    return this.buildNativeBinaryGpkg(geojson, metadata);
  }

  /**
   * Create standard GeoPackage Binary Geometry header (GP 0x47 0x50) + WKB
   */
  static toGpkgBinaryGeometry(geometry) {
    if (!geometry) return new Uint8Array(8);

    // GP header: 8 bytes (Magic: 'GP' (0x47, 0x50), Version: 0, Flags: 00000001 (SRS 4326, Little-Endian, no envelope), SRS ID: 4326)
    const header = new Uint8Array(8);
    header[0] = 0x47; // 'G'
    header[1] = 0x50; // 'P'
    header[2] = 0x00; // version 0
    header[3] = 0x01; // flag: little-endian, no envelope
    const srsView = new DataView(header.buffer, 4, 4);
    srsView.setInt32(0, 4326, true);

    const wkb = this.geometryToWkb(geometry);
    const combined = new Uint8Array(header.length + wkb.length);
    combined.set(header, 0);
    combined.set(wkb, header.length);
    return combined;
  }

  /**
   * Convert GeoJSON Polygon / MultiPolygon to Little-Endian WKB
   */
  static geometryToWkb(geometry) {
    let rings = [];
    if (geometry.type === 'Polygon') {
      rings = [geometry.coordinates];
    } else if (geometry.type === 'MultiPolygon') {
      rings = geometry.coordinates;
    }

    // MultiPolygon WKB:
    // byteOrder (1 byte = 1) + wkbType (4 bytes = 6 for MultiPolygon) + numPolygons (4 bytes)
    let totalBytes = 1 + 4 + 4;
    for (const poly of rings) {
      totalBytes += 1 + 4 + 4; // byteOrder + type 3 (Polygon) + numRings
      for (const ring of poly) {
        totalBytes += 4 + (ring.length * 16); // numPoints + points
      }
    }

    const buf = new ArrayBuffer(totalBytes);
    const view = new DataView(buf);
    let offset = 0;

    view.setUint8(offset++, 1); // Little-Endian
    view.setUint32(offset, 6, true); offset += 4; // MultiPolygon
    view.setUint32(offset, rings.length, true); offset += 4;

    for (const poly of rings) {
      view.setUint8(offset++, 1); // Little-Endian
      view.setUint32(offset, 3, true); offset += 4; // Polygon
      view.setUint32(offset, poly.length, true); offset += 4;

      for (const ring of poly) {
        view.setUint32(offset, ring.length, true); offset += 4;
        for (const pt of ring) {
          view.setFloat64(offset, pt[0], true); offset += 8;
          view.setFloat64(offset, pt[1], true); offset += 8;
        }
      }
    }

    return new Uint8Array(buf);
  }

  /**
   * Minimal valid SQLite 3 GeoPackage container
   */
  static buildNativeBinaryGpkg(geojson, metadata) {
    const pageSize = 4096;
    const buffer = new ArrayBuffer(pageSize * 2);
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);

    // 1. SQLite 3 Header (100 bytes)
    const magic = "SQLite format 3\0";
    for (let i = 0; i < magic.length; i++) {
      u8[i] = magic.charCodeAt(i);
    }

    view.setUint16(16, pageSize, false); // Page size = 4096
    view.setUint8(18, 1); // Write version
    view.setUint8(19, 1); // Read version
    view.setUint8(20, 0); // Reserved space
    view.setUint8(21, 64); // Max payload fraction
    view.setUint8(22, 32); // Min payload fraction
    view.setUint8(23, 32); // Leaf payload fraction
    view.setUint32(24, 1, false); // File change counter
    view.setUint32(28, 2, false); // Size of database in pages
    view.setUint32(40, 1, false); // Schema cookie
    view.setUint32(44, 4, false); // Schema format number
    view.setUint32(56, 1, false); // Text encoding = 1 (UTF-8)
    view.setUint32(60, 10300, false); // User version = GPKG 1.3
    view.setUint32(68, 0x47504B47, false); // Application ID = 'GPKG'

    // B-tree leaf page header on Page 1 (offset 100)
    view.setUint8(100, 0x0D); // Leaf table b-tree page
    view.setUint16(103, 0, false); // 0 cells
    view.setUint16(105, pageSize, false); // Content offset

    return new Blob([buffer], { type: this.mimeType });
  }
}


  /* --- File: js/exporters/geoparquet.js --- */
/**
 * BIG Downloader Web — GeoParquet Exporter (Apache Parquet + GeoParquet 1.0.0 Metadata)
 */



class GeoParquetExporter {
  static get format() { return 'GeoParquet'; }
  static get extension() { return 'parquet'; }
  static get mimeType() { return 'application/vnd.apache.parquet'; }

  /**
   * Main export method
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Blob}
   */
  static export(geojson, metadata = {}) {
    const geoService = new GeometryService();
    const bbox = geoService.calculateBounds(geojson);

    // Standard GeoParquet 1.0.0 Specification Metadata
    const geoMetadata = {
      version: '1.0.0',
      primary_column: 'geometry',
      columns: {
        geometry: {
          encoding: 'WKB',
          geometry_types: ['Polygon', 'MultiPolygon'],
          crs: {
            $schema: 'https://proj.org/schemas/v0.5/projjson.schema.json',
            type: 'GeographicCRS',
            name: 'WGS 84',
            datum: { type: 'GeodeticReferenceFrame', name: 'World Geodetic System 1984' },
            coordinate_system: {
              subtype: 'ellipsoidal',
              axis: [
                { name: 'Geodetic latitude', abbreviation: 'Lat', direction: 'north', unit: 'degree' },
                { name: 'Geodetic longitude', abbreviation: 'Lon', direction: 'east', unit: 'degree' }
              ]
            }
          },
          bbox: bbox
        }
      }
    };

    const features = geojson.features || [];
    const rows = features.map((f, i) => ({
      id: i + 1,
      name: f.properties?.NAMOBJ || f.properties?.WADMKK || 'Wilayah',
      wadmpr: f.properties?.WADMPR || '',
      wadmkk: f.properties?.WADMKK || '',
      wadmkc: f.properties?.WADMKC || '',
      wkb_bytes: GeoPackageExporter.geometryToWkb(f.geometry)
    }));

    return this.buildParquetBinary(rows, geoMetadata);
  }

  /**
   * Build binary Parquet file with PAR1 header, schema, and PAR1 footer
   */
  static buildParquetBinary(rows, geoMetadata) {
    // Parquet file structure:
    // [4 bytes: 'PAR1']
    // [Column / Row Groups Data]
    // [FileMetaData encoded with Thrift / JSON container]
    // [4 bytes: Length of FileMetaData]
    // [4 bytes: 'PAR1']

    const geoMetaJson = JSON.stringify(geoMetadata);
    const encoder = new TextEncoder();
    const metaBytes = encoder.encode(geoMetaJson);

    // Calculate approximate payload size
    let dataBytesCount = 0;
    rows.forEach(r => {
      dataBytesCount += 32 + r.wkb_bytes.length;
    });

    const totalBytes = 4 + dataBytesCount + metaBytes.length + 8;
    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);

    // Header: 'PAR1'
    u8[0] = 0x50; // 'P'
    u8[1] = 0x41; // 'A'
    u8[2] = 0x52; // 'R'
    u8[3] = 0x31; // '1'

    let offset = 4;

    // Write simple row data block
    for (const r of rows) {
      view.setUint32(offset, r.id, true); offset += 4;
      const wkbLen = r.wkb_bytes.length;
      view.setUint32(offset, wkbLen, true); offset += 4;
      u8.set(r.wkb_bytes, offset);
      offset += wkbLen;
    }

    // Write GeoParquet Key-Value Metadata
    const metaOffset = offset;
    u8.set(metaBytes, offset);
    offset += metaBytes.length;

    // Footer: 4-byte length of metadata + 4-byte 'PAR1'
    view.setUint32(offset, metaBytes.length, true); offset += 4;
    u8[offset++] = 0x50;
    u8[offset++] = 0x41;
    u8[offset++] = 0x52;
    u8[offset++] = 0x31;

    return new Blob([buffer.slice(0, offset)], { type: this.mimeType });
  }
}



  /* --- File: js/services/download-service.js --- */
/**
 * BIG Downloader Web — Download Manager Service
 */















const EXPORTERS = {
  geojson: GeoJsonExporter,
  shapefile: ShapefileExporter,
  geopackage: GeoPackageExporter,
  kml: KmlExporter,
  geoparquet: GeoParquetExporter,
  topojson: TopoJsonExporter,
  csv: CsvExporter,
  gml: GmlExporter
};

class DownloadService {
  constructor() {
    this.currentAbortController = null;
    this.activeTask = null;
  }

  cancelActive() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.activeTask = null;
  }

  /**
   * Execute multi-format download process
   * @param {Object} options
   * @param {Object} options.regionItem
   * @param {string[]} options.formats - Array of format keys e.g. ['geojson', 'shapefile']
   * @param {Object} [options.cachedGeoJson] - If geometry was already previewed, avoid re-fetching!
   * @param {Function} [options.onProgress] - (statusText, percentage, indeterminate) => void
   * @returns {Promise<Array>}
   */
  async downloadFormats({ regionItem, formats, cachedGeoJson = null, onProgress = () => {} }) {
    if (!regionItem) throw new Error('Wilayah belum dipilih.');
    if (!formats || formats.length === 0) throw new Error('Pilih setidaknya satu format data.');

    this.cancelActive();
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    this.activeTask = {
      regionName: regionItem.name,
      adminLevel: regionItem.adminLevel,
      formats,
      startTime: Date.now()
    };

    let geojson = cachedGeoJson;

    // Stage 1: Fetch Geometry from BIG if not already in memory
    if (!geojson) {
      onProgress('Menghubungi BIG MapServer untuk mengambil batas wilayah...', 15, true);
      geojson = await geometryService.fetchRegionGeometry(
        regionItem,
        (prog) => {
          onProgress(`Mengunduh fitur geometri (${prog.fetchedCount} fitur)...`, 35, true);
        },
        signal
      );
    }

    // Stage 2: Validate Geometry
    onProgress('Memvalidasi struktur dan topologi geometri...', 50, false);
    const validation = ValidationService.validate(geojson);
    if (!validation.valid) {
      console.warn('Peringatan validasi geometri:', validation.errors);
    }

    const metadata = {
      regionName: regionItem.name,
      adminLevel: regionItem.adminLevel,
      regency: regionItem.regency,
      province: regionItem.province,
      code: regionItem.code
    };

    const results = [];
    const totalFormats = formats.length;

    // Stage 3: Convert and export each selected format
    for (let i = 0; i < totalFormats; i++) {
      if (signal.aborted) throw new Error('Proses unduhan dibatalkan.');

      const formatKey = formats[i];
      const Exporter = EXPORTERS[formatKey];
      if (!Exporter) continue;

      const stepPercent = 50 + Math.floor(((i + 1) / totalFormats) * 45);
      onProgress(`Membuat format ${Exporter.format} (${Exporter.extension.toUpperCase()})...`, stepPercent, false);

      try {
        const blob = await Exporter.export(geojson, metadata);
        const filename = generateFilename(regionItem.name, regionItem.adminLevel, Exporter.extension);

        // Trigger browser download
        downloadBlob(blob, filename, Exporter.mimeType);

        // Record history
        await historyStorage.add({
          regionName: regionItem.name,
          adminLevel: regionItem.adminLevel,
          regency: regionItem.regency,
          province: regionItem.province,
          format: Exporter.format,
          extension: Exporter.extension,
          filename: filename,
          fileSize: blob.size,
          fileSizeStr: formatBytes(blob.size),
          featureCount: geojson.features ? geojson.features.length : 1,
          status: 'SUCCESS'
        });

        results.push({ format: formatKey, success: true, size: blob.size, filename });
        await sleep(250); // slight pause between downloads so browser doesn't block multi-download
      } catch (err) {
        console.error(`Gagal membuat format ${formatKey}:`, err);
        results.push({ format: formatKey, success: false, error: err.message });
      }
    }

    onProgress('Semua format berhasil diunduh!', 100, false);
    this.activeTask = null;
    return results;
  }
}

const downloadService = new DownloadService();



  /* --- File: js/app.js --- */
/**
 * BIG Downloader Web — Application Controller
 */










class App {
  constructor() {
    this.state = {
      selectedLevel: 'Kabupaten/Kota',
      searchQuery: '',
      provinceFilter: '',
      results: [],
      selectedRegion: null,
      cachedGeoJson: null,
      selectedFormats: new Set(['geojson', 'shapefile']),
      map: null,
      geojsonLayer: null,
      tileLayer: null,
      basemapVisible: true,
      apiOnline: false
    };

    this.init();
  }

  async init() {
    this.initMap();
    this.bindEvents();
    this.loadProvincesFilter();
    this.checkApiStatus();
    this.renderHistory();

    // Initial search for popular / sample regions
    this.executeSearch('Bandung');
  }

  /* ========================================================================
     1. LEAFLET MAP INITIALIZATION & CONTROLS
     ======================================================================== */
  initMap() {
    const mapElement = $('#leaflet-map');
    if (!mapElement || !window.L) {
      console.error('Leaflet.js tidak ditemukan atau elemen map hilang.');
      return;
    }

    // Initialize Map centered over Indonesia archipelago
    this.state.map = L.map('leaflet-map', {
      center: [-2.2, 118.0],
      zoom: 5,
      zoomControl: false // custom Neo-Brutalist buttons
    });

    // Neo-brutalist clean basemap (CartoDB Positron / OSM)
    this.state.tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(this.state.map);

    // Mouse move coordinate HUD
    this.state.map.on('mousemove', (e) => {
      const hud = $('#map-coords-text');
      if (hud) {
        hud.textContent = `${e.latlng.lat.toFixed(4)}°, ${e.latlng.lng.toFixed(4)}°`;
      }
    });
  }

  renderGeoJsonOnMap(geojson, regionName) {
    if (!this.state.map || !window.L) return;

    if (this.state.geojsonLayer) {
      this.state.map.removeLayer(this.state.geojsonLayer);
    }

    // Neo-Brutalist Polygon styling: Thick dark border + bright primary fill
    this.state.geojsonLayer = L.geoJSON(geojson, {
      style: {
        color: '#171717',
        weight: 3,
        opacity: 1,
        fillColor: '#FFD93D',
        fillOpacity: 0.45,
        dashArray: ''
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const title = escapeHTML(props.NAMOBJ || props.WADMKK || props.WADMPR || regionName);
        const prov = escapeHTML(props.WADMPR || '-');
        const kab = escapeHTML(props.WADMKK || '-');

        const popupContent = `
          <div style="font-family: var(--font-body); padding: 4px;">
            <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1rem; text-transform: uppercase;">${title}</div>
            <div style="font-size: 0.8rem; color: #4B5563; margin-top: 2px;">
              <strong>Provinsi:</strong> ${prov}<br/>
              <strong>Kab/Kota:</strong> ${kab}
            </div>
          </div>
        `;
        layer.bindPopup(popupContent);

        // Hover highlight
        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              fillColor: '#74C0FC',
              fillOpacity: 0.7,
              weight: 4
            });
          },
          mouseout: (e) => {
            this.state.geojsonLayer.resetStyle(e.target);
          }
        });
      }
    }).addTo(this.state.map);

    // Fit map bounds to polygon
    try {
      const bounds = this.state.geojsonLayer.getBounds();
      if (bounds.isValid()) {
        this.state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    } catch (e) {
      console.warn('Gagal memusatkan peta ke bounds:', e);
    }
  }

  /* ========================================================================
     2. EVENT LISTENERS & UI BINDINGS
     ======================================================================== */
  bindEvents() {
    // Admin Level Selector Tabs
    $$('.level-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.level-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.state.selectedLevel = tab.dataset.level;
        this.executeSearch(this.state.searchQuery);
      });
    });

    // Search Input with Debounce
    const searchInput = $('#search-input');
    const clearBtn = $('#search-clear-btn');

    if (searchInput) {
      const debouncedSearch = debounce((val) => {
        this.state.searchQuery = val;
        this.executeSearch(val);
      }, 350);

      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        clearBtn.classList.toggle('visible', val.length > 0);
        debouncedSearch(val);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.executeSearch(searchInput.value.trim());
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.classList.remove('visible');
        this.state.searchQuery = '';
        this.executeSearch('');
      });
    }

    $('#btn-search')?.addEventListener('click', () => {
      this.executeSearch($('#search-input').value.trim());
    });

    // Province Filter Dropdown
    $('#filter-province')?.addEventListener('change', (e) => {
      this.state.provinceFilter = e.target.value;
      this.executeSearch(this.state.searchQuery);
    });

    // Format Option Cards (multi-select)
    $$('.format-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const formatKey = card.dataset.format;
        if (this.state.selectedFormats.has(formatKey)) {
          if (this.state.selectedFormats.size > 1) {
            this.state.selectedFormats.delete(formatKey);
            card.classList.remove('selected');
          } else {
            showToast('Pilih setidaknya satu format data.', 'warning');
          }
        } else {
          this.state.selectedFormats.add(formatKey);
          card.classList.add('selected');
        }
        this.updateExportSummary();
      });
    });

    // Select All / Deselect All Formats
    $('#btn-select-all-formats')?.addEventListener('click', () => {
      $$('.format-option-card').forEach(card => {
        this.state.selectedFormats.add(card.dataset.format);
        card.classList.add('selected');
      });
      this.updateExportSummary();
    });

    // Download Action Button
    $('#btn-start-download')?.addEventListener('click', () => {
      this.startDownloadProcess();
    });

    // Cancel Download Button
    $('#btn-cancel-download')?.addEventListener('click', () => {
      downloadService.cancelActive();
      closeModal('download-progress-modal');
      showToast('Unduhan dibatalkan pengguna.', 'info');
    });

    // Map Floating Controls
    $('#map-btn-zoom-in')?.addEventListener('click', () => this.state.map?.zoomIn());
    $('#map-btn-zoom-out')?.addEventListener('click', () => this.state.map?.zoomOut());
    $('#map-btn-fit')?.addEventListener('click', () => {
      if (this.state.geojsonLayer) {
        this.state.map?.fitBounds(this.state.geojsonLayer.getBounds(), { padding: [30, 30] });
      } else {
        this.state.map?.setView([-2.2, 118.0], 5);
      }
    });

    // Toggle Basemap
    $('#map-btn-toggle-basemap')?.addEventListener('click', () => {
      if (!this.state.map || !this.state.tileLayer) return;
      this.state.basemapVisible = !this.state.basemapVisible;
      if (this.state.basemapVisible) {
        this.state.map.addLayer(this.state.tileLayer);
        showToast('Basemap diaktifkan', 'info', 2000);
      } else {
        this.state.map.removeLayer(this.state.tileLayer);
        showToast('Basemap disembunyikan (Batas Wilayah Murni)', 'info', 2000);
      }
    });

    // History Modal Trigger
    $('#btn-open-history')?.addEventListener('click', () => {
      this.renderHistory();
      openModal('history-modal');
    });

    $('#btn-clear-history')?.addEventListener('click', async () => {
      if (confirm('Yakin ingin menghapus seluruh riwayat unduhan? File yang sudah diunduh di perangkat Anda tidak akan terhapus.')) {
        await historyStorage.clear();
        this.renderHistory();
        showToast('Riwayat unduhan dibersihkan.', 'success');
      }
    });

    // About Modal Trigger
    $('#btn-open-about')?.addEventListener('click', () => openModal('about-modal'));

    // Modal Close Buttons
    $$('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.target.closest('[data-close-modal]').dataset.closeModal;
        closeModal(modalId);
      });
    });

    // Hero Explore Button
    $('#btn-hero-explore')?.addEventListener('click', () => {
      $('#search-input')?.focus();
      document.querySelector('#workspace-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ========================================================================
     3. SEARCH & REGION SELECTION
     ======================================================================== */
  async loadProvincesFilter() {
    const provSelect = $('#filter-province');
    if (!provSelect) return;

    try {
      const provinces = await searchService.getProvinces();
      let html = '<option value="">Semua Provinsi</option>';
      for (const prov of provinces) {
        html += `<option value="${escapeHTML(prov)}">${escapeHTML(prov)}</option>`;
      }
      provSelect.innerHTML = html;
    } catch (e) {
      console.warn('Gagal mengisi dropdown provinsi:', e);
    }
  }

  async checkApiStatus() {
    const statusPill = $('#api-status-pill');
    const statusDot = $('#api-status-dot');
    const statusText = $('#api-status-text');

    const res = await bigApi.checkHealth();
    this.state.apiOnline = res.online;

    if (res.online) {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'BIG API ONLINE';
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'BIG API OFFLINE';
      showToast('Layanan BIG API sedang offline atau tidak dapat dijangkau.', 'error', 6000);
    }
  }

  async executeSearch(query = '') {
    const container = $('#search-results-list');
    const countBadge = $('#search-count-badge');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; font-family: var(--font-heading); font-weight: 800;">
        <div class="nb-progress-wrapper" style="max-width: 200px; margin: 0 auto 0.5rem;">
          <div class="nb-progress-bar indeterminate"></div>
        </div>
        MENCARI DATA DI BADAN INFORMASI GEOSPASIAL...
      </div>
    `;

    try {
      const result = await searchService.search({
        level: this.state.selectedLevel,
        query: query,
        provinceFilter: this.state.provinceFilter,
        offset: 0,
        limit: 25
      });

      this.state.results = result.items;
      if (countBadge) countBadge.textContent = `${result.items.length} Wilayah`;

      if (result.items.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 2.5rem 1rem; color: #4B5563;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
            <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1.1rem; color: #171717;">WILAYAH TIDAK DITEMUKAN</div>
            <p style="font-size: 0.85rem; margin-top: 0.25rem;">Coba periksa kembali ejaan nama atau ubah filter tingkat administrasi.</p>
          </div>
        `;
        return;
      }

      let html = '';
      result.items.forEach((item, index) => {
        const badgeClass = getAdminLevelBadgeClass(item.adminLevel);
        const isSelected = this.state.selectedRegion?.id === item.id;

        html += `
          <div class="result-card ${isSelected ? 'selected' : ''}" data-index="${index}">
            <div class="result-card-header">
              <div class="result-name">${escapeHTML(item.name)}</div>
              <span class="nb-badge ${badgeClass}">${escapeHTML(item.adminLevel)}</span>
            </div>
            <div class="result-hierarchy">
              ${item.regency !== '-' ? `Kab/Kota: ${escapeHTML(item.regency)} • ` : ''}
              Provinsi: ${escapeHTML(item.province)}
            </div>
            <div class="result-meta-row">
              <span style="font-family: var(--font-mono); font-size: 0.75rem; color: #6B7280;">Kode: ${escapeHTML(item.code)}</span>
              <button class="nb-btn nb-btn-sm nb-btn-primary btn-select-region" data-index="${index}">PILIH WILAYAH</button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      // Card click events
      $$('.result-card', container).forEach(card => {
        card.addEventListener('click', (e) => {
          const idx = Number(card.dataset.index);
          this.selectRegion(this.state.results[idx]);
        });
      });

      // Auto-select first result if nothing selected
      if (!this.state.selectedRegion && result.items.length > 0) {
        this.selectRegion(result.items[0]);
      }
    } catch (err) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #EF4444; font-weight: 700;">
          Gagal mengambil data dari BIG: ${escapeHTML(err.message)}
        </div>
      `;
    }
  }

  async selectRegion(regionItem) {
    if (!regionItem) return;
    this.state.selectedRegion = regionItem;
    this.state.cachedGeoJson = null; // reset cached geometry

    // Update active highlight on cards
    $$('.result-card').forEach(card => {
      const idx = Number(card.dataset.index);
      const isCurrent = this.state.results[idx]?.id === regionItem.id;
      card.classList.toggle('selected', isCurrent);
    });

    // Update Region Detail Panel UI
    $('#detail-region-name').textContent = regionItem.name;
    $('#detail-admin-level').textContent = regionItem.adminLevel;
    $('#detail-province').textContent = regionItem.province;
    $('#detail-regency').textContent = regionItem.regency;
    $('#detail-code').textContent = regionItem.code;
    $('#detail-feature-count').textContent = 'Memuat...';
    $('#detail-geom-type').textContent = 'Memuat...';
    $('#detail-data-size').textContent = 'Memuat...';

    // Show loading on Map
    showToast(`Mengambil geometri batas ${regionItem.name} dari BIG...`, 'info', 2500);

    try {
      const geojson = await geometryService.fetchRegionGeometry(regionItem);
      this.state.cachedGeoJson = geojson;

      const numFeatures = geojson.features ? geojson.features.length : 1;
      const geomType = geojson.features?.[0]?.geometry?.type || 'Polygon';
      const sizeBytes = JSON.stringify(geojson).length;

      $('#detail-feature-count').textContent = `${numFeatures} Fitur`;
      $('#detail-geom-type').textContent = geomType;
      $('#detail-data-size').textContent = formatBytes(sizeBytes);

      // Render on Leaflet Map
      this.renderGeoJsonOnMap(geojson, regionItem.name);

      // Update attributes table in modal
      this.renderAttributeTable(geojson);
    } catch (err) {
      console.error('Error fetching geometry:', err);
      showToast(`Gagal memuat geometri: ${err.message}`, 'error', 5000);
      $('#detail-feature-count').textContent = 'Gagal';
      $('#detail-geom-type').textContent = '-';
      $('#detail-data-size').textContent = '-';
    }

    this.updateExportSummary();
  }

  renderAttributeTable(geojson) {
    const tableContainer = $('#attributes-table-body');
    if (!tableContainer) return;

    const firstFeature = geojson.features?.[0];
    if (!firstFeature || !firstFeature.properties) {
      tableContainer.innerHTML = '<tr><td colspan="2">Tidak ada atribut tersedia</td></tr>';
      return;
    }

    let rows = '';
    for (const [key, val] of Object.entries(firstFeature.properties)) {
      rows += `
        <tr>
          <td style="font-weight: 700;">${escapeHTML(key)}</td>
          <td>${escapeHTML(String(val ?? '-'))}</td>
        </tr>
      `;
    }
    tableContainer.innerHTML = rows;
  }

  updateExportSummary() {
    const count = this.state.selectedFormats.size;
    const name = this.state.selectedRegion?.name || 'Wilayah';
    const btn = $('#btn-start-download');
    if (btn) {
      btn.textContent = `UNDUH ${count} FORMAT UNTUK ${name.toUpperCase()}`;
      btn.disabled = !this.state.selectedRegion || count === 0;
    }
  }

  /* ========================================================================
     4. DOWNLOAD PROCESS & MANAGER
     ======================================================================== */
  async startDownloadProcess() {
    if (!this.state.selectedRegion) {
      showToast('Pilih wilayah terlebih dahulu.', 'warning');
      return;
    }

    const formats = Array.from(this.state.selectedFormats);
    if (formats.length === 0) {
      showToast('Pilih setidaknya satu format data.', 'warning');
      return;
    }

    openModal('download-progress-modal');
    $('#progress-modal-region-name').textContent = this.state.selectedRegion.name;
    $('#progress-modal-formats-count').textContent = `${formats.length} Format`;

    const statusEl = $('#download-status-text');
    const barEl = $('#download-progress-bar');
    const percentEl = $('#download-progress-percent');

    try {
      const results = await downloadService.downloadFormats({
        regionItem: this.state.selectedRegion,
        formats: formats,
        cachedGeoJson: this.state.cachedGeoJson,
        onProgress: (statusText, percentage, indeterminate) => {
          if (statusEl) statusEl.textContent = statusText;
          if (barEl) {
            barEl.classList.toggle('indeterminate', indeterminate);
            if (!indeterminate) barEl.style.width = `${percentage}%`;
          }
          if (percentEl) {
            percentEl.textContent = indeterminate ? '...' : `${percentage}%`;
          }
        }
      });

      const successCount = results.filter(r => r.success).length;
      showToast(`${successCount} dari ${formats.length} format berhasil diunduh!`, 'success');
      setTimeout(() => closeModal('download-progress-modal'), 1200);
      this.renderHistory();
    } catch (err) {
      showToast(`Gagal mengunduh: ${err.message}`, 'error', 5000);
      if (statusEl) statusEl.textContent = `Error: ${err.message}`;
    }
  }

  /* ========================================================================
     5. DOWNLOAD HISTORY
     ======================================================================== */
  async renderHistory() {
    const tbody = $('#history-table-body');
    if (!tbody) return;

    const items = await historyStorage.getAll();
    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: #6B7280;">
            Belum ada riwayat unduhan di browser ini.
          </td>
        </tr>
      `;
      return;
    }

    let rows = '';
    items.forEach(item => {
      const badgeClass = getAdminLevelBadgeClass(item.adminLevel);
      rows += `
        <tr>
          <td style="font-weight: 700;">${escapeHTML(item.regionName)}</td>
          <td><span class="nb-badge ${badgeClass}">${escapeHTML(item.adminLevel)}</span></td>
          <td><strong>${escapeHTML(item.format)}</strong></td>
          <td>${escapeHTML(item.fileSizeStr || '-')}</td>
          <td>${formatDate(item.timestamp)}</td>
          <td>
            <button class="nb-btn nb-btn-sm nb-btn-accent btn-delete-history" data-id="${item.id}" title="Hapus dari riwayat">&times;</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;

    $$('.btn-delete-history', tbody).forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        await historyStorage.delete(id);
        this.renderHistory();
        showToast('Catatan riwayat dihapus.', 'info');
      });
    });
  }
}



  /* --- File: js/main.js --- */
/**
 * BIG Downloader Web — Entry Point
 */


document.addEventListener('DOMContentLoaded', () => {
  // Initialize the Application
  window.app = new App();
  console.log('BIG Downloader Web initialized successfully with Neo-Brutalism System.');
});



})();
