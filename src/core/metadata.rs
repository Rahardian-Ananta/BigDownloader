use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub const BIG_BASE_MAPSERVER_URL: &str =
    "https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer";

pub const LAYER_ID_KABKOTA: u32 = 0;
pub const LAYER_ID_KECAMATAN: u32 = 1;
pub const LAYER_ID_DESA: u32 = 2;

pub const DEFAULT_CRS: &str = "EPSG:4326";
pub const DEFAULT_MAX_RECORD_COUNT: usize = 1000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AdminLevel {
    Provinsi,
    KabupatenKota,
    Kecamatan,
    DesaKelurahan,
}

impl AdminLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            AdminLevel::Provinsi => "Provinsi",
            AdminLevel::KabupatenKota => "Kabupaten/Kota",
            AdminLevel::Kecamatan => "Kecamatan",
            AdminLevel::DesaKelurahan => "Desa/Kelurahan",
        }
    }

    pub fn target_layer_id(&self) -> u32 {
        match self {
            AdminLevel::Provinsi => LAYER_ID_KABKOTA, // Dissolved from kab/kota
            AdminLevel::KabupatenKota => LAYER_ID_KABKOTA,
            AdminLevel::Kecamatan => LAYER_ID_KECAMATAN,
            AdminLevel::DesaKelurahan => LAYER_ID_DESA,
        }
    }
}

impl std::fmt::Display for AdminLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceMetadata {
    pub service_name: String,
    pub endpoint: String,
    pub layer_id: u32,
    pub layer_name: String,
    pub crs: String,
    pub fetched_at: DateTime<Utc>,
    pub copyright: String,
    pub publication_note: String,
}

impl Default for SourceMetadata {
    fn default() -> Self {
        Self {
            service_name: "BAPANAS/Batas_Administrasi".to_string(),
            endpoint: BIG_BASE_MAPSERVER_URL.to_string(),
            layer_id: LAYER_ID_KABKOTA,
            layer_name: "Batas Wilayah Kabupaten/Kota".to_string(),
            crs: DEFAULT_CRS.to_string(),
            fetched_at: Utc::now(),
            copyright: "Badan Informasi Geospasial (BIG)".to_string(),
            publication_note: "Geodatabase batas wilayah administrasi edisi Oktober 2020 - Permendagri No 72/2019".to_string(),
        }
    }
}

