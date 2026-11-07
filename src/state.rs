use crate::core::downloader::DownloadedRegionData;
use crate::core::metadata::AdminLevel;
use crate::core::search::RegionItem;
use crate::database::history::DownloadRecord;
use crate::database::settings::AppSettings;
use crate::database::Database;
use crate::exporters::{ExportFormat, ExportTaskResult};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NavTab {
    Dashboard,
    Search,
    RegionDetail,
    MapPreview,
    Downloads,
    History,
    Settings,
    About,
}

#[derive(Debug, Clone)]
pub struct Notification {
    pub message: String,
    pub is_error: bool,
    pub created_at: std::time::Instant,
}

pub struct AppState {
    pub current_tab: NavTab,
    pub settings: AppSettings,

    // API Connection status
    pub api_connected: Option<bool>,
    pub is_checking_connection: bool,

    // Search
    pub search_query: String,
    pub search_level: AdminLevel,
    pub search_province_filter: String,
    pub search_results: Vec<RegionItem>,
    pub is_searching: bool,
    pub search_error: Option<String>,

    // Selected Region & Detail & Map
    pub selected_region: Option<RegionItem>,
    pub region_data: Option<DownloadedRegionData>,
    pub is_fetching_region: bool,
    pub region_fetch_error: Option<String>,

    // Map Preview Controls
    pub map_zoom: f32,
    pub map_pan: [f32; 2],
    pub map_fit_requested: bool,
    pub map_show_basemap: bool,

    // Download & Export
    pub selected_formats: HashSet<ExportFormat>,
    pub custom_filename: String,
    pub download_dir: PathBuf,
    pub is_downloading: bool,
    pub download_progress_msg: String,
    pub download_progress_val: f32,
    pub last_export_results: Vec<ExportTaskResult>,
    pub cancel_flag: Arc<AtomicBool>,

    // History
    pub history_records: Vec<DownloadRecord>,

    // Toasts
    pub notification: Option<Notification>,
}

impl AppState {
    pub fn new(db: &Database) -> Self {
        let settings = db.settings().load_settings();
        let history_records = db.history().get_all().unwrap_or_default();
        let download_dir = PathBuf::from(&settings.download_dir);

        let mut default_formats = HashSet::new();
        default_formats.insert(ExportFormat::GeoJSON);
        default_formats.insert(ExportFormat::Shapefile);

        Self {
            current_tab: NavTab::Dashboard,
            settings: settings.clone(),

            api_connected: None,
            is_checking_connection: false,

            search_query: String::new(),
            search_level: AdminLevel::KabupatenKota,
            search_province_filter: String::new(),
            search_results: Vec::new(),
            is_searching: false,
            search_error: None,

            selected_region: None,
            region_data: None,
            is_fetching_region: false,
            region_fetch_error: None,

            map_zoom: 1.0,
            map_pan: [0.0, 0.0],
            map_fit_requested: true,
            map_show_basemap: settings.show_basemap,

            selected_formats: default_formats,
            custom_filename: String::new(),
            download_dir,
            is_downloading: false,
            download_progress_msg: String::new(),
            download_progress_val: 0.0,
            last_export_results: Vec::new(),
            cancel_flag: Arc::new(AtomicBool::new(false)),

            history_records,
            notification: None,
        }
    }

    pub fn set_notification(&mut self, msg: impl Into<String>, is_error: bool) {
        self.notification = Some(Notification {
            message: msg.into(),
            is_error,
            created_at: std::time::Instant::now(),
        });
    }

    pub fn clear_stale_notification(&mut self) {
        if let Some(n) = &self.notification {
            if n.created_at.elapsed() > std::time::Duration::from_secs(6) {
                self.notification = None;
            }
        }
    }

    pub fn cancel_current_download(&mut self) {
        self.cancel_flag.store(true, Ordering::Relaxed);
        self.is_downloading = false;
        self.download_progress_msg = "Pengunduhan dibatalkan oleh pengguna".to_string();
        self.set_notification("Operasi pengunduhan dibatalkan", false);
    }

    pub fn reset_cancel_flag(&mut self) {
        self.cancel_flag = Arc::new(AtomicBool::new(false));
    }
}

