/**
 * BIG Downloader Web — ArcGIS REST API Client
 */

export const BIG_BASE_URL = 'https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer';

export const LAYER_KABKOTA = 0;
export const LAYER_KECAMATAN = 1;
export const LAYER_DESA = 2;

export const DEFAULT_PAGE_SIZE = 1000;

export class BigApiClient {
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

export const bigApi = new BigApiClient();

