use crate::core::big_api::BigApiClient;
use crate::core::downloader::{DownloadedRegionData, RegionDownloader};
use crate::core::search::{RegionItem, SearchEngine};
use crate::database::history::NewDownloadRecord;
use crate::database::Database;
use crate::exporters::{export_single, ExportFormat, ExportTaskResult};
use crate::state::{AppState, NavTab};
use crate::ui::{COLOR_DANGER, COLOR_PRIMARY, COLOR_SUCCESS};
use eframe::App;
use egui::{CentralPanel, Color32, Context, RichText, SidePanel};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Arc;

enum AppEvent {
    ConnectionCheckResult(bool),
    SearchResults(Result<Vec<RegionItem>, String>),
    RegionFetchResult(Result<DownloadedRegionData, String>),
    DownloadProgress { msg: String, val: f32 },
    DownloadComplete(Vec<ExportTaskResult>),
}

pub struct BigDownloaderApp {
    state: AppState,
    db: Arc<Database>,
    api: Arc<BigApiClient>,
    event_tx: Sender<AppEvent>,
    event_rx: Receiver<AppEvent>,
}

impl BigDownloaderApp {
    pub fn new(cc: &eframe::CreationContext<'_>, db: Arc<Database>) -> Self {
        let (event_tx, event_rx) = channel();

        let state = AppState::new(&db);
        let api = Arc::new(BigApiClient::new(
            state.settings.http_timeout_secs,
            state.settings.retry_count,
        ));

        if state.settings.dark_theme {
            cc.egui_ctx.set_visuals(egui::Visuals::dark());
        } else {
            cc.egui_ctx.set_visuals(egui::Visuals::light());
        }

        let mut app = Self {
            state,
            db,
            api,
            event_tx,
            event_rx,
        };

        // Automatically trigger connection check on startup
        app.check_api_connection();

        app
    }

    fn check_api_connection(&mut self) {
        self.state.is_checking_connection = true;
        let api = Arc::clone(&self.api);
        let tx = self.event_tx.clone();

        tokio::spawn(async move {
            let ok = api.check_health().await.unwrap_or(false);
            let _ = tx.send(AppEvent::ConnectionCheckResult(ok));
        });
    }

    fn perform_search(&mut self) {
        self.state.is_searching = true;
        self.state.search_error = None;
        let api = Arc::clone(&self.api);
        let tx = self.event_tx.clone();
        let query = self.state.search_query.clone();
        let level = self.state.search_level;
        let pf = if self.state.search_province_filter.trim().is_empty() {
            None
        } else {
            Some(self.state.search_province_filter.trim().to_string())
        };

        tokio::spawn(async move {
            let engine = SearchEngine::new(&api);
            let res = engine
                .search(&query, level, pf.as_deref(), 0, 100)
                .await;
            let _ = tx.send(AppEvent::SearchResults(res));
        });
    }

    fn fetch_selected_region_geometry(&mut self) {
        let item = match &self.state.selected_region {
            Some(it) => it.clone(),
            None => return,
        };

        self.state.is_fetching_region = true;
        self.state.region_fetch_error = None;
        self.state.reset_cancel_flag();

        let api = Arc::clone(&self.api);
        let tx = self.event_tx.clone();
        let cancel_flag = Arc::clone(&self.state.cancel_flag);

        tokio::spawn(async move {
            let downloader = RegionDownloader::new(&api, cancel_flag);
            let res = downloader
                .download_region(&item, |_, _| {})
                .await;
            let _ = tx.send(AppEvent::RegionFetchResult(res));
        });
    }

    fn start_download_and_export(&mut self) {
        let item = match &self.state.selected_region {
            Some(it) => it.clone(),
            None => return,
        };

        let formats: Vec<ExportFormat> = self.state.selected_formats.iter().copied().collect();
        if formats.is_empty() {
            self.state
                .set_notification("Pilih minimal satu format ekspor", true);
            return;
        }

        self.state.is_downloading = true;
        self.state.download_progress_val = 0.05;
        self.state.download_progress_msg = "Menyiapkan pengunduhan data...".to_string();
        self.state.last_export_results.clear();
        self.state.reset_cancel_flag();

        let api = Arc::clone(&self.api);
        let tx = self.event_tx.clone();
        let cancel_flag = Arc::clone(&self.state.cancel_flag);
        let out_dir = self.state.download_dir.clone();
        let custom_name = if self.state.custom_filename.trim().is_empty() {
            None
        } else {
            Some(self.state.custom_filename.trim().to_string())
        };

        // If geometry is already downloaded, export directly! Otherwise fetch first.
        let existing_data = self.state.region_data.clone();

        tokio::spawn(async move {
            let data = match existing_data {
                Some(d) => d,
                None => {
                    let downloader = RegionDownloader::new(&api, Arc::clone(&cancel_flag));
                    let tx_progress = tx.clone();
                    let fetch_res = downloader
                        .download_region(&item, move |msg, val| {
                            let _ = tx_progress.send(AppEvent::DownloadProgress {
                                msg: msg.to_string(),
                                val,
                            });
                        })
                        .await;

                    match fetch_res {
                        Ok(d) => d,
                        Err(e) => {
                            let _ = tx.send(AppEvent::DownloadComplete(vec![ExportTaskResult {
                                format: ExportFormat::GeoJSON,
                                output_path: out_dir.clone(),
                                file_size_bytes: None,
                                success: false,
                                error_message: Some(e),
                            }]));
                            return;
                        }
                    }
                }
            };

            let mut results = Vec::new();
            let total = formats.len();

            for (i, fmt) in formats.into_iter().enumerate() {
                if cancel_flag.load(std::sync::atomic::Ordering::Relaxed) {
                    break;
                }

                let p_val = 0.8 + ((i as f32 / total as f32) * 0.2);
                let _ = tx.send(AppEvent::DownloadProgress {
                    msg: format!("Mengekspor format {}...", fmt.display_name()),
                    val: p_val,
                });

                let res = export_single(fmt, &data, &out_dir, custom_name.as_deref());
                results.push(res);
            }

            let _ = tx.send(AppEvent::DownloadComplete(results));
        });
    }

    fn process_events(&mut self) {
        while let Ok(event) = self.event_rx.try_recv() {
            match event {
                AppEvent::ConnectionCheckResult(connected) => {
                    self.state.api_connected = Some(connected);
                    self.state.is_checking_connection = false;
                    if connected {
                        self.state.set_notification("Koneksi ke BIG MapServer aktif", false);
                    } else {
                        self.state.set_notification(
                            "Gagal terhubung ke BIG MapServer. Periksa koneksi internet.",
                            true,
                        );
                    }
                }
                AppEvent::SearchResults(res) => {
                    self.state.is_searching = false;
                    match res {
                        Ok(items) => {
                            self.state.search_results = items;
                            self.state.search_error = None;
                        }
                        Err(err) => {
                            self.state.search_error = Some(err.clone());
                            self.state.set_notification(err, true);
                        }
                    }
                }
                AppEvent::RegionFetchResult(res) => {
                    self.state.is_fetching_region = false;
                    match res {
                        Ok(data) => {
                            self.state.region_data = Some(data);
                            self.state.region_fetch_error = None;
                            self.state.map_fit_requested = true;
                            self.state
                                .set_notification("Geometri wilayah berhasil dimuat", false);
                        }
                        Err(err) => {
                            self.state.region_fetch_error = Some(err.clone());
                            self.state.set_notification(err, true);
                        }
                    }
                }
                AppEvent::DownloadProgress { msg, val } => {
                    self.state.download_progress_msg = msg;
                    self.state.download_progress_val = val;
                }
                AppEvent::DownloadComplete(results) => {
                    self.state.is_downloading = false;
                    self.state.download_progress_val = 1.0;
                    self.state.download_progress_msg = "Selesai".to_string();

                    // Save successes to database history
                    let item_opt = self.state.selected_region.clone();
                    for r in &results {
                        if r.success {
                            if let Some(item) = &item_opt {
                                let new_rec = NewDownloadRecord {
                                    region_name: item.name.clone(),
                                    admin_level: item.level.to_string(),
                                    regency: item.regency.clone(),
                                    province: item.province.clone(),
                                    export_format: r.format.display_name().to_string(),
                                    output_path: r.output_path.to_string_lossy().to_string(),
                                    status: "Selesai".to_string(),
                                    file_size_bytes: r.file_size_bytes.map(|s| s as i64),
                                };
                                let _ = self.db.history().insert(&new_rec);
                            }
                        }
                    }

                    // Reload history
                    if let Ok(records) = self.db.history().get_all() {
                        self.state.history_records = records;
                    }

                    let success_count = results.iter().filter(|r| r.success).count();
                    let total = results.len();

                    self.state.last_export_results = results;

                    if success_count == total && total > 0 {
                        self.state.set_notification(
                            format!("Berhasil mengekspor seluruh {} format!", total),
                            false,
                        );
                    } else if success_count > 0 {
                        self.state.set_notification(
                            format!(
                                "Ekspor selesai: {} berhasil, {} gagal.",
                                success_count,
                                total - success_count
                            ),
                            false,
                        );
                    } else {
                        self.state
                            .set_notification("Pengunduhan atau konversi gagal.", true);
                    }
                }
            }
        }
    }
}

impl App for BigDownloaderApp {
    fn update(&mut self, ctx: &Context, _frame: &mut eframe::Frame) {
        self.process_events();
        self.state.clear_stale_notification();

        // Left Navigation Sidebar
        SidePanel::left("left_nav_panel")
            .resizable(false)
            .default_width(210.0)
            .show(ctx, |ui| {
                ui.add_space(10.0);

                // Branding Header
                ui.horizontal(|ui| {
                    ui.label(
                        RichText::new("🗺️ BIG Downloader")
                            .size(17.0)
                            .strong()
                            .color(COLOR_PRIMARY),
                    );
                });
                ui.label(
                    RichText::new("Batas Administrasi Indonesia")
                        .size(10.5)
                        .color(Color32::from_rgb(130, 135, 145)),
                );

                ui.add_space(16.0);
                ui.separator();
                ui.add_space(8.0);

                // Navigation Buttons
                let nav_items = [
                    (NavTab::Dashboard, "📊 Dashboard"),
                    (NavTab::Search, "🔍 Cari Wilayah"),
                    (NavTab::RegionDetail, "📋 Detail Wilayah"),
                    (NavTab::MapPreview, "🗺️ Pratinjau Peta"),
                    (NavTab::Downloads, "📥 Unduh & Ekspor"),
                    (NavTab::History, "📜 Riwayat Unduhan"),
                    (NavTab::Settings, "⚙️ Pengaturan"),
                    (NavTab::About, "ℹ️ Tentang Aplikasi"),
                ];

                for (tab, label) in nav_items {
                    let is_selected = self.state.current_tab == tab;
                    let text = if is_selected {
                        RichText::new(label).strong().color(COLOR_PRIMARY)
                    } else {
                        RichText::new(label)
                    };

                    let btn = ui.add_sized(
                        [ui.available_width(), 32.0],
                        egui::SelectableLabel::new(is_selected, text),
                    );

                    if btn.clicked() {
                        self.state.current_tab = tab;
                    }
                }

                // Footer Status
                ui.with_layout(egui::Layout::bottom_up(egui::Align::LEFT), |ui| {
                    ui.add_space(8.0);
                    ui.horizontal(|ui| {
                        let dot_color = match self.state.api_connected {
                            Some(true) => COLOR_SUCCESS,
                            Some(false) => COLOR_DANGER,
                            None => Color32::GRAY,
                        };
                        ui.label(RichText::new("●").color(dot_color).size(12.0));
                        ui.label(
                            RichText::new(match self.state.api_connected {
                                Some(true) => "Server BIG: Aktif",
                                Some(false) => "Server BIG: Terputus",
                                None => "Server BIG: Memeriksa...",
                            })
                            .size(11.0)
                            .color(Color32::from_rgb(130, 135, 145)),
                        );
                    });
                });
            });

        // Main Center Content Panel
        CentralPanel::default().show(ctx, |ui| {
            // Notification Banner Toast if present
            if let Some(notif) = &self.state.notification {
                let bg = if notif.is_error {
                    Color32::from_rgb(80, 25, 25)
                } else {
                    Color32::from_rgb(25, 60, 35)
                };
                let border = if notif.is_error {
                    COLOR_DANGER
                } else {
                    COLOR_SUCCESS
                };

                egui::Frame::none()
                    .fill(bg)
                    .stroke(egui::Stroke::new(1.0_f32, border))
                    .rounding(egui::Rounding::same(6.0))
                    .inner_margin(egui::Margin::symmetric(12.0, 8.0))
                    .show(ui, |ui| {
                        ui.horizontal(|ui| {
                            let icon = if notif.is_error { "⚠️" } else { "✅" };
                            ui.label(RichText::new(icon).size(14.0));
                            ui.label(RichText::new(&notif.message).strong().size(13.0));
                        });
                    });
                ui.add_space(6.0);
            }

            let mut check_conn = false;
            let mut trigger_search = false;
            let mut trigger_fetch_region = false;
            let mut trigger_start_download = false;

            match self.state.current_tab {
                NavTab::Dashboard => {
                    crate::ui::dashboard::render(ui, &mut self.state, &mut check_conn);
                }
                NavTab::Search => {
                    crate::ui::search::render(
                        ui,
                        &mut self.state,
                        &mut trigger_search,
                        &mut trigger_fetch_region,
                    );
                }
                NavTab::RegionDetail => {
                    crate::ui::region_detail::render(ui, &mut self.state, &mut trigger_fetch_region);
                }
                NavTab::MapPreview => {
                    crate::ui::map_preview::render(ui, &mut self.state);
                }
                NavTab::Downloads => {
                    crate::ui::downloads::render(ui, &mut self.state, &mut trigger_start_download);
                }
                NavTab::History => {
                    crate::ui::history::render(ui, &mut self.state, &self.db);
                }
                NavTab::Settings => {
                    crate::ui::settings::render(ui, &mut self.state, &self.db);
                }
                NavTab::About => {
                    crate::ui::about::render(ui);
                }
            }

            if check_conn {
                self.check_api_connection();
            }
            if trigger_search {
                self.perform_search();
            }
            if trigger_fetch_region {
                self.fetch_selected_region_geometry();
            }
            if trigger_start_download {
                self.start_download_and_export();
            }
        });

        // Keep UI refreshing during downloads or background queries
        if self.state.is_downloading
            || self.state.is_searching
            || self.state.is_fetching_region
            || self.state.is_checking_connection
        {
            ctx.request_repaint_after(std::time::Duration::from_millis(100));
        }
    }
}

