use crate::exporters::ExportFormat;
use crate::state::{AppState, NavTab};
use crate::ui::{card_frame, render_pill, COLOR_DANGER, COLOR_PRIMARY, COLOR_SUCCESS, COLOR_WARNING};
use egui::{Color32, RichText, ScrollArea, Ui};
use std::path::PathBuf;

pub fn render(ui: &mut Ui, state: &mut AppState, trigger_start_download: &mut bool) {
    ui.add_space(8.0);
    ui.heading(RichText::new("📥 Download & Export Manager").size(20.0).strong());
    ui.label("Pilih format data geospasial yang diinginkan untuk diekspor secara lokal.");

    ui.add_space(10.0);

    let region = match &state.selected_region {
        Some(r) => r.clone(),
        None => {
            card_frame(ui).show(ui, |ui| {
                ui.label(RichText::new("Belum ada wilayah yang dipilih.").italics());
                ui.add_space(6.0);
                if ui.button("Pergi ke Halaman Pencarian ➔").clicked() {
                    state.current_tab = NavTab::Search;
                }
            });
            return;
        }
    };

    // Region Information Bar
    card_frame(ui).show(ui, |ui| {
        ui.horizontal(|ui| {
            ui.label(RichText::new("Wilayah Terpilih:").strong());
            ui.label(RichText::new(&region.name).strong().size(15.0));
            render_pill(
                ui,
                region.level.as_str(),
                Color32::from_rgb(25, 50, 75),
                Color32::from_rgb(100, 180, 255),
            );

            if let Some(p) = &region.province {
                ui.label(format!("| Provinsi: {}", p));
            }
            if let Some(r) = &region.regency {
                ui.label(format!("| Kab/Kota: {}", r));
            }
        });
    });

    ui.add_space(10.0);

    // Export Options Card
    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("⚙️ Konfigurasi Berkas & Direktori Penyimpanan").strong().size(14.0));
        ui.add_space(6.0);

        ui.horizontal(|ui| {
            ui.label(RichText::new("Nama Berkas:").strong());
            ui.add(
                egui::TextEdit::singleline(&mut state.custom_filename)
                    .hint_text("Nama berkas ekspor")
                    .desired_width(260.0),
            );
        });

        ui.add_space(4.0);

        ui.horizontal(|ui| {
            ui.label(RichText::new("Folder Tujuan:").strong());
            let dir_display = state.download_dir.to_string_lossy().to_string();
            ui.label(RichText::new(dir_display).monospace().color(Color32::from_rgb(120, 150, 200)));

            if ui.button("📁 Pilih Folder...").clicked() {
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

    // Format Selector Card
    card_frame(ui).show(ui, |ui| {
        ui.horizontal(|ui| {
            ui.label(RichText::new("📦 Format Ekspor yang Didukung (Bisa pilih lebih dari satu):").strong().size(14.0));

            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                if ui.button("Kosongkan").clicked() {
                    state.selected_formats.clear();
                }
                if ui.button("Pilih Semua (8 Format)").clicked() {
                    for fmt in ExportFormat::ALL {
                        state.selected_formats.insert(fmt);
                    }
                }
            });
        });

        ui.add_space(8.0);

        egui::Grid::new("export_formats_grid")
            .num_columns(2)
            .spacing([24.0, 8.0])
            .show(ui, |ui| {
                for fmt in ExportFormat::ALL {
                    let mut is_checked = state.selected_formats.contains(&fmt);
                    if ui.checkbox(&mut is_checked, fmt.display_name()).changed() {
                        if is_checked {
                            state.selected_formats.insert(fmt);
                        } else {
                            state.selected_formats.remove(&fmt);
                        }
                    }
                    ui.label(
                        RichText::new(fmt.description())
                            .size(11.0)
                            .color(Color32::from_rgb(130, 135, 145)),
                    );
                    ui.end_row();
                }
            });
    });

    ui.add_space(12.0);

    // Action & Progress Bar Area
    card_frame(ui).show(ui, |ui| {
        if state.is_downloading {
            ui.horizontal(|ui| {
                ui.spinner();
                ui.label(RichText::new(&state.download_progress_msg).strong());
            });
            ui.add_space(4.0);
            ui.add(
                egui::ProgressBar::new(state.download_progress_val)
                    .show_percentage()
                    .animate(true),
            );
            ui.add_space(8.0);
            if ui.button(RichText::new("⏹️ Batalkan Proses").color(COLOR_DANGER)).clicked() {
                state.cancel_current_download();
            }
        } else {
            let can_download = !state.selected_formats.is_empty();
            let btn_text = if can_download {
                format!("🚀 Unduh & Konversi ({} Format)", state.selected_formats.len())
            } else {
                "Pilih minimal 1 format ekspor".to_string()
            };

            ui.horizontal(|ui| {
                let btn = ui.add_enabled(
                    can_download,
                    egui::Button::new(RichText::new(btn_text).strong().size(15.0).color(Color32::WHITE))
                        .fill(COLOR_PRIMARY),
                );
                if btn.clicked() {
                    *trigger_start_download = true;
                }
            });
        }
    });

    // Recent Export Results
    if !state.last_export_results.is_empty() {
        ui.add_space(10.0);
        ui.label(RichText::new("📄 Berkas Hasil Ekspor:").strong().size(14.0));
        ui.add_space(4.0);

        ScrollArea::vertical().max_height(200.0).show(ui, |ui| {
            for res in &state.last_export_results {
                card_frame(ui).show(ui, |ui| {
                    ui.horizontal(|ui| {
                        if res.success {
                            render_pill(ui, "BERHASIL", Color32::from_rgb(20, 60, 30), COLOR_SUCCESS);
                            ui.label(RichText::new(res.format.display_name()).strong());
                            if let Some(size) = res.file_size_bytes {
                                ui.label(format!("({:.2} KB)", size as f64 / 1024.0));
                            }
                            ui.label(
                                RichText::new(res.output_path.to_string_lossy())
                                    .size(11.0)
                                    .monospace()
                                    .color(Color32::from_rgb(130, 135, 145)),
                            );
                        } else {
                            render_pill(ui, "GAGAL", Color32::from_rgb(60, 20, 20), COLOR_DANGER);
                            ui.label(RichText::new(res.format.display_name()).strong());
                            if let Some(err) = &res.error_message {
                                ui.label(RichText::new(err).color(COLOR_DANGER).size(11.0));
                            }
                        }

                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            if res.success && ui.button("Buka Folder").clicked() {
                                open_folder_containing(&res.output_path);
                            }
                        });
                    });
                });
                ui.add_space(4.0);
            }
        });
    }
}

pub fn open_folder_containing(path: &PathBuf) {
    if let Some(parent) = path.parent() {
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("explorer")
                .arg(parent)
                .spawn();
        }
        #[cfg(target_os = "linux")]
        {
            let _ = std::process::Command::new("xdg-open")
                .arg(parent)
                .spawn();
        }
        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("open")
                .arg(parent)
                .spawn();
        }
    }
}
