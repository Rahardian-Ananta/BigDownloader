use crate::core::big_api::BigApiClient;
use crate::core::geometry::{dissolve_geometries, BBox, RawGeometry};
use crate::core::metadata::{AdminLevel, DEFAULT_MAX_RECORD_COUNT};
use crate::core::search::RegionItem;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadedFeature {
    pub attributes: serde_json::Map<String, serde_json::Value>,
    pub geometry: RawGeometry,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadedRegionData {
    pub item: RegionItem,
    pub features: Vec<DownloadedFeature>,
    pub dissolved_geometry: RawGeometry,
    pub bbox: BBox,
    pub centroid: (f64, f64),
    pub feature_count: usize,
    pub total_points: usize,
}

pub struct RegionDownloader<'a> {
    api: &'a BigApiClient,
    cancel_flag: Arc<AtomicBool>,
}

impl<'a> RegionDownloader<'a> {
    pub fn new(api: &'a BigApiClient, cancel_flag: Arc<AtomicBool>) -> Self {
        Self { api, cancel_flag }
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancel_flag.load(Ordering::Relaxed)
    }

    pub async fn download_region<F>(
        &self,
        item: &RegionItem,
        mut on_progress: F,
    ) -> Result<DownloadedRegionData, String>
    where
        F: FnMut(&str, f32),
    {
        on_progress("Menghubungkan ke layanan geospasial BIG...", 0.05);

        if self.is_cancelled() {
            return Err("Operasi dibatalkan oleh pengguna".to_string());
        }

        let mut offset = 0;
        let limit = DEFAULT_MAX_RECORD_COUNT;
        let mut raw_features = Vec::new();

        loop {
            if self.is_cancelled() {
                return Err("Operasi dibatalkan oleh pengguna".to_string());
            }

            let msg = format!("Mengunduh geometri fitur (offset {})...", offset);
            on_progress(&msg, 0.2 + (offset as f32 / 5000.0).min(0.5));

            let geojson_val = self
                .api
                .query_geojson(item.layer_id, &item.where_clause, "*", offset, limit)
                .await?;

            let features_arr = geojson_val
                .get("features")
                .and_then(|f| f.as_array())
                .cloned()
                .unwrap_or_default();

            let batch_count = features_arr.len();
            if batch_count == 0 {
                break;
            }

            for feat in features_arr {
                let geom_val = feat.get("geometry").cloned().unwrap_or(serde_json::Value::Null);
                let props_val = feat
                    .get("properties")
                    .and_then(|p| p.as_object())
                    .cloned()
                    .unwrap_or_default();

                if let Some(geom) = RawGeometry::from_geojson_value(&geom_val) {
                    raw_features.push(DownloadedFeature {
                        attributes: props_val,
                        geometry: geom,
                    });
                }
            }

            let exceeded = geojson_val
                .get("exceededTransferLimit")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            if !exceeded && batch_count < limit {
                break;
            }

            offset += batch_count;
        }

        if raw_features.is_empty() {
            return Err(format!(
                "Tidak ada data geometri yang ditemukan untuk wilayah '{}'",
                item.name
            ));
        }

        on_progress("Memproses dan memvalidasi geometri...", 0.75);

        let geoms_only: Vec<RawGeometry> = raw_features.iter().map(|f| f.geometry.clone()).collect();
        let dissolved = if item.level == AdminLevel::Provinsi || geoms_only.len() > 1 {
            dissolve_geometries(&geoms_only)
        } else {
            geoms_only[0].clone().ensure_multipolygon()
        };

        let bbox = dissolved.bbox();
        let centroid = dissolved.centroid();
        let feature_count = raw_features.len();

        let mut total_points = 0;
        match &dissolved {
            RawGeometry::Polygon { coordinates } => {
                for r in coordinates {
                    total_points += r.len();
                }
            }
            RawGeometry::MultiPolygon { coordinates } => {
                for p in coordinates {
                    for r in p {
                        total_points += r.len();
                    }
                }
            }
        }

        on_progress("Selesai mengunduh data wilayah", 1.0);

        Ok(DownloadedRegionData {
            item: item.clone(),
            features: raw_features,
            dissolved_geometry: dissolved,
            bbox,
            centroid,
            feature_count,
            total_points,
        })
    }
}
