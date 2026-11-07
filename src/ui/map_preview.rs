use crate::core::geometry::RawGeometry;
use crate::state::AppState;
use crate::ui::card_frame;
use egui::{Color32, Pos2, Rect, Sense, Stroke, Ui, Vec2};

pub fn render(ui: &mut Ui, state: &mut AppState) {
    ui.add_space(4.0);

    // Map Toolbar Controls
    card_frame(ui).show(ui, |ui| {
        ui.horizontal(|ui| {
            if let Some(item) = &state.selected_region {
                ui.label(egui::RichText::new(&item.name).strong().size(15.0));
                ui.label(format!("({})", item.level));
            } else {
                ui.label(egui::RichText::new("Peta Pratinjau (Belum ada wilayah dipilih)").italics());
            }

            ui.separator();

            if ui.button("➕ Zoom In").clicked() {
                state.map_zoom *= 1.25;
            }
            if ui.button("➖ Zoom Out").clicked() {
                state.map_zoom = (state.map_zoom * 0.8).max(0.1);
            }
            if ui.button("🎯 Pas ke Wilayah (Fit)").clicked() {
                state.map_fit_requested = true;
            }
            if ui.button("🔄 Reset Peta").clicked() {
                state.map_zoom = 1.0;
                state.map_pan = [0.0, 0.0];
                state.map_fit_requested = true;
            }

            ui.separator();
            ui.checkbox(&mut state.map_show_basemap, "Tampilkan Basemap Grid");
        });
    });

    ui.add_space(6.0);

    // Interactive Map Canvas Area
    let available_size = ui.available_size();
    let (response, painter) = ui.allocate_painter(available_size, Sense::drag());

    let rect = response.rect;

    // Handle mouse drag panning
    if response.dragged() {
        state.map_pan[0] += response.drag_delta().x;
        state.map_pan[1] += response.drag_delta().y;
    }

    // Handle mouse wheel zoom
    let scroll_delta = ui.input(|i| i.raw_scroll_delta.y);
    if scroll_delta != 0.0 && response.hovered() {
        let factor = if scroll_delta > 0.0 { 1.15 } else { 0.87 };
        state.map_zoom = (state.map_zoom * factor).clamp(0.05, 50.0);
    }

    // Background fill
    let bg_color = if ui.visuals().dark_mode {
        Color32::from_rgb(18, 20, 24)
    } else {
        Color32::from_rgb(238, 242, 246)
    };
    painter.rect_filled(rect, 8.0, bg_color);

    // Basemap Grid if enabled
    if state.map_show_basemap {
        render_grid(&painter, rect, ui.visuals().dark_mode);
    }

    // Render region boundary geometry
    if let Some(data) = &state.region_data {
        let bbox = &data.bbox;
        let center_lon = (bbox.min_x + bbox.max_x) / 2.0;
        let center_lat = (bbox.min_y + bbox.max_y) / 2.0;

        let width_deg = (bbox.max_x - bbox.min_x).max(0.001);
        let height_deg = (bbox.max_y - bbox.min_y).max(0.001);

        let canvas_w = rect.width() - 40.0;
        let canvas_h = rect.height() - 40.0;

        let scale_x = canvas_w / width_deg as f32;
        let scale_y = canvas_h / height_deg as f32;
        let base_scale = scale_x.min(scale_y);

        if state.map_fit_requested {
            state.map_zoom = 1.0;
            state.map_pan = [0.0, 0.0];
            state.map_fit_requested = false;
        }

        let effective_scale = base_scale * state.map_zoom;
        let center_screen = rect.center() + Vec2::new(state.map_pan[0], state.map_pan[1]);

        let project_pt = |pt: &[f64; 2]| -> Pos2 {
            let dx = (pt[0] - center_lon) as f32 * effective_scale;
            let dy = (pt[1] - center_lat) as f32 * effective_scale;
            Pos2::new(center_screen.x + dx, center_screen.y - dy)
        };

        let stroke_color = Color32::from_rgb(0, 140, 255);
        let fill_color = Color32::from_rgba_unmultiplied(0, 140, 255, 35);
        let stroke = Stroke::new(1.8, stroke_color);

        match &data.dissolved_geometry {
            RawGeometry::Polygon { coordinates } => {
                render_single_polygon(&painter, coordinates, &project_pt, fill_color, stroke);
            }
            RawGeometry::MultiPolygon { coordinates } => {
                for poly in coordinates {
                    render_single_polygon(&painter, poly, &project_pt, fill_color, stroke);
                }
            }
        }

        // Draw centroid indicator
        let center_screen_pt = project_pt(&[data.centroid.0, data.centroid.1]);
        if rect.contains(center_screen_pt) {
            painter.circle_filled(center_screen_pt, 4.0, Color32::from_rgb(255, 60, 60));
            painter.circle_stroke(center_screen_pt, 6.0, Stroke::new(1.0, Color32::WHITE));
        }
    } else {
        let center = rect.center();
        painter.text(
            center,
            egui::Align2::CENTER_CENTER,
            "Pilih wilayah pada tab 'Cari' untuk melihat batas geometri di sini",
            egui::FontId::proportional(14.0),
            Color32::from_rgb(120, 125, 135),
        );
    }
}

fn render_single_polygon<F>(
    painter: &egui::Painter,
    rings: &[Vec<[f64; 2]>],
    project: &F,
    fill_color: Color32,
    stroke: Stroke,
) where
    F: Fn(&[f64; 2]) -> Pos2,
{
    if let Some(exterior) = rings.first() {
        if exterior.len() >= 3 {
            let pts: Vec<Pos2> = exterior.iter().map(project).collect();
            // Render polygon fill & stroke
            painter.add(egui::Shape::convex_polygon(pts.clone(), fill_color, stroke));
        }
    }

    // Render hole boundaries
    for interior in rings.iter().skip(1) {
        if interior.len() >= 3 {
            let pts: Vec<Pos2> = interior.iter().map(project).collect();
            let hole_stroke = Stroke::new(1.0, Color32::from_rgb(180, 200, 220));
            painter.add(egui::Shape::closed_line(pts, hole_stroke));
        }
    }
}

fn render_grid(painter: &egui::Painter, rect: Rect, dark_mode: bool) {
    let grid_color = if dark_mode {
        Color32::from_rgb(32, 35, 42)
    } else {
        Color32::from_rgb(220, 225, 232)
    };
    let stroke = Stroke::new(0.5, grid_color);

    let step = 40.0;
    let mut x = rect.min.x + step;
    while x < rect.max.x {
        painter.line_segment([Pos2::new(x, rect.min.y), Pos2::new(x, rect.max.y)], stroke);
        x += step;
    }

    let mut y = rect.min.y + step;
    while y < rect.max.y {
        painter.line_segment([Pos2::new(rect.min.x, y), Pos2::new(rect.max.x, y)], stroke);
        y += step;
    }
}

