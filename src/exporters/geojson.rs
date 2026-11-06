use crate::core::downloader::DownloadedRegionData;
use crate::core::geometry::RawGeometry;
use std::fs::File;
use std::io::Write;
use std::path::Path;

pub fn export_geojson<P: AsRef<Path>>(
    data: &DownloadedRegionData,
    output_path: P,
) -> Result<u64, String> {
    let mut features_json = Vec::new();

    for f in &data.features {
        let geom_val = match &f.geometry {
            RawGeometry::Polygon { coordinates } => serde_json::json!({
                "type": "Polygon",
                "coordinates": coordinates,
            }),
            RawGeometry::MultiPolygon { coordinates } => serde_json::json!({
                "type": "MultiPolygon",
                "coordinates": coordinates,
            }),
        };

        let mut props = serde_json::Map::new();
        props.insert(
            "nama_wilayah".to_string(),
            serde_json::Value::String(data.item.name.clone()),
        );
        props.insert(
            "tingkat_administrasi".to_string(),
            serde_json::Value::String(data.item.level.to_string()),
        );
        if let Some(r) = &data.item.regency {
            props.insert("kabupaten_kota".to_string(), serde_json::Value::String(r.clone()));
        }
        if let Some(p) = &data.item.province {
            props.insert("provinsi".to_string(), serde_json::Value::String(p.clone()));
        }
        if let Some(c) = &data.item.code {
            props.insert("kode_wilayah".to_string(), serde_json::Value::String(c.clone()));
        }

        // Include original attributes from BIG
        for (k, v) in &f.attributes {
            props.insert(k.clone(), v.clone());
        }

        let feat_json = serde_json::json!({
            "type": "Feature",
            "properties": props,
            "geometry": geom_val,
        });

        features_json.push(feat_json);
    }

    let root = serde_json::json!({
        "type": "FeatureCollection",
        "name": data.item.name,
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "features": features_json
    });

    let json_bytes = serde_json::to_vec_pretty(&root)
        .map_err(|e| format!("Gagal serialisasi GeoJSON: {}", e))?;

    let mut file = File::create(&output_path)
        .map_err(|e| format!("Gagal membuat file GeoJSON: {}", e))?;

    file.write_all(&json_bytes)
        .map_err(|e| format!("Gagal menulis data GeoJSON: {}", e))?;

    let file_size = json_bytes.len() as u64;
    Ok(file_size)
}
