use crate::core::downloader::DownloadedRegionData;
use crate::core::geometry::RawGeometry;
use byteorder::{LittleEndian, WriteBytesExt};
use rusqlite::{params, Connection};
use std::path::Path;

pub fn export_geopackage<P: AsRef<Path>>(
    data: &DownloadedRegionData,
    output_path: P,
) -> Result<u64, String> {
    if output_path.as_ref().exists() {
        let _ = std::fs::remove_file(&output_path);
    }

    let conn = Connection::open(&output_path)
        .map_err(|e| format!("Gagal menginisialisasi GeoPackage SQLite: {}", e))?;

    // Create GeoPackage standard tables
    conn.execute_batch(
        "
        PRAGMA application_id = 1196444487; -- 'GPKG'
        PRAGMA user_version = 10200;       -- GeoPackage 1.2

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
            'GEOGCS[\"WGS 84\",DATUM[\"WGS_1984\",SPHEROID[\"WGS 84\",6378137,298.257223563,AUTHORITY[\"EPSG\",\"7030\"]],AUTHORITY[\"EPSG\",\"6326\"]],PRIMEM[\"Greenwich\",0,AUTHORITY[\"EPSG\",\"8901\"]],UNIT[\"degree\",0.0174532925199433,AUTHORITY[\"EPSG\",\"9122\"]],AXIS[\"Latitude\",NORTH],AXIS[\"Longitude\",EAST],AUTHORITY[\"EPSG\",\"4326\"]]',
            'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid'
        );

        CREATE TABLE gpkg_contents (
            table_name TEXT NOT NULL PRIMARY KEY,
            data_type TEXT NOT NULL,
            identifier TEXT UNIQUE,
            description TEXT DEFAULT '',
            last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            min_x DOUBLE,
            min_y DOUBLE,
            max_x DOUBLE,
            max_y DOUBLE,
            srs_id INTEGER,
            CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
        );

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

        CREATE TABLE batas_wilayah (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            geom BLOB NOT NULL,
            nama_wilayah TEXT NOT NULL,
            tingkat_administrasi TEXT NOT NULL,
            kabupaten_kota TEXT,
            provinsi TEXT,
            kode_wilayah TEXT,
            luas_ha REAL
        );
        ",
    )
    .map_err(|e| format!("Gagal membuat skema GeoPackage: {}", e))?;

    let bbox = &data.bbox;
    conn.execute(
        "INSERT INTO gpkg_contents (table_name, data_type, identifier, description, min_x, min_y, max_x, max_y, srs_id)
         VALUES ('batas_wilayah', 'features', 'batas_wilayah', 'Batas Wilayah Administratif Indonesia', ?1, ?2, ?3, ?4, 4326)",
        params![bbox.min_x, bbox.min_y, bbox.max_x, bbox.max_y],
    )
    .map_err(|e| format!("Gagal menulis gpkg_contents: {}", e))?;

    conn.execute(
        "INSERT INTO gpkg_geometry_columns (table_name, column_name, geometry_type_name, srs_id, z, m)
         VALUES ('batas_wilayah', 'geom', 'MULTIPOLYGON', 4326, 0, 0)",
        [],
    )
    .map_err(|e| format!("Gagal menulis gpkg_geometry_columns: {}", e))?;

    let mut stmt = conn
        .prepare(
            "INSERT INTO batas_wilayah (geom, nama_wilayah, tingkat_administrasi, kabupaten_kota, provinsi, kode_wilayah, luas_ha)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        )
        .map_err(|e| format!("Gagal menyiapkan insert feature: {}", e))?;

    for feat in &data.features {
        let gpkg_geom_blob = encode_gpkg_geometry(&feat.geometry)?;

        let luas_val = feat
            .attributes
            .get("LUASWH")
            .and_then(|v| v.as_f64());

        stmt.execute(params![
            gpkg_geom_blob,
            data.item.name,
            data.item.level.to_string(),
            data.item.regency,
            data.item.province,
            data.item.code,
            luas_val,
        ])
        .map_err(|e| format!("Gagal insert data feature ke GeoPackage: {}", e))?;
    }

    drop(stmt);
    drop(conn);

    let meta = std::fs::metadata(&output_path)
        .map_err(|e| format!("Gagal membaca metadata GeoPackage: {}", e))?;

    Ok(meta.len())
}

/// Encodes geometry into GeoPackage standard binary format (header + envelope + WKB)
pub fn encode_gpkg_geometry(geom: &RawGeometry) -> Result<Vec<u8>, String> {
    let bbox = geom.bbox();
    let mut buf = Vec::with_capacity(1024);

    // GeoPackage Binary Header:
    // Magic: 0x47, 0x50 ('GP')
    buf.push(0x47);
    buf.push(0x50);
    // Version: 0
    buf.push(0x00);
    // Flags: Little-endian (bit 0 = 1), Envelope type 1 (bits 1-3 = 001, meaning minx, maxx, miny, maxy)
    let flags: u8 = 0b00000011; // LE (1) + envelope size 32 bytes (1 << 1)
    buf.push(flags);
    // SRS ID: 4326 in little-endian
    buf.write_i32::<LittleEndian>(4326)
        .map_err(|e| e.to_string())?;

    // Envelope: min_x, max_x, min_y, max_y (4 * f64)
    buf.write_f64::<LittleEndian>(bbox.min_x).map_err(|e| e.to_string())?;
    buf.write_f64::<LittleEndian>(bbox.max_x).map_err(|e| e.to_string())?;
    buf.write_f64::<LittleEndian>(bbox.min_y).map_err(|e| e.to_string())?;
    buf.write_f64::<LittleEndian>(bbox.max_y).map_err(|e| e.to_string())?;

    // WKB MultiPolygon:
    encode_wkb_multipolygon(&mut buf, geom)?;

    Ok(buf)
}

/// Encodes geometry as WKB MultiPolygon (ByteOrder 1, Type 6)
pub fn encode_wkb_multipolygon(buf: &mut Vec<u8>, geom: &RawGeometry) -> Result<(), String> {
    // Byte order: 1 (Little Endian)
    buf.push(0x01);
    // Type: 6 (MultiPolygon)
    buf.write_u32::<LittleEndian>(6).map_err(|e| e.to_string())?;

    match geom {
        RawGeometry::Polygon { coordinates } => {
            buf.write_u32::<LittleEndian>(1).map_err(|e| e.to_string())?;
            encode_wkb_polygon(buf, coordinates)?;
        }
        RawGeometry::MultiPolygon { coordinates } => {
            buf.write_u32::<LittleEndian>(coordinates.len() as u32)
                .map_err(|e| e.to_string())?;
            for poly in coordinates {
                encode_wkb_polygon(buf, poly)?;
            }
        }
    }

    Ok(())
}

fn encode_wkb_polygon(buf: &mut Vec<u8>, rings: &[Vec<[f64; 2]>]) -> Result<(), String> {
    // Byte order: 1 (Little Endian)
    buf.push(0x01);
    // Type: 3 (Polygon)
    buf.write_u32::<LittleEndian>(3).map_err(|e| e.to_string())?;
    buf.write_u32::<LittleEndian>(rings.len() as u32)
        .map_err(|e| e.to_string())?;

    for ring in rings {
        buf.write_u32::<LittleEndian>(ring.len() as u32)
            .map_err(|e| e.to_string())?;
        for pt in ring {
            buf.write_f64::<LittleEndian>(pt[0]).map_err(|e| e.to_string())?;
            buf.write_f64::<LittleEndian>(pt[1]).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

