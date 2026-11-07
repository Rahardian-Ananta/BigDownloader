#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod core;
mod database;
mod exporters;
mod state;
mod ui;
mod utils;

use app::BigDownloaderApp;
use database::Database;
use eframe::NativeOptions;
use std::sync::Arc;

fn main() -> eframe::Result<()> {
    // Initialize OS paths & logging
    let log_dir = utils::paths::get_log_dir();
    let _guard = utils::logger::init_logger(log_dir);

    tracing::info!("Starting BIG Downloader desktop application...");

    // Initialize SQLite database
    let db_path = utils::paths::get_db_path();
    let db = Database::open(&db_path).unwrap_or_else(|err| {
        tracing::error!("Failed to open database at {:?}: {}. Falling back to in-memory.", db_path, err);
        Database::open_in_memory().expect("In-memory database must succeed")
    });
    let db_arc = Arc::new(db);

    // Start background Tokio runtime for async BIG API HTTP requests
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Failed to initialize Tokio runtime");

    let _enter = rt.enter();

    let native_options = NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title("BIG Downloader — Indonesia Administrative Boundary Data")
            .with_inner_size([1120.0, 720.0])
            .with_min_inner_size([920.0, 580.0])
            .with_active(true),
        ..Default::default()
    };

    eframe::run_native(
        "BIG Downloader",
        native_options,
        Box::new(move |cc| Ok(Box::new(BigDownloaderApp::new(cc, db_arc)))),
    )
}

