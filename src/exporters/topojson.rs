use crate::core::downloader::DownloadedRegionData;
use crate::core::geometry::RawGeometry;
use std::fs::File;
use std::io::Write;
use std::path::Path;

pub fn export_topojson<P: AsRef<Path>>(
    data: &DownloadedRegionData,
    output_path: P,
) -> Result<u64, String> {
    let mut arcs: Vec<Vec<[f64; 2]>> = Vec::new();
    let mut geometries = Vec::new();

    for f in &data.features {
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

        match &f.geometry {
            RawGeometry::Polygon { coordinates } => {
                let mut poly_arc_indices = Vec::new();
                for ring in coordinates {
                    let arc_idx = arcs.len() as i32;
                    arcs.push(ring.clone());
                    poly_arc_indices.push(vec![arc_idx]);
                }
                geometries.push(serde_json::json!({
                    "type": "Polygon",
                    "arcs": poly_arc_indices,
                    "properties": props,
                }));
            }
            RawGeometry::MultiPolygon { coordinates } => {
                let mut mp_arc_indices = Vec::new();
                for poly in coordinates {
                    let mut poly_arc_indices = Vec::new();
                    for ring in poly {
                        let arc_idx = arcs.len() as i32;
                        arcs.push(ring.clone());
                        poly_arc_indices.push(vec![arc_idx]);
                    }
                    mp_arc_indices.push(poly_arc_indices);
                }
                geometries.push(serde_json::json!({
                    "type": "MultiPolygon",
                    "arcs": mp_arc_indices,
                    "properties": props,
                }));
            }
        }
    }

    let bbox = &data.bbox;
    let root = serde_json::json!({
        "type": "Topology",
        "bbox": [bbox.min_x, bbox.min_y, bbox.max_x, bbox.max_y],
        "objects": {
            "batas_wilayah": {
                "type": "GeometryCollection",
                "geometries": geometries
            }
        },
        "arcs": arcs
    });

    let json_bytes = serde_json::to_vec_pretty(&root)
        .map_err(|e| format!("Gagal serialisasi TopoJSON: {}", e))?;

    let mut file = File::create(&output_path)
        .map_err(|e| format!("Gagal membuat file TopoJSON: {}", e))?;

    file.write_all(&json_bytes)
        .map_err(|e| format!("Gagal menulis data TopoJSON: {}", e))?;

    Ok(json_bytes.len() as u64)
}
