use crate::ui::card_frame;
use egui::{Color32, RichText, Ui};

pub fn render(ui: &mut Ui) {
    ui.add_space(8.0);
    ui.heading(RichText::new("ℹ️ Tentang BIG Downloader").size(20.0).strong());
    ui.label("Aplikasi desktop geospasial native untuk batas wilayah administratif Indonesia.");

    ui.add_space(12.0);

    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("🗺️ BIG Downloader v0.1.0").strong().size(15.0));
        ui.add_space(4.0);
        ui.label("Aplikasi ini dibangun untuk mempermudah mahasiswa, peneliti, praktisi GIS, WebGIS developer, data scientist, dan masyarakat umum dalam mengakses dan mengunduh data batas wilayah administratif Indonesia dari Badan Informasi Geospasial (BIG).");
    });

    ui.add_space(10.0);

    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("🏛️ Sumber Data Resmi").strong().size(14.0));
        ui.add_space(4.0);
        ui.label("Data diambil langsung secara online dari ArcGIS REST MapServer resmi Badan Informasi Geospasial:");
        ui.label(
            RichText::new("https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer")
                .monospace()
                .size(11.0)
                .color(Color32::from_rgb(120, 160, 220)),
        );
        ui.add_space(4.0);
        ui.label("Data mengacu pada Geodatabase edisi Oktober 2020 berdasarkan Permendagri No. 72 Tahun 2019 tentang Kode dan Data Wilayah Administrasi Pemerintahan.");
    });

    ui.add_space(10.0);

    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("⚡ Arsitektur & Teknologi").strong().size(14.0));
        ui.add_space(4.0);
        ui.label("• 100% Rust: Performa tinggi, efisiensi memori optimal, dan keamanan konkurensi.");
        ui.label("• GUI Native: egui + eframe desktop GUI responsif dan ringan.");
        ui.label("• Pemrosesan Geometri Lokal: geo, geo-types, dan union/dissolve spasial.");
        ui.label("• Penyimpanan Lokal: SQLite (rusqlite) untuk riwayat dan pengaturan pengguna.");
        ui.label("• Tanpa dependensi Python atau server backend lokal terpisah.");
    });

    ui.add_space(10.0);

    card_frame(ui).show(ui, |ui| {
        ui.label(RichText::new("📜 Lisensi & Hak Cipta").strong().size(14.0));
        ui.add_space(4.0);
        ui.label("Perangkat lunak ini didistribusikan di bawah lisensi terbuka MIT / Apache-2.0.");
        ui.label("Data spasial adalah hak milik Badan Informasi Geospasial (BIG) Republik Indonesia.");
    });
}

