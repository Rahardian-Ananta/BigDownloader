# 🗺️ BIG Downloader — Indonesia Administrative Boundary Data

Aplikasi desktop native 100% Rust untuk mencari, melihat, mengunduh, dan mengonversi data batas wilayah administratif seluruh Indonesia menggunakan layanan geospasial resmi **Badan Informasi Geospasial (BIG)**.

Aplikasi ditujukan untuk mahasiswa, peneliti, praktisi GIS, developer WebGIS, data scientist, dan pengguna umum yang membutuhkan batas administratif Indonesia yang akurat, terstruktur, dan siap pakai.

---

## 🌟 Fitur Utama

- **100% Native Rust & Ringan:** Dibangun menggunakan Rust dengan framework GUI modern `egui` + `eframe`. Tidak memerlukan Python, Node.js, atau server backend terpisah.
- **Data Resmi BIG (ArcGIS REST API):** Terhubung langsung ke MapServer resmi BIG:
  `https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer`
- **Pencarian Hierarkis Cerdas:**
  - **Provinsi:** Penggabungan otomatis (dissolve/union spasial) multi-kabupaten dengan mempertahankan pulau-pulau kecil, lubang polygon, dan wilayah kepulauan.
  - **Kabupaten / Kota:** Pencarian cepat berbasis atribut dengan dukungan filter hierarki provinsi.
  - **Kecamatan:** Membedakan wilayah dengan nama yang sama (misal Kecamatan Sidoarjo di Kabupaten Sidoarjo vs wilayah serupa di kabupaten lain).
- **Pratinjau Peta Vektor 2D Interaktif:**
  - Zoom in / Zoom out interaktif (mouse scroll / tombol toolbar).
  - Panning dengan drag mouse.
  - Fit to bounds otomatis ke geometri wilayah.
  - Tampilan grid koordinat geografis offline.
- **8 Format Ekspor Standar GIS:**
  1. **GeoJSON (`.geojson`):** RFC 7946 FeatureCollection berstandar WGS84 (EPSG:4326) lengkap dengan atribut asli.
  2. **ESRI Shapefile (`.zip`):** Arsip ZIP mandiri berisi `.shp`, `.shx`, `.dbf`, `.prj` (WGS 84), dan `.cpg` (UTF-8).
  3. **GeoPackage (`.gpkg`):** Basis data spasial OGC SQLite GeoPackage standar, siap dibuka langsung di QGIS / ArcGIS.
  4. **KML (`.kml`):** OGC KML 2.2 untuk Google Earth Pro, Google Maps, dan perangkat lunak navigasi.
  5. **CSV (`.csv`):** Tabel atribut administratif, luas wilayah (ha), koordinat centroid, dan batas bounding box.
  6. **GeoParquet (`.parquet`):** Format biner kolumnar Apache Parquet dengan spesifikasi standar GeoParquet 1.1.0 WKB.
  7. **TopoJSON (`.topojson`):** Format topologi terkompresi efisien untuk WebGIS dan visualisasi web modern.
  8. **GML (`.gml`):** OGC GML 3.2.1 / 3.1.1 Geography Markup Language XML.
- **Download Manager Tangguh:**
  - Ekspor beberapa format sekaligus dalam satu kali klik.
  - Pelaporan kemajuan riil (unduh fitur -> proses geometri -> konversi format).
  - Tombol pembatalan (cancellation) operasi setiap saat.
- **Riwayat Unduhan Lokal (SQLite):**
  - Menyimpan riwayat unduhan secara lokal.
  - Tombol cepat *Buka File* dan *Buka Folder*.
- **Pengaturan & Diagnostik:**
  - Folder unduhan default (folder picker via native RFD).
  - Pengalihan Tema Gelap (Dark Mode) dan Tema Terang (Light Mode).
  - Konfigurasi HTTP Timeout dan Retry Count dengan exponential backoff.

---

## 🏗️ Arsitektur Proyek

```text
big-downloader/
│
├── Cargo.toml               # Konfigurasi dependensi Rust & metadata Debian
├── Cargo.lock
├── README.md                # Dokumentasi lengkap
├── LICENSE                  # Lisensi MIT
│
├── src/
│   ├── main.rs              # Entry point native eframe & runtime tokio
│   ├── lib.rs               # Library root untuk unit & integration tests
│   ├── app.rs               # Implementasi eframe::App dan event loop UI
│   ├── state.rs             # State management aplikasi
│   │
│   ├── ui/                  # Komponen Antarmuka Pengguna (egui)
│   │   ├── mod.rs           # Tema, styling, card frames, status pills
│   │   ├── dashboard.rs     # Dashboard utama, status koneksi BIG, statistik
│   │   ├── search.rs        # Antarmuka pencarian hierarkis & filter
│   │   ├── region_detail.rs # Rincian spesifikasi spasial wilayah terpilih
│   │   ├── map_preview.rs   # Canvas pratinjau peta vektor 2D interaktif
│   │   ├── downloads.rs     # Download manager & selector 8 format ekspor
│   │   ├── history.rs       # Tabel riwayat unduhan SQLite
│   │   ├── settings.rs      # Pengaturan tema, direktori, dan timeout
│   │   └── about.rs         # Informasi aplikasi & lisensi
│   │
│   ├── core/                # Inti Komputasi & Jaringan
│   │   ├── mod.rs
│   │   ├── big_api.rs       # Client ArcGIS REST API dengan retry & timeout
│   │   ├── search.rs        # Mesin pencari hierarkis & deduplikasi
│   │   ├── geometry.rs      # BBox, centroid, GeoJSON parsing, spatial dissolve
│   │   ├── downloader.rs    # Engine pengunduh asinkron dengan paginasi
│   │   ├── validation.rs    # Validasi geometri (ring closure, WGS84 range)
│   │   └── metadata.rs      # Metadata sumber BIG, layer ID, dan CRS
│   │
│   ├── exporters/           # Modul 8 Format Ekspor GIS
│   │   ├── mod.rs           # Interface exporter batch & single runner
│   │   ├── geojson.rs       # RFC 7946 GeoJSON exporter
│   │   ├── shapefile.rs     # ESRI Shapefile exporter (.zip bundle)
│   │   ├── geopackage.rs    # OGC GeoPackage SQLite database exporter
│   │   ├── kml.rs           # OGC KML 2.2 XML exporter
│   │   ├── csv.rs           # Administrative CSV attribute table exporter
│   │   ├── geoparquet.rs    # Apache Parquet GeoParquet 1.1 exporter
│   │   ├── topojson.rs      # TopoJSON topology format exporter
│   │   └── gml.rs           # OGC GML 3.2.1 XML exporter
│   │
│   ├── database/            # Basis Data Lokal SQLite
│   │   ├── mod.rs           # Database connection & migrations
│   │   ├── history.rs       # Download history CRUD
│   │   └── settings.rs      # App settings persistence
│   │
│   └── utils/               # Utilitas Sistem
│       ├── mod.rs
│       ├── paths.rs         # Path sistem operasi (Windows / Linux XDG)
│       └── logger.rs        # Daily rolling file logger & tracing
│
├── tests/
│   └── all_tests.rs         # Automated integration tests untuk geometri & 8 exporter
│
└── packaging/
    ├── windows/
    │   └── build_windows_portable.ps1  # Script build Windows Portable .exe
    └── debian/
        ├── big-downloader.desktop      # Desktop entry menu aplikasi Linux
        └── build_deb.sh                # Script build installer .deb Debian
```

---

## 🚀 Panduan Kompilasi & Build

### Prasyarat
- **Rust Toolchain:** versi 1.75 atau lebih baru (`cargo`, `rustc`).

---

### 1. Build Windows Portable (`BIGDownloader.exe`)

Untuk menghasilkan file executable mandiri yang dapat langsung dijalankan di Windows 10 dan Windows 11 tanpa instalasi dependency:

```powershell
# Kompilasi rilis optimal
cargo build --release

# Menjalankan script packaging portable
powershell -File packaging\windows\build_windows_portable.ps1
```

Hasil akhir berada di `dist/BIGDownloader-Windows-Portable/BIGDownloader.exe`.

---

### 2. Build Linux Debian (`.deb` untuk Debian 12 & 13)

Untuk membuat paket instalasi `.deb` yang kompatibel dengan Debian 12 (Bookworm) dan Debian 13 (Trixie):

```bash
# Pasang cargo-deb jika belum tersedia
cargo install cargo-deb

# Bangun paket .deb
bash packaging/debian/build_deb.sh
```

Hasil paket `.deb` akan tersimpan di direktori `target/debian/big-downloader_0.1.0_amd64.deb`.

Pemasangan pada sistem Debian:
```bash
sudo dpkg -i target/debian/big-downloader_0.1.0_amd64.deb
# Jika terdapat pustaka dependensi sistem yang belum terpenuhi:
sudo apt-get install -f
```

Setelah dipasang, aplikasi akan muncul di Application Menu desktop Linux dengan nama **BIG Downloader**.

---

## 🧪 Pengujian Otomatis (Automated Tests)

Jalankan seluruh pengujian unit dan integrasi untuk memastikan validitas geometri, database SQLite, dan seluruh 8 format exporter:

```bash
cargo test
```

Pengujian memverifikasi:
- Validasi ring penutup dan batas koordinat WGS84.
- Penggabungan spasial (dissolve/union) pulau dan multi-polygon.
- Pembuatan dan keutuhan format GeoJSON, Shapefile ZIP, GeoPackage SQLite, KML, CSV, GeoParquet, TopoJSON, dan GML.
- Operasi CRUD riwayat dan konfigurasi basis data lokal.

---

## 📜 Lisensi & Atribusi Data

- **Lisensi Kode:** MIT License.
- **Atribusi Data Geospasial:** Data batas wilayah bersumber dari **Badan Informasi Geospasial (BIG)** Republik Indonesia.

