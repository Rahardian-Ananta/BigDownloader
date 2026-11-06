use crate::database::Database;
use crate::state::AppState;
use crate::ui::{card_frame, render_pill, COLOR_DANGER, COLOR_PRIMARY, COLOR_SUCCESS};
use egui::{Color32, RichText, ScrollArea, Ui};
use std::path::PathBuf;

pub fn render(ui: &mut Ui, state: &mut AppState, db: &Database) {
    ui.add_space(8.0);

    ui.horizontal(|ui| {
        ui.heading(RichText::new("📜 Riwayat Unduhan Lokal").size(20.0).strong());
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            if !state.history_records.is_empty()
                && ui.button(RichText::new("🗑️ Kosongkan Riwayat").color(COLOR_DANGER)).clicked()
            {
                if let Ok(_) = db.history().clear_all() {
                    state.history_records.clear();
                    state.set_notification("Seluruh riwayat unduhan berhasil dibersihkan", false);
                }
            }
        });
    });

    ui.label("Riwayat pengunduhan data batas wilayah yang tersimpan dalam basis data lokal SQLite.");
    ui.add_space(10.0);

    if state.history_records.is_empty() {
        card_frame(ui).show(ui, |ui| {
            ui.label(RichText::new("Belum ada riwayat unduhan.").italics());
        });
        return;
    }

    ScrollArea::vertical().max_height(520.0).show(ui, |ui| {
        let mut id_to_delete: Option<i64> = None;

        for rec in &state.history_records {
            let path = PathBuf::from(&rec.output_path);
            let file_exists = path.exists();

            card_frame(ui).show(ui, |ui| {
                ui.horizontal(|ui| {
                    ui.vertical(|ui| {
                        ui.horizontal(|ui| {
                            ui.label(RichText::new(&rec.region_name).strong().size(15.0));
                            render_pill(
                                ui,
                                &rec.export_format,
                                Color32::from_rgb(25, 45, 65),
                                Color32::from_rgb(100, 190, 255),
                            );
                            render_pill(
                                ui,
                                &rec.admin_level,
                                Color32::from_rgb(30, 40, 30),
                                Color32::from_rgb(140, 210, 140),
                            );

                            if file_exists {
                                render_pill(ui, "BERKAS ADA", Color32::from_rgb(20, 50, 25), COLOR_SUCCESS);
                            } else {
                                render_pill(ui, "BERKAS TERHAPUS/PINDAH", Color32::from_rgb(50, 30, 25), COLOR_DANGER);
                            }
                        });

                        ui.add_space(2.0);
                        let date_str = rec.timestamp.format("%Y-%m-%d %H:%M:%S UTC").to_string();
                        let size_str = rec
                            .file_size_bytes
                            .map(|s| format!("{:.2} KB", s as f64 / 1024.0))
                            .unwrap_or_else(|| "-".to_string());

                        ui.label(
                            RichText::new(format!("Waktu: {}  |  Ukuran: {}  |  Lokasi: {}", date_str, size_str, rec.output_path))
                                .size(11.0)
                                .color(Color32::from_rgb(130, 135, 145)),
                        );
                    });

                    // Action buttons
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        if ui.button("❌ Hapus").clicked() {
                            id_to_delete = Some(rec.id);
                        }

                        if file_exists {
                            if ui.button("📁 Buka Folder").clicked() {
                                crate::ui::downloads::open_folder_containing(&path);
                            }
                            if ui.button("📄 Buka File").clicked() {
                                open_file(&path);
                            }
                        }
                    });
                });
            });
            ui.add_space(4.0);
        }

        if let Some(id) = id_to_delete {
            if let Ok(_) = db.history().delete(id) {
                state.history_records.retain(|r| r.id != id);
                state.set_notification("Catatan riwayat dihapus", false);
            }
        }
    });
}

fn open_file(path: &PathBuf) {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", &path.to_string_lossy()])
            .spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(path)
            .spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg(path)
            .spawn();
    }
}
