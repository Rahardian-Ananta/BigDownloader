/**
 * BIG Downloader Web — CSV Exporter (Attributes & Spatial Metadata)
 */

export class CsvExporter {
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
