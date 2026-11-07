use crate::core::metadata::AdminLevel;
use crate::state::{AppState, NavTab};
use crate::ui::{card_frame, render_pill, COLOR_PRIMARY, COLOR_WARNING};
use egui::{Color32, RichText, ScrollArea, Ui};

pub fn render(
    ui: &mut Ui,
    state: &mut AppState,
    trigger_search: &mut bool,
    trigger_fetch_region: &mut bool,
) {
    ui.add_space(8.0);
    ui.heading(RichText::new("🔍 Pencarian Batas Wilayah").size(20.0).strong());
    ui.label("Cari batas wilayah administratif Indonesia berdasarkan nama, tingkat, dan hierarki provinsi.");

    ui.add_space(12.0);

    // Search Controls Card
    card_frame(ui).show(ui, |ui| {
        ui.horizontal(|ui| {
            ui.label(RichText::new("Tingkat Administrasi:").strong());
            ui.radio_value(&mut state.search_level, AdminLevel::Provinsi, "Provinsi");
            ui.radio_value(&mut state.search_level, AdminLevel::KabupatenKota, "Kabupaten / Kota");
            ui.radio_value(&mut state.search_level, AdminLevel::Kecamatan, "Kecamatan");
        });

        ui.add_space(8.0);

        ui.horizontal(|ui| {
            ui.label(RichText::new("Nama Wilayah:").strong());
            let response = ui.add(
                egui::TextEdit::singleline(&mut state.search_query)
                    .hint_text("Contoh: Sidoarjo, Bandung, Jawa Barat, Majene...")
                    .desired_width(280.0),
            );
            if response.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter)) {
                *trigger_search = true;
            }

            if state.search_level != AdminLevel::Provinsi {
                ui.label(RichText::new("Filter Provinsi:").strong());
                let resp_p = ui.add(
                    egui::TextEdit::singleline(&mut state.search_province_filter)
                        .hint_text("Opsional: Jawa Timur, dsb.")
                        .desired_width(180.0),
                );
                if resp_p.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter)) {
                    *trigger_search = true;
                }
            }

            if ui.button(RichText::new("🔍 Cari").strong().color(COLOR_PRIMARY)).clicked() {
                *trigger_search = true;
            }

            if ui.button("🧹 Bersihkan").clicked() {
                state.search_query.clear();
                state.search_province_filter.clear();
                state.search_results.clear();
                state.search_error = None;
            }
        });
    });

    ui.add_space(10.0);

    if state.is_searching {
        ui.horizontal(|ui| {
            ui.spinner();
            ui.label(RichText::new("Sedang mencari data dari server BIG...").color(COLOR_WARNING));
        });
        ui.add_space(6.0);
    }

    if let Some(err) = &state.search_error {
        card_frame(ui).show(ui, |ui| {
            ui.label(RichText::new(format!("⚠️ Kesalahan pencarian: {}", err)).color(Color32::from_rgb(255, 90, 90)));
        });
        ui.add_space(6.0);
    }

    // Search Results Section
    ui.horizontal(|ui| {
        ui.label(
            RichText::new(format!("Hasil Pencarian ({} wilayah)", state.search_results.len()))
                .strong()
                .size(14.0),
        );
    });

    ui.add_space(6.0);

    ScrollArea::vertical().max_height(480.0).show(ui, |ui| {
        if state.search_results.is_empty() {
            if !state.is_searching {
                card_frame(ui).show(ui, |ui| {
                    ui.label(RichText::new("Belum ada hasil. Masukkan kata kunci pencarian lalu klik 'Cari'.").italics());
                });
            }
        } else {
            for item in state.search_results.clone() {
                card_frame(ui).show(ui, |ui| {
                    ui.horizontal(|ui| {
                        // Region Title & Pill
                        ui.vertical(|ui| {
                            ui.horizontal(|ui| {
                                ui.label(RichText::new(&item.name).strong().size(15.0));
                                let (bg_color, text_color) = match item.level {
                                    AdminLevel::Provinsi => (Color32::from_rgb(30, 45, 75), Color32::from_rgb(100, 180, 255)),
                                    AdminLevel::KabupatenKota => (Color32::from_rgb(25, 60, 45), Color32::from_rgb(90, 220, 150)),
                                    AdminLevel::Kecamatan => (Color32::from_rgb(60, 50, 25), Color32::from_rgb(255, 200, 100)),
                                    AdminLevel::DesaKelurahan => (Color32::from_rgb(45, 30, 55), Color32::from_rgb(200, 150, 255)),
                                };
                                render_pill(ui, item.level.as_str(), bg_color, text_color);
                            });

                            // Sub-hierarchy
                            let mut hierarchy_parts = Vec::new();
                            if let Some(r) = &item.regency {
                                if item.level != AdminLevel::KabupatenKota {
                                    hierarchy_parts.push(format!("Kab/Kota: {}", r));
                                }
                            }
                            if let Some(p) = &item.province {
                                hierarchy_parts.push(format!("Provinsi: {}", p));
                            }
                            if let Some(c) = &item.code {
                                hierarchy_parts.push(format!("Kode: {}", c));
                            }

                            if !hierarchy_parts.is_empty() {
                                ui.label(
                                    RichText::new(hierarchy_parts.join("  |  "))
                                        .size(11.0)
                                        .color(Color32::from_rgb(130, 135, 145)),
                                );
                            }
                        });

                        // Action Button
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            if ui.button(RichText::new("Pilih & Lihat Peta ➔").color(COLOR_PRIMARY)).clicked() {
                                state.selected_region = Some(item.clone());
                                state.custom_filename = item.name.replace(' ', "_");
                                *trigger_fetch_region = true;
                                state.current_tab = NavTab::RegionDetail;
                            }
                        });
                    });
                });
                ui.add_space(4.0);
            }
        }
    });
}

