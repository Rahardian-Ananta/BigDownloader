use big_downloader::core::downloader::{DownloadedFeature, DownloadedRegionData};
use big_downloader::core::geometry::{dissolve_geometries, BBox, RawGeometry};
use big_downloader::core::metadata::AdminLevel;
use big_downloader::core::search::RegionItem;
use big_downloader::core::validation::validate_geometry;
use big_downloader::database::history::NewDownloadRecord;
use big_downloader::database::Database;
use big_downloader::exporters::*;
use std::fs::File;
use std::io::Read;
use tempfile::tempdir;

fn create_sample_region_data() -> DownloadedRegionData {
    let item = RegionItem {
        id: "kab_sidoarjo_1".to_string(),
        name: "Sidoarjo".to_string(),
        level: AdminLevel::KabupatenKota,
        regency: Some("Sidoarjo".to_string()),
        province: Some("Jawa Timur".to_string()),
        code: Some("35.15".to_string()),
        layer_id: 0,
        where_clause: "OBJECTID = 1".to_string(),
    };

    // Valid closed polygon coordinates around Sidoarjo (approx. 112.7° E, -7.45° S)
    let poly_coords = vec![vec![
        [112.70, -7.45],
        [112.75, -7.45],
        [112.75, -7.50],
        [112.70, -7.50],
        [112.70, -7.45], // Closed
    ]];

    let geom = RawGeometry::Polygon {
        coordinates: poly_coords,
    };

    let mut attrs = serde_json::Map::new();
    attrs.insert("NAMOBJ".to_string(), serde_json::json!("Sidoarjo"));
    attrs.insert("WADMKK".to_string(), serde_json::json!("Sidoarjo"));
    attrs.insert("WADMPR".to_string(), serde_json::json!("Jawa Timur"));
    attrs.insert("KDPKAB".to_string(), serde_json::json!("35.15"));
    attrs.insert("LUASWH".to_string(), serde_json::json!(71400.5));

    let feat = DownloadedFeature {
        attributes: attrs,
        geometry: geom.clone(),
    };

    let bbox = geom.bbox();
    let centroid = geom.centroid();

    DownloadedRegionData {
        item,
        features: vec![feat],
        dissolved_geometry: geom,
        bbox,
        centroid,
        feature_count: 1,
        total_points: 5,
    }
}

#[test]
fn test_geometry_bbox_and_validation() {
    let data = create_sample_region_data();
    assert!((data.bbox.min_x - 112.70).abs() < 1e-5);
    assert!((data.bbox.max_x - 112.75).abs() < 1e-5);
    assert!((data.bbox.min_y - (-7.50)).abs() < 1e-5);
    assert!((data.bbox.max_y - (-7.45)).abs() < 1e-5);

    assert!(validate_geometry(&data.dissolved_geometry).is_ok());
}

#[test]
fn test_geometry_dissolve() {
    let poly1 = RawGeometry::Polygon {
        coordinates: vec![vec![
            [100.0, 0.0],
            [101.0, 0.0],
            [101.0, 1.0],
            [100.0, 1.0],
            [100.0, 0.0],
        ]],
    };
    let poly2 = RawGeometry::Polygon {
        coordinates: vec![vec![
            [102.0, 0.0],
            [103.0, 0.0],
            [103.0, 1.0],
            [102.0, 1.0],
            [102.0, 0.0],
        ]],
    };

    let dissolved = dissolve_geometries(&[poly1, poly2]);
    match dissolved {
        RawGeometry::MultiPolygon { coordinates } => {
            assert_eq!(coordinates.len(), 2, "Dissolved must preserve both parts");
        }
        _ => panic!("Expected MultiPolygon after dissolve"),
    }
}

#[test]
fn test_export_geojson() {
    let dir = tempdir().unwrap();
    let data = create_sample_region_data();
    let res = export_single(ExportFormat::GeoJSON, &data, dir.path(), Some("test_sidoarjo"));

    assert!(res.success, "GeoJSON export failed: {:?}", res.error_message);
    assert!(res.output_path.exists());
    assert!(res.file_size_bytes.unwrap() > 50);

    let mut content = String::new();
    File::open(&res.output_path)
        .unwrap()
        .read_to_string(&mut content)
        .unwrap();
    assert!(content.contains("FeatureCollection"));
    assert!(content.contains("Sidoarjo"));
}

#[test]
fn test_export_shapefile() {
    let dir = tempdir().unwrap();
    let data = create_sample_region_data();
    let res = export_single(ExportFormat::Shapefile, &data, dir.path(), Some("test_sidoarjo"));

    assert!(res.success, "Shapefile export failed: {:?}", res.error_message);
    assert!(res.output_path.exists());

    // Verify it is a valid ZIP containing .shp, .shx, .dbf, .prj, .cpg
    let file = File::open(&res.output_path).unwrap();
    let mut archive = zip::ZipArchive::new(file).unwrap();
    let names: Vec<String> = archive.file_names().map(|s| s.to_string()).collect();

    assert!(names.iter().any(|n| n.ends_with(".shp")), "Missing .shp in ZIP");
    assert!(names.iter().any(|n| n.ends_with(".shx")), "Missing .shx in ZIP");
    assert!(names.iter().any(|n| n.ends_with(".dbf")), "Missing .dbf in ZIP");
    assert!(names.iter().any(|n| n.ends_with(".prj")), "Missing .prj in ZIP");
    assert!(names.iter().any(|n| n.ends_with(".cpg")), "Missing .cpg in ZIP");
}

#[test]
fn test_export_geopackage() {
    let dir = tempdir().unwrap();
    let data = create_sample_region_data();
    let res = export_single(ExportFormat::GeoPackage, &data, dir.path(), Some("test_sidoarjo"));

    assert!(res.success, "GeoPackage export failed: {:?}", res.error_message);
    assert!(res.output_path.exists());

    // Test SQLite validity
    let conn = rusqlite::Connection::open(&res.output_path).unwrap();
    let mut stmt = conn
        .prepare("SELECT count(*) FROM gpkg_contents WHERE table_name = 'batas_wilayah'")
        .unwrap();
    let count: i64 = stmt.query_row([], |r| r.get(0)).unwrap();
    assert_eq!(count, 1);
}

#[test]
fn test_export_kml() {
    let dir = tempdir().unwrap();
    let data = create_sample_region_data();
    let res = export_single(ExportFormat::KML, &data, dir.path(), Some("test_sidoarjo"));

    assert!(res.success, "KML export failed: {:?}", res.error_message);
    assert!(res.output_path.exists());

    let mut content = String::new();
    File::open(&res.output_path)
        .unwrap()
        .read_to_string(&mut content)
        .unwrap();
    assert!(content.contains("<kml xmlns="));
    assert!(content.contains("<Polygon>"));
    assert!(content.contains("Sidoarjo"));
}

#[test]
fn test_export_csv() {
    let dir = tempdir().unwrap();
    let data = create_sample_region_data();
    let res = export_single(ExportFormat::CSV, &data, dir.path(), Some("test_sidoarjo"));

    assert!(res.success, "CSV export failed: {:?}", res.error_message);
    assert!(res.output_path.exists());

    let mut content = String::new();
    File::open(&res.output_path)
        .unwrap()
        .read_to_string(&mut content)
        .unwrap();
    assert!(content.contains("nama_wilayah"));
    assert!(content.contains("Sidoarjo"));
    assert!(content.contains("Jawa Timur"));
}

#[test]
fn test_export_geoparquet() {
    let dir = tempdir().unwrap();
    let data = create_sample_region_data();
    let res = export_single(ExportFormat::GeoParquet, &data, dir.path(), Some("test_sidoarjo"));

    assert!(res.success, "GeoParquet export failed: {:?}", res.error_message);
    assert!(res.output_path.exists());

    let mut bytes = Vec::new();
    File::open(&res.output_path)
        .unwrap()
        .read_to_end(&mut bytes)
        .unwrap();
    assert!(bytes.starts_with(b"PAR1"), "Parquet must start with PAR1");
    assert!(bytes.ends_with(b"PAR1"), "Parquet must end with PAR1");
}

#[test]
fn test_export_topojson() {
    let dir = tempdir().unwrap();
    let data = create_sample_region_data();
    let res = export_single(ExportFormat::TopoJSON, &data, dir.path(), Some("test_sidoarjo"));

    assert!(res.success, "TopoJSON export failed: {:?}", res.error_message);
    assert!(res.output_path.exists());

    let mut content = String::new();
    File::open(&res.output_path)
        .unwrap()
        .read_to_string(&mut content)
        .unwrap();
    assert!(content.contains("\"Topology\""));
    assert!(content.contains("\"arcs\""));
}

#[test]
fn test_export_gml() {
    let dir = tempdir().unwrap();
    let data = create_sample_region_data();
    let res = export_single(ExportFormat::GML, &data, dir.path(), Some("test_sidoarjo"));

    assert!(res.success, "GML export failed: {:?}", res.error_message);
    assert!(res.output_path.exists());

    let mut content = String::new();
    File::open(&res.output_path)
        .unwrap()
        .read_to_string(&mut content)
        .unwrap();
    assert!(content.contains("<gml:FeatureCollection"));
    assert!(content.contains("<gml:posList>"));
}

#[test]
fn test_database_crud() {
    let db = Database::open_in_memory().unwrap();

    // Test settings
    let mut settings = db.settings().load_settings();
    settings.dark_theme = false;
    settings.retry_count = 5;
    db.settings().save_settings(&settings).unwrap();

    let loaded = db.settings().load_settings();
    assert_eq!(loaded.dark_theme, false);
    assert_eq!(loaded.retry_count, 5);

    // Test history
    let rec = NewDownloadRecord {
        region_name: "Sidoarjo".to_string(),
        admin_level: "Kabupaten/Kota".to_string(),
        regency: Some("Sidoarjo".to_string()),
        province: Some("Jawa Timur".to_string()),
        export_format: "GeoJSON".to_string(),
        output_path: "C:/test/sidoarjo.geojson".to_string(),
        status: "Selesai".to_string(),
        file_size_bytes: Some(1024),
    };

    let id = db.history().insert(&rec).unwrap();
    assert!(id > 0);

    let all = db.history().get_all().unwrap();
    assert_eq!(all.len(), 1);
    assert_eq!(all[0].region_name, "Sidoarjo");

    db.history().delete(id).unwrap();
    let all_after = db.history().get_all().unwrap();
    assert_eq!(all_after.len(), 0);
}

