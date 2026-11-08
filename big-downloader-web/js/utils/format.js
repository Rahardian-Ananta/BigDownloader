/**
 * BIG Downloader Web — Formatting Utilities
 */

/**
 * Format bytes to human readable string (KB, MB, GB)
 * @param {number} bytes 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
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
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format timestamp to localized date & time
 * @param {number|Date|string} dateInput 
 * @returns {string}
 */
export function formatDate(dateInput) {
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
export function getAdminLevelBadgeClass(level) {
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
export function generateFilename(name, level, ext) {
  const cleanName = (name || 'Wilayah')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');
  const cleanLevel = (level || 'Admin')
    .replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `BIG_${cleanLevel}_${cleanName}_${dateStr}.${ext}`;
}

