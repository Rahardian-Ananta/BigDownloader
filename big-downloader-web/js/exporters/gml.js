/**
 * BIG Downloader Web — GML Exporter (Geography Markup Language)
 */
import { GeometryService } from '../services/geometry-service.js';

export class GmlExporter {
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
