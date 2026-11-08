/**
 * BIG Downloader Web — ESRI Shapefile Exporter
 * Generates binary .shp, .shx, .dbf, .prj, .cpg and bundles them with JSZip
 */
import { GeometryService } from '../services/geometry-service.js';

export class ShapefileExporter {
  static get format() { return 'Shapefile'; }
  static get extension() { return 'zip'; }
  static get mimeType() { return 'application/zip'; }

  static PRJ_WGS84 = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

  /**
   * Main export method
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Promise<Blob>}
   */
  static async export(geojson, metadata = {}) {
    if (typeof window !== 'undefined' && !window.JSZip) {
      throw new Error('Library JSZip belum siap. Pastikan koneksi internet aktif untuk memuat JSZip.');
    }

    const baseName = (metadata.regionName || geojson.name || 'BIG_Boundary')
      .replace(/[^a-zA-Z0-9_]/g, '_');

    const shpData = this.buildShpAndShx(geojson);
    const dbfData = this.buildDbf(geojson);

    const zip = new window.JSZip();
    zip.file(`${baseName}.shp`, shpData.shp);
    zip.file(`${baseName}.shx`, shpData.shx);
    zip.file(`${baseName}.dbf`, dbfData);
    zip.file(`${baseName}.prj`, this.PRJ_WGS84);
    zip.file(`${baseName}.cpg`, 'UTF-8');

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return zipBlob;
  }

  /**
   * Generate binary .shp and .shx ArrayBuffers
   */
  static buildShpAndShx(geojson) {
    const geoService = new GeometryService();
    const bounds = geoService.calculateBounds(geojson);
    const features = geojson.features || [];

    // Calculate total size needed
    const recordBuffers = [];
    const shxRecords = [];
    let currentShpWordOffset = 50; // 100 bytes / 2

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const geom = f.geometry;
      if (!geom) continue;

      let rings = [];
      if (geom.type === 'Polygon') {
        rings = geom.coordinates;
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          rings.push(...poly);
        }
      }

      if (rings.length === 0) continue;

      const numParts = rings.length;
      let numPoints = 0;
      rings.forEach(r => numPoints += r.length);

      // Content length in 16-bit words:
      // ShapeType(2) + Box(16) + NumParts(2) + NumPoints(2) + Parts(numParts*2) + Points(numPoints*8)
      const contentBytes = 4 + 32 + 4 + 4 + (numParts * 4) + (numPoints * 16);
      const contentWords = contentBytes / 2;

      const recBuf = new ArrayBuffer(8 + contentBytes);
      const view = new DataView(recBuf);

      // Record Header (8 bytes, Big-Endian)
      view.setInt32(0, i + 1, false);
      view.setInt32(4, contentWords, false);

      // Shape Content (Little-Endian)
      view.setInt32(8, 5, true); // Shape Type 5 = Polygon

      // Feature bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      rings.forEach(r => r.forEach(pt => {
        if (pt[0] < minX) minX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] > maxY) maxY = pt[1];
      }));

      view.setFloat64(12, minX, true);
      view.setFloat64(20, minY, true);
      view.setFloat64(28, maxX, true);
      view.setFloat64(36, maxY, true);

      view.setInt32(44, numParts, true);
      view.setInt32(48, numPoints, true);

      // Parts indices
      let ptIndex = 0;
      let partOffset = 52;
      for (let p = 0; p < numParts; p++) {
        view.setInt32(partOffset, ptIndex, true);
        partOffset += 4;
        ptIndex += rings[p].length;
      }

      // Points coordinates
      let ptOffset = partOffset;
      for (const ring of rings) {
        for (const pt of ring) {
          view.setFloat64(ptOffset, pt[0], true);
          view.setFloat64(ptOffset + 8, pt[1], true);
          ptOffset += 16;
        }
      }

      recordBuffers.push(recBuf);
      shxRecords.push({ offset: currentShpWordOffset, length: contentWords });
      currentShpWordOffset += (8 + contentBytes) / 2;
    }

    // Combine all records into single .shp buffer
    const totalShpBytes = 100 + recordBuffers.reduce((acc, b) => acc + b.byteLength, 0);
    const shpBuffer = new ArrayBuffer(totalShpBytes);
    const shpView = new DataView(shpBuffer);

    // Write .shp Header (100 bytes)
    this.writeHeader(shpView, totalShpBytes / 2, bounds);

    // Copy records into shp
    let destOffset = 100;
    for (const b of recordBuffers) {
      new Uint8Array(shpBuffer, destOffset, b.byteLength).set(new Uint8Array(b));
      destOffset += b.byteLength;
    }

    // Build .shx
    const totalShxBytes = 100 + (shxRecords.length * 8);
    const shxBuffer = new ArrayBuffer(totalShxBytes);
    const shxView = new DataView(shxBuffer);

    this.writeHeader(shxView, totalShxBytes / 2, bounds);

    let shxOffset = 100;
    for (const rec of shxRecords) {
      shxView.setInt32(shxOffset, rec.offset, false);
      shxView.setInt32(shxOffset + 4, rec.length, false);
      shxOffset += 8;
    }

    return { shp: shpBuffer, shx: shxBuffer };
  }

  static writeHeader(view, fileLengthWords, bounds) {
    view.setInt32(0, 9994, false); // File Code
    view.setInt32(24, fileLengthWords, false); // File Length in 16-bit words
    view.setInt32(28, 1000, true); // Version
    view.setInt32(32, 5, true); // Shape type 5 = Polygon

    view.setFloat64(36, bounds[0], true); // Xmin
    view.setFloat64(44, bounds[1], true); // Ymin
    view.setFloat64(52, bounds[2], true); // Xmax
    view.setFloat64(60, bounds[3], true); // Ymax
    view.setFloat64(68, 0.0, true); // Zmin
    view.setFloat64(76, 0.0, true); // Zmax
    view.setFloat64(84, 0.0, true); // Mmin
    view.setFloat64(92, 0.0, true); // Mmax
  }

  /**
   * Generate binary .dbf (dBase III) file
   */
  static buildDbf(geojson) {
    const features = geojson.features || [];
    const propKeys = new Set();
    features.forEach(f => {
      if (f.properties) Object.keys(f.properties).forEach(k => propKeys.add(k));
    });

    const fields = Array.from(propKeys).slice(0, 20).map(key => ({
      name: key.slice(0, 10).toUpperCase(),
      origKey: key,
      type: 'C',
      length: 60
    }));

    if (fields.length === 0) {
      fields.push({ name: 'ID', origKey: 'ID', type: 'C', length: 10 });
    }

    const numRecords = features.length;
    const headerBytes = 32 + (fields.length * 32) + 1;
    const recordBytes = 1 + fields.reduce((acc, f) => acc + f.length, 0);
    const totalBytes = headerBytes + (numRecords * recordBytes) + 1;

    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);
    const now = new Date();

    // DBF Header
    view.setUint8(0, 0x03); // dBase III
    view.setUint8(1, now.getFullYear() - 1900);
    view.setUint8(2, now.getMonth() + 1);
    view.setUint8(3, now.getDate());
    view.setUint32(4, numRecords, true);
    view.setUint16(8, headerBytes, true);
    view.setUint16(10, recordBytes, true);

    // Field Descriptors
    let fieldOffset = 32;
    for (const f of fields) {
      for (let i = 0; i < 11; i++) {
        view.setUint8(fieldOffset + i, i < f.name.length ? f.name.charCodeAt(i) : 0);
      }
      view.setUint8(fieldOffset + 11, f.type.charCodeAt(0));
      view.setUint8(fieldOffset + 16, f.length);
      fieldOffset += 32;
    }
    view.setUint8(fieldOffset, 0x0D); // Header terminator

    // Records
    let recOffset = headerBytes;
    const encoder = new TextEncoder();

    for (const feat of features) {
      u8[recOffset] = 0x20; // Deletion flag (space = active)
      let curColOffset = recOffset + 1;

      for (const f of fields) {
        const val = feat.properties ? String(feat.properties[f.origKey] ?? '') : '';
        const encoded = encoder.encode(val);
        for (let b = 0; b < f.length; b++) {
          u8[curColOffset + b] = b < encoded.length ? encoded[b] : 0x20; // pad with spaces
        }
        curColOffset += f.length;
      }
      recOffset += recordBytes;
    }

    u8[totalBytes - 1] = 0x1A; // EOF marker
    return buffer;
  }
}
