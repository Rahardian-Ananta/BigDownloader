/**
 * BIG Downloader Web — Geometry Service
 */
import { bigApi, LAYER_KABKOTA, LAYER_KECAMATAN } from '../api/big-api.js';
import { QueryBuilder } from '../api/query-builder.js';

export class GeometryService {
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

export const geometryService = new GeometryService();

