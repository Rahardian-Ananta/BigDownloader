pub mod about;
pub mod dashboard;
pub mod downloads;
pub mod history;
pub mod map_preview;
pub mod region_detail;
pub mod search;
pub mod settings;

use egui::{Color32, Frame, Margin, RichText, Rounding, Stroke, Ui};

pub const COLOR_PRIMARY: Color32 = Color32::from_rgb(33, 150, 243);
pub const COLOR_SUCCESS: Color32 = Color32::from_rgb(76, 175, 80);
pub const COLOR_WARNING: Color32 = Color32::from_rgb(255, 152, 0);
pub const COLOR_DANGER: Color32 = Color32::from_rgb(244, 67, 54);

pub fn card_frame(ui: &Ui) -> Frame {
    let visuals = ui.visuals();
    let bg = if visuals.dark_mode {
        Color32::from_rgb(26, 29, 36)
    } else {
        Color32::from_rgb(248, 250, 252)
    };
    let border = if visuals.dark_mode {
        Color32::from_rgb(45, 52, 64)
    } else {
        Color32::from_rgb(226, 232, 240)
    };
    Frame::none()
        .fill(bg)
        .stroke(Stroke::new(1.0_f32, border))
        .rounding(Rounding::same(8.0))
        .inner_margin(Margin::same(14.0))
}

pub fn render_pill(ui: &mut Ui, text: &str, bg: Color32, fg: Color32) {
    Frame::none()
        .fill(bg)
        .rounding(Rounding::same(4.0))
        .inner_margin(Margin::symmetric(8.0, 3.0))
        .show(ui, |ui| {
            ui.label(RichText::new(text).size(11.0).strong().color(fg));
        });
}
