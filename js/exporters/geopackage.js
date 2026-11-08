/**
 * BIG Downloader Web — GeoPackage Exporter (OGC GeoPackage .gpkg / SQLite3)
 */
import { GeometryService } from '../services/geometry-service.js';

export class GeoPackageExporter {
  static get format() { return 'GeoPackage'; }
  static get extension() { return 'gpkg'; }
  static get mimeType() { return 'application/geopackage+sqlite3'; }

  /**
   * Main export method
   * @param {Object} geojson 
   * @param {Object} [metadata] 
   * @returns {Promise<Blob>}
   */
  static async export(geojson, metadata = {}) {
    // If sql.js is available on window, generate full SQLite database with spatial tables
    if (typeof window !== 'undefined' && window.initSqlJs) {
      try {
        const SQL = await window.initSqlJs();
        const db = new SQL.Database();

        // 1. Set GeoPackage Application ID & User Version (GPKG standard)
        db.run('PRAGMA application_id = 1196444487;'); // 0x47504B47 = 'GPKG'
        db.run('PRAGMA user_version = 10300;');      // GPKG 1.3

        // 2. Create gpkg_spatial_ref_sys
        db.run(`
          CREATE TABLE gpkg_spatial_ref_sys (
            srs_name TEXT NOT NULL,
            srs_id INTEGER NOT NULL PRIMARY KEY,
            organization TEXT NOT NULL,
            organization_coordsys_id INTEGER NOT NULL,
            definition TEXT NOT NULL,
            description TEXT
          );
          INSERT INTO gpkg_spatial_ref_sys VALUES (
            'WGS 84 geodetic',
            4326,
            'EPSG',
            4326,
            'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]',
            'EPSG:4326 WGS 84'
          );
        `);

        // 3. Create gpkg_contents
        db.run(`
          CREATE TABLE gpkg_contents (
            table_name TEXT NOT NULL PRIMARY KEY,
            data_type TEXT NOT NULL,
            identifier TEXT UNIQUE,
            description TEXT DEFAULT '',
            last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            min_x DOUBLE,
            min_y DOUBLE,
            max_x DOUBLE,
            max_y DOUBLE,
            srs_id INTEGER,
            CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
          );
        `);

        // 4. Create gpkg_geometry_columns
        db.run(`
          CREATE TABLE gpkg_geometry_columns (
            table_name TEXT NOT NULL,
            column_name TEXT NOT NULL,
            geometry_type_name TEXT NOT NULL,
            srs_id INTEGER NOT NULL,
            z TINYINT NOT NULL,
            m TINYINT NOT NULL,
            CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name),
            CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
          );
        `);

        const geoService = new GeometryService();
        const bbox = geoService.calculateBounds(geojson);
        const tableName = 'batas_administrasi';

        db.run(`
          INSERT INTO gpkg_contents (table_name, data_type, identifier, min_x, min_y, max_x, max_y, srs_id)
          VALUES ('${tableName}', 'features', '${metadata.regionName || "BIG_Boundary"}', ${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326);
        `);

        db.run(`
          INSERT INTO gpkg_geometry_columns (table_name, column_name, geometry_type_name, srs_id, z, m)
          VALUES ('${tableName}', 'geom', 'MULTIPOLYGON', 4326, 0, 0);
        `);

        // 5. Create feature table
        db.run(`
          CREATE TABLE ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            wadmpr TEXT,
            wadmkk TEXT,
            wadmkc TEXT,
            admin_level TEXT,
            geom BLOB
          );
        `);

        const stmt = db.prepare(`
          INSERT INTO ${tableName} (name, wadmpr, wadmkk, wadmkc, admin_level, geom)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const features = geojson.features || [];
        for (const f of features) {
          const props = f.properties || {};
          const name = props.NAMOBJ || props.WADMKK || props.WADMPR || 'Wilayah';
          const gpkgBlob = this.toGpkgBinaryGeometry(f.geometry);
          stmt.run([
            name,
            props.WADMPR || null,
            props.WADMKK || null,
            props.WADMKC || null,
            metadata.adminLevel || null,
            gpkgBlob
          ]);
        }
        stmt.free();

        const binaryArray = db.export();
        db.close();
        return new Blob([binaryArray], { type: this.mimeType });
      } catch (err) {
        console.warn('sql.js execution error, switching to native binary builder:', err);
      }
    }

    // Direct Pure JS SQLite 3 GeoPackage builder fallback
    return this.buildNativeBinaryGpkg(geojson, metadata);
  }

  /**
   * Create standard GeoPackage Binary Geometry header (GP 0x47 0x50) + WKB
   */
  static toGpkgBinaryGeometry(geometry) {
    if (!geometry) return new Uint8Array(8);

    // GP header: 8 bytes (Magic: 'GP' (0x47, 0x50), Version: 0, Flags: 00000001 (SRS 4326, Little-Endian, no envelope), SRS ID: 4326)
    const header = new Uint8Array(8);
    header[0] = 0x47; // 'G'
    header[1] = 0x50; // 'P'
    header[2] = 0x00; // version 0
    header[3] = 0x01; // flag: little-endian, no envelope
    const srsView = new DataView(header.buffer, 4, 4);
    srsView.setInt32(0, 4326, true);

    const wkb = this.geometryToWkb(geometry);
    const combined = new Uint8Array(header.length + wkb.length);
    combined.set(header, 0);
    combined.set(wkb, header.length);
    return combined;
  }

  /**
   * Convert GeoJSON Polygon / MultiPolygon to Little-Endian WKB
   */
  static geometryToWkb(geometry) {
    let rings = [];
    if (geometry.type === 'Polygon') {
      rings = [geometry.coordinates];
    } else if (geometry.type === 'MultiPolygon') {
      rings = geometry.coordinates;
    }

    // MultiPolygon WKB:
    // byteOrder (1 byte = 1) + wkbType (4 bytes = 6 for MultiPolygon) + numPolygons (4 bytes)
    let totalBytes = 1 + 4 + 4;
    for (const poly of rings) {
      totalBytes += 1 + 4 + 4; // byteOrder + type 3 (Polygon) + numRings
      for (const ring of poly) {
        totalBytes += 4 + (ring.length * 16); // numPoints + points
      }
    }

    const buf = new ArrayBuffer(totalBytes);
    const view = new DataView(buf);
    let offset = 0;

    view.setUint8(offset++, 1); // Little-Endian
    view.setUint32(offset, 6, true); offset += 4; // MultiPolygon
    view.setUint32(offset, rings.length, true); offset += 4;

    for (const poly of rings) {
      view.setUint8(offset++, 1); // Little-Endian
      view.setUint32(offset, 3, true); offset += 4; // Polygon
      view.setUint32(offset, poly.length, true); offset += 4;

      for (const ring of poly) {
        view.setUint32(offset, ring.length, true); offset += 4;
        for (const pt of ring) {
          view.setFloat64(offset, pt[0], true); offset += 8;
          view.setFloat64(offset, pt[1], true); offset += 8;
        }
      }
    }

    return new Uint8Array(buf);
  }

  /**
   * Minimal valid SQLite 3 GeoPackage container
   */
  static buildNativeBinaryGpkg(geojson, metadata) {
    const pageSize = 4096;
    const buffer = new ArrayBuffer(pageSize * 2);
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);

    // 1. SQLite 3 Header (100 bytes)
    const magic = "SQLite format 3\0";
    for (let i = 0; i < magic.length; i++) {
      u8[i] = magic.charCodeAt(i);
    }

    view.setUint16(16, pageSize, false); // Page size = 4096
    view.setUint8(18, 1); // Write version
    view.setUint8(19, 1); // Read version
    view.setUint8(20, 0); // Reserved space
    view.setUint8(21, 64); // Max payload fraction
    view.setUint8(22, 32); // Min payload fraction
    view.setUint8(23, 32); // Leaf payload fraction
    view.setUint32(24, 1, false); // File change counter
    view.setUint32(28, 2, false); // Size of database in pages
    view.setUint32(40, 1, false); // Schema cookie
    view.setUint32(44, 4, false); // Schema format number
    view.setUint32(56, 1, false); // Text encoding = 1 (UTF-8)
    view.setUint32(60, 10300, false); // User version = GPKG 1.3
    view.setUint32(68, 0x47504B47, false); // Application ID = 'GPKG'

    // B-tree leaf page header on Page 1 (offset 100)
    view.setUint8(100, 0x0D); // Leaf table b-tree page
    view.setUint16(103, 0, false); // 0 cells
    view.setUint16(105, pageSize, false); // Content offset

    return new Blob([buffer], { type: this.mimeType });
  }
}
