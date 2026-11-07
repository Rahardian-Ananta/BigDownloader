use crate::state::{AppState, NavTab};
use crate::ui::{card_frame, render_pill, COLOR_PRIMARY, COLOR_SUCCESS, COLOR_WARNING};
use egui::{Color32, RichText, Ui};

pub fn render(ui: &mut Ui, state: &mut AppState, trigger_fetch_region: &mut bool) {
    ui.add_space(8.0);

    let item = match &state.selected_region {
        Some(item) => item.clone(),
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

    ui.horizontal(|ui| {
        ui.heading(RichText::new(&item.name).size(22.0).strong());
        render_pill(
            ui,
            item.level.as_str(),
            Color32::from_rgb(25, 50, 75),
            Color32::from_rgb(100, 180, 255),
        );

        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            if ui.button(RichText::new("📥 Unduh Wilayah Ini").strong().color(COLOR_SUCCESS)).clicked() {
                state.current_tab = NavTab::Downloads;
            }
            if ui.button(RichText::new("🗺️ Lihat di Peta").color(COLOR_PRIMARY)).clicked() {
                state.current_tab = NavTab::MapPreview;
            }
            if ui.button("🔄 Refresh Data").clicked() {
                *trigger_fetch_region = true;
            }
        });
    });

    ui.add_space(10.0);

    if state.is_fetching_region {
        card_frame(ui).show(ui, |ui| {
            ui.horizontal(|ui| {
                ui.spinner();
                ui.label(RichText::new("Mengunduh geometri wilayah dari server BIG...").color(COLOR_WARNING));
            });
        });
        ui.add_space(8.0);
    }

    if let Some(err) = &state.region_fetch_error {
        card_frame(ui).show(ui, |ui| {
            ui.label(RichText::new(format!("⚠️ Gagal mengambil geometri: {}", err)).color(Color32::from_rgb(255, 90, 90)));
        });
        ui.add_space(8.0);
    }

    // Detail Specifications Grid
    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("📋 Rincian Atribut & Data Spasial").strong().size(15.0));
        ui.add_space(8.0);

        egui::Grid::new("region_details_grid")
            .num_columns(2)
            .spacing([24.0, 8.0])
            .striped(true)
            .show(ui, |ui| {
                ui.label(RichText::new("Tingkat Administrasi:").strong());
                ui.label(item.level.to_string());
                ui.end_row();

                if let Some(p) = &item.province {
                    ui.label(RichText::new("Provinsi:").strong());
                    ui.label(p);
                    ui.end_row();
                }

                if let Some(r) = &item.regency {
                    ui.label(RichText::new("Kabupaten / Kota:").strong());
                    ui.label(r);
                    ui.end_row();
                }

                ui.label(RichText::new("Kode Wilayah PUM:").strong());
                ui.label(item.code.as_deref().unwrap_or("-"));
                ui.end_row();

                ui.label(RichText::new("Sistem Referensi Koordinat:").strong());
                ui.label("EPSG:4326 (WGS 84 Koordinat Geografis)");
                ui.end_row();

                if let Some(data) = &state.region_data {
                    ui.label(RichText::new("Jumlah Fitur:").strong());
                    ui.label(format!("{} fitur", data.feature_count));
                    ui.end_row();

                    ui.label(RichText::new("Tipe Geometri:").strong());
                    ui.label("MultiPolygon (Mendukung multipart & kepulauan)");
                    ui.end_row();

                    ui.label(RichText::new("Total Titik Koordinat:").strong());
                    ui.label(format!("{} verteks", data.total_points));
                    ui.end_row();

                    ui.label(RichText::new("Bounding Box (Bujur/Lintang):").strong());
                    ui.label(format!(
                        "[{:.4}, {:.4}] s/d [{:.4}, {:.4}]",
                        data.bbox.min_x, data.bbox.min_y, data.bbox.max_x, data.bbox.max_y
                    ));
                    ui.end_row();

                    ui.label(RichText::new("Titik Titik Pusat (Centroid):").strong());
                    ui.label(format!("{:.5}° T, {:.5}° U", data.centroid.0, data.centroid.1));
                    ui.end_row();
                }
            });
    });

    ui.add_space(14.0);

    // Map Quick View Box
    card_frame(ui).show(ui, |ui| {
        ui.horizontal(|ui| {
            ui.label(RichText::new("🗺️ Preview Peta Geometri").strong().size(14.0));
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                if ui.button("Perbesar Peta Penuh ➔").clicked() {
                    state.current_tab = NavTab::MapPreview;
                }
            });
        });
        ui.add_space(6.0);
        if state.region_data.is_some() {
            ui.label("Geometri batas wilayah berhasil dimuat dan siap dipratinjau atau diekspor ke 8 format.");
        } else {
            ui.label(RichText::new("Geometri belum selesai diunduh. Tunggu sejenak atau klik 'Refresh Data'.").italics());
        }
    });
}

