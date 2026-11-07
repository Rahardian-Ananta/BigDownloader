use crate::core::downloader::DownloadedRegionData;
use std::fs::File;
use std::path::Path;

pub fn export_csv<P: AsRef<Path>>(
    data: &DownloadedRegionData,
    output_path: P,
) -> Result<u64, String> {
    let file = File::create(&output_path)
        .map_err(|e| format!("Gagal membuat file CSV: {}", e))?;

    let mut wtr = csv::WriterBuilder::new()
        .has_headers(true)
        .from_writer(file);

    wtr.write_record([
        "id",
        "nama_wilayah",
        "tingkat_administrasi",
        "kabupaten_kota",
        "provinsi",
        "kode_wilayah",
        "luas_ha",
        "centroid_lon",
        "centroid_lat",
        "bbox_minx",
        "bbox_miny",
        "bbox_maxx",
        "bbox_maxy",
        "jumlah_titik",
    ])
    .map_err(|e| format!("Gagal menulis header CSV: {}", e))?;

    for (idx, feat) in data.features.iter().enumerate() {
        let bbox = feat.geometry.bbox();
        let (cx, cy) = feat.geometry.centroid();

        let luas_str = feat
            .attributes
            .get("LUASWH")
            .and_then(|v| v.as_f64())
            .map(|l| format!("{:.4}", l))
            .unwrap_or_default();

        let code_str = data
            .item
            .code
            .clone()
            .or_else(|| {
                feat.attributes
                    .get("KDPKAB")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_default();

        let mut pt_count = 0;
        match &feat.geometry {
            crate::core::geometry::RawGeometry::Polygon { coordinates } => {
                for r in coordinates {
                    pt_count += r.len();
                }
            }
            crate::core::geometry::RawGeometry::MultiPolygon { coordinates } => {
                for p in coordinates {
                    for r in p {
                        pt_count += r.len();
                    }
                }
            }
        }

        wtr.write_record([
            &(idx + 1).to_string(),
            &data.item.name,
            &data.item.level.to_string(),
            data.item.regency.as_deref().unwrap_or(""),
            data.item.province.as_deref().unwrap_or(""),
            &code_str,
            &luas_str,
            &format!("{:.6}", cx),
            &format!("{:.6}", cy),
            &format!("{:.6}", bbox.min_x),
            &format!("{:.6}", bbox.min_y),
            &format!("{:.6}", bbox.max_x),
            &format!("{:.6}", bbox.max_y),
            &pt_count.to_string(),
        ])
        .map_err(|e| format!("Gagal menulis baris CSV: {}", e))?;
    }

    wtr.flush()
        .map_err(|e| format!("Gagal menyimpan CSV: {}", e))?;

    let meta = std::fs::metadata(&output_path)
        .map_err(|e| format!("Gagal membaca metadata CSV: {}", e))?;

    Ok(meta.len())
}

