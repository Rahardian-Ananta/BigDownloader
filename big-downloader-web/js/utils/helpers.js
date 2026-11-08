/**
 * BIG Downloader Web — Utility Helpers
 */

/**
 * Escape HTML to prevent XSS injection
 * @param {string} str 
 * @returns {string}
 */
export function escapeHTML(str) {
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
export function debounce(func, waitMs = 300) {
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
export function downloadBlob(content, filename, mimeType = 'application/octet-stream') {
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
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deep clone an object
 * @param {any} obj 
 * @returns {any}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Normalize and clean string for comparison
 * @param {string} text 
 * @returns {string}
 */
export function normalizeName(text) {
  if (!text) return '';
  return text.trim().toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/^KAB\.\s*/i, 'KABUPATEN ')
    .replace(/^KOTA\s*/i, 'KOTA ');
}
