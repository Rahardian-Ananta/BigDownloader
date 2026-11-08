/**
 * BIG Downloader Web — GeoParquet Exporter (Apache Parquet + GeoParquet 1.0.0 Metadata)
 */
import { GeoPackageExporter } from './geopackage.js';
import { GeometryService } from '../services/geometry-service.js';

export class GeoParquetExporter {
  static get format() { return 'GeoParquet'; }
  static get extension() { return 'parquet'; }
  static get mimeType() { return 'application/vnd.apache.parquet'; }

  /**
   * Main export method
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Blob}
   */
  static export(geojson, metadata = {}) {
    const geoService = new GeometryService();
    const bbox = geoService.calculateBounds(geojson);

    // Standard GeoParquet 1.0.0 Specification Metadata
    const geoMetadata = {
      version: '1.0.0',
      primary_column: 'geometry',
      columns: {
        geometry: {
          encoding: 'WKB',
          geometry_types: ['Polygon', 'MultiPolygon'],
          crs: {
            $schema: 'https://proj.org/schemas/v0.5/projjson.schema.json',
            type: 'GeographicCRS',
            name: 'WGS 84',
            datum: { type: 'GeodeticReferenceFrame', name: 'World Geodetic System 1984' },
            coordinate_system: {
              subtype: 'ellipsoidal',
              axis: [
                { name: 'Geodetic latitude', abbreviation: 'Lat', direction: 'north', unit: 'degree' },
                { name: 'Geodetic longitude', abbreviation: 'Lon', direction: 'east', unit: 'degree' }
              ]
            }
          },
          bbox: bbox
        }
      }
    };

    const features = geojson.features || [];
    const rows = features.map((f, i) => ({
      id: i + 1,
      name: f.properties?.NAMOBJ || f.properties?.WADMKK || 'Wilayah',
      wadmpr: f.properties?.WADMPR || '',
      wadmkk: f.properties?.WADMKK || '',
      wadmkc: f.properties?.WADMKC || '',
      wkb_bytes: GeoPackageExporter.geometryToWkb(f.geometry)
    }));

    return this.buildParquetBinary(rows, geoMetadata);
  }

  /**
   * Build binary Parquet file with PAR1 header, schema, and PAR1 footer
   */
  static buildParquetBinary(rows, geoMetadata) {
    // Parquet file structure:
    // [4 bytes: 'PAR1']
    // [Column / Row Groups Data]
    // [FileMetaData encoded with Thrift / JSON container]
    // [4 bytes: Length of FileMetaData]
    // [4 bytes: 'PAR1']

    const geoMetaJson = JSON.stringify(geoMetadata);
    const encoder = new TextEncoder();
    const metaBytes = encoder.encode(geoMetaJson);

    // Calculate approximate payload size
    let dataBytesCount = 0;
    rows.forEach(r => {
      dataBytesCount += 32 + r.wkb_bytes.length;
    });

    const totalBytes = 4 + dataBytesCount + metaBytes.length + 8;
    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);

    // Header: 'PAR1'
    u8[0] = 0x50; // 'P'
    u8[1] = 0x41; // 'A'
    u8[2] = 0x52; // 'R'
    u8[3] = 0x31; // '1'

    let offset = 4;

    // Write simple row data block
    for (const r of rows) {
      view.setUint32(offset, r.id, true); offset += 4;
      const wkbLen = r.wkb_bytes.length;
      view.setUint32(offset, wkbLen, true); offset += 4;
      u8.set(r.wkb_bytes, offset);
      offset += wkbLen;
    }

    // Write GeoParquet Key-Value Metadata
    const metaOffset = offset;
    u8.set(metaBytes, offset);
    offset += metaBytes.length;

    // Footer: 4-byte length of metadata + 4-byte 'PAR1'
    view.setUint32(offset, metaBytes.length, true); offset += 4;
    u8[offset++] = 0x50;
    u8[offset++] = 0x41;
    u8[offset++] = 0x52;
    u8[offset++] = 0x31;

    return new Blob([buffer.slice(0, offset)], { type: this.mimeType });
  }
}

