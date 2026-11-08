/**
 * BIG Downloader Web — KML Exporter (Keyhole Markup Language / Google Earth)
 */

export class KmlExporter {
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

