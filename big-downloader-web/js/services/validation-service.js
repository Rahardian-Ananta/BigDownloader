/**
 * BIG Downloader Web — Geometry & Data Validation Service
 */

export class ValidationService {
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
