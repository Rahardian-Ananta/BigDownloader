# BIG Downloader Web — Indonesia Administrative Boundary WebGIS

Aplikasi WebGIS modern berbasis **HTML5, CSS3, dan Vanilla JavaScript (ES Modules)** dengan pendekatan estetika **Neo-Brutalism Design**. Aplikasi ini memungkinkan pengguna untuk mencari, mengeksplorasi batas wilayah pada peta interaktif, dan mengunduh data batas administratif Indonesia resmi dari **Badan Informasi Geospasial (BIG)** dalam **8 format data geospasial**.

---

## 🎨 Karakteristik Neo-Brutalism Design

- **Palet Warna Kontras:** Background off-white (`#F8F4E8`), Primary Yellow (`#FFD93D`), Mint Green (`#A8E6CF`), Coral Red (`#FF6B6B`), Sky Blue (`#74C0FC`).
- **Garis & Bayangan Tegas:** Border hitam pekat `3px solid #171717`, hard box-shadow tanpa blur `5px 5px 0 #171717`.
- **Tipografi Ekspresif:** Heading bold *Space Grotesk*, teks konten *Inter*, serta metadata/kode *JetBrains Mono*.
- **Interaksi Taktil:** Efek hover `translate(-2px, -2px)` dengan shadow membesar, dan efek active press `translate(2px, 2px)`.
- **Tanpa Framework UI Berat:** 100% CSS murni tanpa Tailwind, Bootstrap, atau UI library lainnya.

---

## 🗺️ Sumber Data Resmi: BIG ArcGIS REST API

Endpoint Layanan:
```text
https://geoservices.big.go.id/gis/rest/services/BAPANAS/Batas_Administrasi/MapServer
```

- **Layer 0:** Kabupaten / Kota (dan batas Provinsi melalui agregasi)
- **Layer 1:** Kecamatan
- **Layer 2:** Desa / Kelurahan
- **Sistem Koordinat Acuan (CRS):** EPSG:4326 (WGS 84)

---

## 💾 8 Format Ekspor Geospasial

| Format | Ekstensi | Deskripsi & Kompatibilitas |
|---|---|---|
| **GeoJSON** | `.geojson` | Standar pertukaran WebGIS RFC 7946 dengan atribut lengkap |
| **Shapefile** | `.zip` | Paket ESRI Shapefile (`.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`) |
| **GeoPackage** | `.gpkg` | Basis data spasial SQLite standar OGC untuk QGIS |
| **KML** | `.kml` | Format Keyhole OGC KML 2.2 untuk Google Earth |
| **GeoParquet** | `.parquet` | Format analitik geospasial kolumnar Apache Arrow & GeoPandas |
| **TopoJSON** | `.topojson` | Representasi topologi ringkas berbasis shared arcs |
| **CSV** | `.csv` | Tabel atribut administratif, luas wilayah, dan koordinat perbatasan |
| **GML** | `.gml` | Geography Markup Language OGC v3.1 untuk integrasi SDI |

---

## 📁 Struktur Direktori

```text
big-downloader-web/
├── index.html                   # Halaman utama aplikasi (HTML5 Semantic)
├── package.json                 # Metadata & skrip pengujian modul
├── README.md                    # Dokumentasi lengkap proyek
│
├── assets/                      # Aset statis
│   ├── icons/
│   └── fonts/
│
├── css/
│   ├── theme.css                # Variabel Neo-Brutalism & palet warna
│   ├── main.css                 # Layout dasar, grid, & tipografi
│   ├── components.css           # Komponen tombol, kartu, input, peta, modal
│   └── responsive.css           # Breakpoint tablet & mobile
│
├── js/
│   ├── main.js                  # Bootstrapper aplikasi
│   ├── app.js                   # Application controller & state orchestrator
│   │
│   ├── api/
│   │   ├── big-api.js           # Client ArcGIS REST API & health check
│   │   └── query-builder.js     # SQL WHERE clause builder aman
│   │
│   ├── services/
│   │   ├── search-service.js    # Pencarian hierarkis (Provinsi, Kab/Kota, Kec)
│   │   ├── geometry-service.js  # Pengambilan geometri & penggabungan provinsi
│   │   ├── download-service.js  # Koordinator unduhan & ekspor batch
│   │   └── validation-service.js# Validasi topologi & koordinat GeoJSON
│   │
│   ├── exporters/
│   │   ├── geojson.js           # Exporter GeoJSON RFC 7946
│   │   ├── shapefile.js         # Exporter biner ESRI Shapefile ZIP
│   │   ├── geopackage.js        # Exporter SQLite3 GeoPackage (GPKG)
│   │   ├── kml.js               # Exporter OGC KML 2.2
│   │   ├── geoparquet.js        # Exporter Apache Parquet + GeoParquet 1.0.0
│   │   ├── topojson.js          # Exporter TopoJSON Topology
│   │   ├── csv.js               # Exporter CSV RFC 4180
│   │   └── gml.js               # Exporter GML 3.1.1 XML
│   │
│   ├── workers/
│   │   └── export-worker.js     # Web Worker untuk pemrosesan asinkron
│   │
│   ├── storage/
│   │   └── history.js           # Penyimpanan riwayat lokal (IndexedDB)
│   │
│   └── utils/
│       ├── helpers.js           # Debounce, sanitasi XSS, Blob downloader
│       ├── format.js            # Format ukuran byte, nomor, & tanggal
│       └── dom.js               # Helper DOM, modal, & Toast Neo-Brutalism
│
└── tests/
    └── test_all.js              # Unit test suite otomatis (37 skenario pengujian)
```

---

## 🚀 Cara Menjalankan

### Cara 1: Menggunakan Local Web Server (Direkomendasikan)

Karena aplikasi menggunakan ES Modules (`import`/`export`), jalankan local server sederhana:

```bash
# Menggunakan Node.js npx serve
npx serve big-downloader-web

# Atau menggunakan Python 3
cd big-downloader-web
python -m http.server 8000
```
Buka browser dan akses: `http://localhost:8000`

---

## 🧪 Menjalankan Pengujian Otomatis

Aplikasi dilengkapi test suite lengkap untuk memverifikasi logika pencarian, validasi topologi, serta binary builder untuk ke-8 format:

```bash
cd big-downloader-web
node tests/test_all.js
```

Hasil pengujian:
```text
========================================
📊 SUMMARY: 37 PASSED, 0 FAILED
========================================
```

---

## 🔒 Privasi & Keamanan

- **100% Pemrosesan Lokal:** Konversi ke GeoJSON, Shapefile, GeoPackage, KML, Parquet, TopoJSON, CSV, dan GML dilakukan sepenuhnya di dalam browser pengguna (Client-Side).
- **Tanpa Pengiriman Data Eksternal:** Geometri wilayah tidak pernah dikirim ke server pihak ketiga mana pun.
- **Sanitasi XSS:** Semua string atribut disanitasi sebelum ditampilkan pada DOM atau popup peta.
