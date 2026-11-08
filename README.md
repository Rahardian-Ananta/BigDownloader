# 🗺️ BIG Downloader Web

<div align="center">

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2563EB?style=for-the-badge&logo=github)](https://rahardian-ananta.github.io/BigDownloader/)
[![Design Style](https://img.shields.io/badge/Style-Neo--Brutalism-FFD93D?style=for-the-badge&labelColor=171717)](https://rahardian-ananta.github.io/BigDownloader/)
[![Data Source](https://img.shields.io/badge/Source-Badan%20Informasi%20Geospasial%20(BIG)-10B981?style=for-the-badge)](https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer)
[![License: MIT](https://img.shields.io/badge/License-MIT-FF6B6B?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-37%20Passed-74C0FC?style=for-the-badge&labelColor=171717)](tests/test_all.js)

**Aplikasi WebGIS Modern Berbasis Standar Web Native untuk Mencari, Memvisualisasikan, dan Mengunduh Batas Wilayah Administratif Seluruh Indonesia Resmi dari Badan Informasi Geospasial (BIG).**

[🌐 Buka Aplikasi Live (GitHub Pages)](https://rahardian-ananta.github.io/BigDownloader/) • [📖 Dokumentasi](#-fitur-utama) • [💾 Format Ekspor](#-8-format-ekspor-geospasial) • [🧪 Pengujian](#-pengujian-otomatis)

</div>

---

## ⚡ Sekilas Tentang Proyek

**BIG Downloader Web** adalah solusi geospasial modern yang dirancang khusus bagi mahasiswa, peneliti, praktisi GIS, data scientist, dan developer WebGIS untuk mengunduh batas wilayah Indonesia secara cepat, akurat, dan aman.

Aplikasi ini mengonsumsi langsung layanan geospasial resmi **ArcGIS REST MapServer Badan Informasi Geospasial (BIG)** dan melakukan **100% konversi berkas secara lokal di browser Anda**. Tidak ada data geometri yang dikirim ke server pihak ketiga!

---

## 🎨 Karakteristik Desain: Neo-Brutalism

Aplikasi ini mengusung filosofi **Neo-Brutalism Design** yang khas, tegas, dan ekspresif:

* 🟡 **Palet Kontras Tinggi:** Warna dasar *warm cream* (`#F8F4E8`), border tebal pekat (`3px solid #171717`), dan bayangan keras (*hard box-shadow* `5px 5px 0 #171717`).
* 🌓 **Mode Gelap & Terang (Dark / Light Mode):** Dilengkapi tombol pengalih di navbar dengan penyimpanan preferensi lokal permanen (`localStorage`).
* 🔤 **Tipografi Karakteristik:** Kombinasi *Space Grotesk* (heading tebal), *Inter* (body text yang nyaman dibaca), dan *JetBrains Mono* (kode wilayah & koordinat).
* 👆 **Interaksi Taktil:** Tombol interaktif dengan efek *press physical feedback* (`translate(2px, 2px)`).
* 🚫 **Bebas Framework UI Berat:** 100% CSS murni tanpa Tailwind, Bootstrap, atau UI framework monolitik lainnya.

---

## 🚀 Fitur Utama

### 1. 🔍 Pencarian Hierarkis & Akurat
- Pilihan tingkat administrasi: **Provinsi**, **Kota (Kabupaten/Kota)**, dan **Kecamatan**.
- Filter hierarki provinsi untuk membedakan wilayah bernama identik di daerah berbeda.
- **Pencarian Aman:** Tidak melakukan auto-search saat mengetik untuk menghindari batas limit (*rate limit*) API BIG. Pencarian dieksekusi hanya saat tombol **CARI** atau **Enter** ditekan dengan input tidak kosong.

### 2. 🗺️ Peta Interaktif Leaflet & 5 Basemap Gratis
- Visualisasi batas poligon wilayah dengan batas tegas dan fill transparan.
- **5 Pilihan Basemap Terbuka (Tanpa API Key):**
  1. 🏔️ **ESRI World Topo Map** *(Default — detail kontur dan elevasi tajam)*
  2. 🛣️ **ESRI World Street Map** *(Peta jalan perkotaan)*
  3. ⛰️ **OpenTopoMap** *(Topografi bukit dan gunung)*
  4. 🗺️ **OpenStreetMap (OSM)** *(Peta komunitas dunia)*
  5. ⬛ **Tanpa Basemap** *(Mode visualisasi murni batas geometri)*
- Floating HUD Controls: Zoom In/Out, Fit Bounds, Koordinat HUD real-time pada kursor.
- **Layer Stacking Anti-Bocor:** Seluruh kontrol peta meluncur rapi di bawah *sticky navbar* saat halaman di-scroll (`z-index` terisolasi).

### 3. 🔒 Map Interaction Lock & Loading Overlay
- Saat memilih wilayah dari daftar hasil, peta otomatis dikunci sementara dan memunculkan *overlay loading* semi-transparan bergaya Neo-Brutalism. Peta tidak akan bergeser liar sebelum data siap ditampilkan.

### 4. ⚡ Sistem Caching Geometri Instan (0 Latency)
- Data geometri poligon yang telah diunduh otomatis disimpan di memori *client-side cache*.
- Jika Anda berpindah antar wilayah yang sudah pernah dibuka, data langsung dimuat **instan (0 detik)** tanpa perlu memanggil ulang API BIG!

### 5. 📜 Riwayat Pengunduhan Lokal (IndexedDB)
- Setiap format yang berhasil dibuat dicatat otomatis di basis data lokal browser (*IndexedDB* / *localStorage fallback*).
- Riwayat dapat ditinjau, dibersihkan, atau dihapus per item tanpa menghapus file di perangkat Anda.

---

## 💾 8 Format Ekspor Geospasial

Seluruh pemrosesan dan konversi dilakukan langsung di browser (*Client-Side Engine*):

| Format | Ekstensi | MIME Type | Kompatibilitas Software | Deskripsi |
|---|---|---|---|---|
| **GeoJSON** | `.geojson` | `application/geo+json` | QGIS, ArcGIS, Mapbox, Leaflet, Python | Standar terbuka RFC 7946 dengan atribut lengkap & CRS EPSG:4326. |
| **Shapefile** | `.zip` | `application/zip` | ArcGIS Desktop, ArcMap, QGIS, AutoCAD | Paket ESRI Shapefile lengkap (`.shp`, `.shx`, `.dbf`, `.prj`, `.cpg UTF-8`). |
| **GeoPackage** | `.gpkg` | `application/geopackage+sqlite3` | QGIS 3+, ArcGIS Pro, GDAL, GeoPandas | Basis data spasial SQLite standar OGC dengan tabel koordinat WKB. |
| **KML** | `.kml` | `application/vnd.google-earth.kml+xml` | Google Earth Pro, Google Maps, GPS | Format Keyhole OGC KML 2.2 dengan styling semi-transparan & metadata. |
| **GeoParquet** | `.parquet` | `application/vnd.apache.parquet` | Apache Arrow, DuckDB, GeoPandas | Format analitik data geospasial kolumnar modern spesifikasi GeoParquet 1.0. |
| **TopoJSON** | `.topojson` | `application/json` | D3.js, Mapshaper, Vega, Observable | Representasi topologi ringkas berbasis busur bersama (*shared arcs*). |
| **CSV** | `.csv` | `text/csv` | Microsoft Excel, Google Sheets, Pandas | Tabel atribut administratif, kode wilayah, dan ringkasan batas wilayah. |
| **GML** | `.gml` | `application/gml+xml` | OGC SDI, Geoserver, QGIS, FME | Geography Markup Language v3.1.1 XML untuk standar pertukaran resmi. |

---

## 🏛️ Sumber Data: ArcGIS REST API BIG

Layanan geospasial resmi yang digunakan sebagai sumber data primer:
```text
https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer
```

- **Layer 0:** Batas Kabupaten / Kota (dan batas Provinsi melalui agregasi/dissolve)
- **Layer 1:** Batas Kecamatan
- **Layer 2:** Batas Desa / Kelurahan
- **Sistem Koordinat Acuan (CRS):** EPSG:4326 (WGS 84 Geodetik)

---

## 📂 Struktur Repositori

```text
BigDownloader/
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD Otomatis Deployment ke GitHub Pages
├── index.html                   # Halaman Utama WebGIS (HTML5 Semantic)
├── bundle.js                    # Script Bundler untuk Produksi Standalone
├── package.json                 # Metadata & Skrip Eksekusi Modul
├── README.md                    # Dokumentasi Resmi Proyek
│
├── css/
│   ├── theme.css                # Variabel Warna, Border, Shadow, & Dark Theme
│   ├── main.css                 # Reset Layout, Typography, & CSS Grid
│   ├── components.css           # Tombol, Kartu, Input, HUD Peta, Modal, Toast
│   └── responsive.css           # Media Queries (Laptop, Tablet, Mobile)
│
├── js/
│   ├── main.js                  # Entry Point Bootstrap Aplikasi
│   ├── app.js                   # State Management & Integrasi Peta
│   ├── bundle.js                # Versi Bundle Terintegrasi (85 KB)
│   │
│   ├── api/
│   │   ├── big-api.js           # Client ArcGIS REST API & Health Check
│   │   └── query-builder.js     # SQL WHERE Query Builder Aman
│   │
│   ├── services/
│   │   ├── search-service.js    # Logika Pencarian Hierarkis
│   │   ├── geometry-service.js  # Ekstraksi Poligon & Agregasi Wilayah
│   │   ├── download-service.js  # Dispatcher Multi-Format & Progress Handler
│   │   └── validation-service.js# Validasi Topologi Poligon & Ring Closure
│   │
│   ├── exporters/               # Engine Konversi 8 Format Biner/Teks
│   │   ├── geojson.js
│   │   ├── shapefile.js
│   │   ├── geopackage.js
│   │   ├── kml.js
│   │   ├── geoparquet.js
│   │   ├── topojson.js
│   │   ├── csv.js
│   │   └── gml.js
│   │
│   ├── storage/
│   │   └── history.js           # Manajemen Riwayat Lokal (IndexedDB)
│   │
│   └── utils/
│       ├── helpers.js           # Sanitasi XSS, Debounce, Blob Trigger
│       ├── format.js            # Pemformatan Ukuran File, Tanggal, & Badge
│       └── dom.js               # Utilitas DOM, Modal, & Notifikasi Toast
│
└── tests/
    └── test_all.js              # Unit Test Suite Otomatis (37 Skenario)
```

---

## 💻 Cara Menjalankan

### Cara 1: Akses Langsung Online (Paling Praktis)
Kunjungi halaman live di GitHub Pages:
👉 **[https://rahardian-ananta.github.io/BigDownloader/](https://rahardian-ananta.github.io/BigDownloader/)**

---

### Cara 2: Jalankan Secara Offline / Lokal (100% Statis)
Aplikasi ini **tidak memerlukan server backend, Node.js, ataupun Python** untuk digunakan sehari-hari:
1. Clone atau unduh repositori ini:
   ```bash
   git clone https://github.com/Rahardian-Ananta/BigDownloader.git
   ```
2. Buka folder hasil clone di File Explorer.
3. **Cukup klik dua kali (double-click) pada file `index.html`**.
4. Aplikasi akan langsung berjalan di browser favorit Anda!

---

## 🧪 Pengujian Otomatis

Repositori ini dilengkapi rangkaian pengujian unit otomatis mencakup seluruh *query builder*, *geometry validator*, dan ke-8 *format exporter*:

```bash
# Jalankan test suite dengan Node.js
node tests/test_all.js
```

**Hasil Pengujian:**
```text
========================================
🧪 RUNNING BIG DOWNLOADER WEB TEST SUITE
========================================
🔹 1. Testing QueryBuilder...           ✅ PASS (3 tests)
🔹 2. Testing ValidationService...      ✅ PASS (3 tests)
🔹 3. Testing Format Utilities...       ✅ PASS (4 tests)
🔹 4. Testing GeoJsonExporter...        ✅ PASS (4 tests)
🔹 5. Testing CsvExporter...            ✅ PASS (3 tests)
🔹 6. Testing KmlExporter...            ✅ PASS (3 tests)
🔹 7. Testing GmlExporter...            ✅ PASS (3 tests)
🔹 8. Testing TopoJsonExporter...       ✅ PASS (3 tests)
🔹 9. Testing ShapefileExporter...      ✅ PASS (6 tests)
🔹 10. Testing GeoPackageExporter...    ✅ PASS (2 tests)
🔹 11. Testing GeoParquetExporter...    ✅ PASS (2 tests)
========================================
📊 SUMMARY: 37 PASSED, 0 FAILED
========================================
```

---

## 🛡️ Hak Cipta & Atribusi

* **Data Geospasial:** Hak Cipta &copy; **Badan Informasi Geospasial (BIG)** Republik Indonesia.
* **Lisensi Kode:** Didistribusikan di bawah lisensi terbuka [MIT License](LICENSE).
* **Penggunaan:** Ditujukan untuk riset akademik, analisis perencanaan wilayah, WebGIS, dan pemetaan umum. Selalu cantumkan atribusi resmi kepada BIG pada setiap produk turunan peta Anda.
