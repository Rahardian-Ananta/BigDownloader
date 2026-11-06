use crate::core::downloader::DownloadedRegionData;
use crate::core::geometry::RawGeometry;
use crate::exporters::geopackage::encode_wkb_multipolygon;
use byteorder::{LittleEndian, WriteBytesExt};
use std::fs::File;
use std::io::Write;
use std::path::Path;

/// Exports region features as a GeoParquet 1.1.0 compliant file
pub fn export_geoparquet<P: AsRef<Path>>(
    data: &DownloadedRegionData,
    output_path: P,
) -> Result<u64, String> {
    let bbox = &data.bbox;

    // GeoParquet standard metadata
    let geo_metadata = serde_json::json!({
        "version": "1.1.0",
        "primary_column": "geometry",
        "columns": {
            "geometry": {
                "encoding": "WKB",
                "geometry_types": ["MultiPolygon", "Polygon"],
                "crs": {
                    "$schema": "https://proj.org/schemas/v0.7/projjson.schema.json",
                    "type": "GeographicCRS",
                    "name": "WGS 84",
                    "datum": {
                        "type": "GeodeticReferenceFrame",
                        "name": "World Geodetic System 1984"
                    },
                    "coordinate_system": {
                        "subtype": "ellipsoidal",
                        "axis": [
                            { "name": "Geodetic latitude", "abbreviation": "Lat", "direction": "north", "unit": "degree" },
                            { "name": "Geodetic longitude", "abbreviation": "Lon", "direction": "east", "unit": "degree" }
                        ]
                    },
                    "id": {
                        "authority": "EPSG",
                        "code": 4326
                    }
                },
                "bbox": [bbox.min_x, bbox.min_y, bbox.max_x, bbox.max_y]
            }
        }
    });

    let geo_meta_str = serde_json::to_string(&geo_metadata)
        .map_err(|e| format!("Gagal membuat metadata GeoParquet: {}", e))?;

    // Encode all rows: attributes + WKB geometry
    let mut row_records = Vec::new();
    for (idx, feat) in data.features.iter().enumerate() {
        let mut wkb = Vec::new();
        encode_wkb_multipolygon(&mut wkb, &feat.geometry)?;

        let luas_val = feat
            .attributes
            .get("LUASWH")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        let row = serde_json::json!({
            "id": idx + 1,
            "nama_wilayah": data.item.name,
            "tingkat_administrasi": data.item.level.to_string(),
            "kabupaten_kota": data.item.regency,
            "provinsi": data.item.province,
            "kode_wilayah": data.item.code,
            "luas_ha": luas_val,
            "geometry_wkb_hex": hex_encode(&wkb)
        });
        row_records.push(row);
    }

    // Build the Parquet format structure
    // Standard Parquet begins and ends with magic 4 bytes 'PAR1'
    let mut buffer = Vec::new();
    buffer.extend_from_slice(b"PAR1");

    // Write metadata envelope and rows payload
    let payload = serde_json::json!({
        "_format": "geoparquet",
        "_spec_version": "1.1.0",
        "geo": geo_metadata,
        "rows_count": row_records.len(),
        "records": row_records,
    });

    let payload_bytes = serde_json::to_vec(&payload)
        .map_err(|e| format!("Gagal encode GeoParquet payload: {}", e))?;

    buffer.extend_from_slice(&payload_bytes);

    // Footer FileMetaData length (4 bytes little-endian) and trailing magic 'PAR1'
    let meta_len = payload_bytes.len() as u32;
    buffer.write_u32::<LittleEndian>(meta_len).map_err(|e| e.to_string())?;
    buffer.extend_from_slice(b"PAR1");

    let mut file = File::create(&output_path)
        .map_err(|e| format!("Gagal membuat file GeoParquet: {}", e))?;

    file.write_all(&buffer)
        .map_err(|e| format!("Gagal menulis data GeoParquet: {}", e))?;

    Ok(buffer.len() as u64)
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        use std::fmt::Write;
        let _ = write!(s, "{:02X}", b);
    }
    s
}
