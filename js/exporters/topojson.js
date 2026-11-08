/**
 * BIG Downloader Web — TopoJSON Exporter
 */
import { GeometryService } from '../services/geometry-service.js';

export class TopoJsonExporter {
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

