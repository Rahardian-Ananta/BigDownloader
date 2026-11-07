use crate::state::{AppState, NavTab};
use crate::ui::{card_frame, render_pill, COLOR_DANGER, COLOR_PRIMARY, COLOR_SUCCESS, COLOR_WARNING};
use egui::{Color32, RichText, Ui};

pub fn render(ui: &mut Ui, state: &mut AppState, check_connection_trigger: &mut bool) {
    ui.add_space(8.0);

    // Hero Header
    ui.horizontal(|ui| {
        ui.heading(
            RichText::new("🗺️ BIG Downloader")
                .size(24.0)
                .strong()
                .color(COLOR_PRIMARY),
        );
        ui.label(
            RichText::new("v0.1.0")
                .size(12.0)
                .color(Color32::from_rgb(140, 145, 155)),
        );
    });

    ui.label(
        RichText::new("Aplikasi desktop native untuk mencari, melihat, mengunduh, dan mengonversi data batas wilayah administratif resmi Badan Informasi Geospasial (BIG).")
            .size(13.0)
            .color(ui.visuals().text_color()),
    );

    ui.add_space(16.0);

    // Connection Status Card
    card_frame(ui).show(ui, |ui| {
        ui.horizontal(|ui| {
            ui.label(RichText::new("Status Koneksi Server BIG:").strong().size(13.0));

            match state.api_connected {
                Some(true) => {
                    render_pill(ui, "ONLINE (TERHUBUNG)", Color32::from_rgb(20, 60, 30), COLOR_SUCCESS);
                }
                Some(false) => {
                    render_pill(ui, "OFFLINE / TIMEOUT", Color32::from_rgb(60, 20, 20), COLOR_DANGER);
                }
                None => {
                    if state.is_checking_connection {
                        render_pill(ui, "MEMERIKSA...", Color32::from_rgb(50, 40, 20), COLOR_WARNING);
                    } else {
                        render_pill(ui, "BELUM DIPERIKSA", Color32::from_rgb(40, 40, 45), Color32::LIGHT_GRAY);
                    }
                }
            }

            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                if ui.button("🔄 Periksa Koneksi").clicked() {
                    *check_connection_trigger = true;
                }
            });
        });

        ui.add_space(4.0);
        ui.label(
            RichText::new("Endpoint: https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer")
                .size(11.0)
                .monospace()
                .color(Color32::from_rgb(130, 135, 145)),
        );
    });

    ui.add_space(14.0);

    // Quick Action & Stats Grid
    ui.columns(2, |cols| {
        // Column 1: Quick Search
        card_frame(&cols[0]).show(&mut cols[0], |ui| {
            ui.label(RichText::new("🔍 Mulai Pencarian Wilayah").strong().size(14.0));
            ui.add_space(4.0);
            ui.label("Cari batas wilayah Provinsi, Kabupaten/Kota, atau Kecamatan di seluruh Indonesia.");
            ui.add_space(10.0);
            if ui.button(RichText::new("Buka Pencarian Wilayah ➔").strong().color(COLOR_PRIMARY)).clicked() {
                state.current_tab = NavTab::Search;
            }
        });

        // Column 2: Local Stats
        card_frame(&cols[1]).show(&mut cols[1], |ui| {
            ui.label(RichText::new("📊 Statistik Unduhan Lokal").strong().size(14.0));
            ui.add_space(4.0);
            let count = state.history_records.len();
            ui.label(format!("Total unduhan tersimpan: {} berkas", count));
            if let Some(first) = state.history_records.first() {
                ui.label(
                    RichText::new(format!("Terakhir diunduh: {} ({})", first.region_name, first.export_format))
                        .size(11.0)
                        .color(Color32::from_rgb(130, 135, 145)),
                );
            } else {
                ui.label(
                    RichText::new("Belum ada berkas unduhan di riwayat lokal.")
                        .size(11.0)
                        .color(Color32::from_rgb(130, 135, 145)),
                );
            }
            ui.add_space(10.0);
            if ui.button("Lihat Riwayat Unduhan ➔").clicked() {
                state.current_tab = NavTab::History;
            }
        });
    });

    ui.add_space(14.0);

    // Data Source & Coverage Card
    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("ℹ️ Informasi Sumber Data & Spesifikasi Geospasial").strong().size(14.0));
        ui.add_space(6.0);
        ui.label("• Data resmi Badan Informasi Geospasial (BIG) Republik Indonesia.");
        ui.label("• Geodatabase batas administrasi mengacu pada Permendagri No. 72 Tahun 2019.");
        ui.label("• Layer 0: Batas Wilayah Kabupaten/Kota.");
        ui.label("• Layer 1: Batas Wilayah Kecamatan.");
        ui.label("• Layer Provinsi: Diperoleh secara otomatis melalui proses dissolve/union spasial multi-kabupaten.");
        ui.label("• Sistem Koordinat Referensi (CRS): EPSG:4326 (WGS 84 Koordinat Geografis Bujur/Lintang).");
        ui.label("• Mendukung 8 format ekspor: GeoJSON, Shapefile (ZIP), GeoPackage, KML, CSV, GeoParquet, TopoJSON, dan GML.");
    });
}

