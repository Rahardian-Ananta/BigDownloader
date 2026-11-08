/**
 * BIG Downloader Web — GeoJSON Exporter
 */

export class GeoJsonExporter {
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

