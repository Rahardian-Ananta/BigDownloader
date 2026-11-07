use crate::database::Database;
use crate::state::AppState;
use crate::ui::{card_frame, COLOR_PRIMARY, COLOR_SUCCESS};
use egui::{Color32, RichText, Ui};

pub fn render(ui: &mut Ui, state: &mut AppState, db: &Database) {
    ui.add_space(8.0);
    ui.heading(RichText::new("⚙️ Pengaturan Aplikasi").size(20.0).strong());
    ui.label("Konfigurasi preferensi penyimpanan, tema antarmuka, dan jaringan BIG API.");

    ui.add_space(12.0);

    // Storage Settings Card
    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("📁 Direktori Penyimpanan Default").strong().size(14.0));
        ui.add_space(6.0);

        ui.horizontal(|ui| {
            let dir_str = state.download_dir.to_string_lossy().to_string();
            ui.label(RichText::new(dir_str).monospace().color(Color32::from_rgb(120, 160, 220)));

            if ui.button("Ganti Folder...").clicked() {
                if let Some(folder) = rfd::FileDialog::new()
                    .set_directory(&state.download_dir)
                    .pick_folder()
                {
                    state.download_dir = folder.clone();
                    state.settings.download_dir = folder.to_string_lossy().to_string();
                }
            }
        });
    });

    ui.add_space(10.0);

    // Appearance & Theme Card
    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("🎨 Tema Antarmuka Pengguna").strong().size(14.0));
        ui.add_space(6.0);

        ui.horizontal(|ui| {
            if ui.radio(state.settings.dark_theme, "🌙 Tema Gelap (Dark Mode)").clicked() {
                state.settings.dark_theme = true;
                ui.ctx().set_visuals(egui::Visuals::dark());
            }
            if ui.radio(!state.settings.dark_theme, "☀️ Tema Terang (Light Mode)").clicked() {
                state.settings.dark_theme = false;
                ui.ctx().set_visuals(egui::Visuals::light());
            }
        });
    });

    ui.add_space(10.0);

    // Network & HTTP Settings Card
    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("🌐 Pengaturan Jaringan & Koneksi BIG API").strong().size(14.0));
        ui.add_space(6.0);

        egui::Grid::new("network_settings_grid")
            .num_columns(2)
            .spacing([20.0, 8.0])
            .show(ui, |ui| {
                ui.label("HTTP Timeout (detik):");
                ui.add(egui::DragValue::new(&mut state.settings.http_timeout_secs).range(10..=300));
                ui.end_row();

                ui.label("Jumlah Percobaan Ulang (Retry Count):");
                ui.add(egui::DragValue::new(&mut state.settings.retry_count).range(0..=10));
                ui.end_row();

                ui.label("Tampilkan Basemap Grid secara Default:");
                ui.checkbox(&mut state.settings.show_basemap, "");
                ui.end_row();
            });
    });

    ui.add_space(10.0);

    // Diagnostics & File Paths Card
    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("🔍 Informasi Lokasi Berkas Sistem").strong().size(14.0));
        ui.add_space(6.0);

        let db_path = crate::utils::paths::get_db_path().to_string_lossy().to_string();
        let log_dir = crate::utils::paths::get_log_dir().to_string_lossy().to_string();

        ui.label(format!("• Basis Data SQLite: {}", db_path));
        ui.label(format!("• Direktori Berkas Log: {}", log_dir));
    });

    ui.add_space(14.0);

    // Save Button
    if ui.button(RichText::new("💾 Simpan Pengaturan").strong().size(14.0).color(Color32::WHITE)).clicked() {
        if let Ok(_) = db.settings().save_settings(&state.settings) {
            state.set_notification("Pengaturan berhasil disimpan ke basis data lokal", false);
        } else {
            state.set_notification("Gagal menyimpan pengaturan ke basis data", true);
        }
    }
}

