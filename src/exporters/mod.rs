pub mod csv;
pub mod geojson;
pub mod geopackage;
pub mod geoparquet;
pub mod gml;
pub mod kml;
pub mod shapefile;
pub mod topojson;

use crate::core::downloader::DownloadedRegionData;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ExportFormat {
    GeoJSON,
    Shapefile,
    GeoPackage,
    KML,
    CSV,
    GeoParquet,
    TopoJSON,
    GML,
}

impl ExportFormat {
    pub const ALL: [ExportFormat; 8] = [
        ExportFormat::GeoJSON,
        ExportFormat::Shapefile,
        ExportFormat::GeoPackage,
        ExportFormat::KML,
        ExportFormat::CSV,
        ExportFormat::GeoParquet,
        ExportFormat::TopoJSON,
        ExportFormat::GML,
    ];

    pub fn display_name(&self) -> &'static str {
        match self {
            ExportFormat::GeoJSON => "GeoJSON",
            ExportFormat::Shapefile => "ESRI Shapefile (.zip)",
            ExportFormat::GeoPackage => "GeoPackage",
            ExportFormat::KML => "KML (Google Earth)",
            ExportFormat::CSV => "CSV (Tabel Atribut)",
            ExportFormat::GeoParquet => "GeoParquet",
            ExportFormat::TopoJSON => "TopoJSON",
            ExportFormat::GML => "GML (Geography Markup)",
        }
    }

    pub fn extension(&self) -> &'static str {
        match self {
            ExportFormat::GeoJSON => "geojson",
            ExportFormat::Shapefile => "zip",
            ExportFormat::GeoPackage => "gpkg",
            ExportFormat::KML => "kml",
            ExportFormat::CSV => "csv",
            ExportFormat::GeoParquet => "parquet",
            ExportFormat::TopoJSON => "topojson",
            ExportFormat::GML => "gml",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            ExportFormat::GeoJSON => "Standar geospasial JSON, kompatibel QGIS & WebGIS",
            ExportFormat::Shapefile => "Arsip ZIP berisi .shp, .shx, .dbf, .prj, .cpg UTF-8",
            ExportFormat::GeoPackage => "Database OGC SQLite GeoPackage, standar GIS modern",
            ExportFormat::KML => "Keyhole Markup Language untuk Google Earth & GIS",
            ExportFormat::CSV => "Daftar atribut administratif dan statistik koordinat",
            ExportFormat::GeoParquet => "Format biner Apache Parquet kolumnar dengan metadata geo",
            ExportFormat::TopoJSON => "Format topologi terkompresi efisien untuk web mapping",
            ExportFormat::GML => "Standar XML OGC Geography Markup Language",
        }
    }
}

impl std::fmt::Display for ExportFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

#[derive(Debug, Clone)]
pub struct ExportTaskResult {
    pub format: ExportFormat,
    pub output_path: PathBuf,
    pub file_size_bytes: Option<u64>,
    pub success: bool,
    pub error_message: Option<String>,
}

pub fn export_single(
    format: ExportFormat,
    data: &DownloadedRegionData,
    output_dir: &Path,
    custom_filename: Option<&str>,
) -> ExportTaskResult {
    let sanitized_name = custom_filename
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            let n = &data.item.name;
            n.chars()
                .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
                .collect()
        });

    let filename = format!("{}.{}", sanitized_name, format.extension());
    let output_path = output_dir.join(filename);

    let res = match format {
        ExportFormat::GeoJSON => geojson::export_geojson(data, &output_path),
        ExportFormat::Shapefile => shapefile::export_shapefile(data, &output_path),
        ExportFormat::GeoPackage => geopackage::export_geopackage(data, &output_path),
        ExportFormat::KML => kml::export_kml(data, &output_path),
        ExportFormat::CSV => csv::export_csv(data, &output_path),
        ExportFormat::GeoParquet => geoparquet::export_geoparquet(data, &output_path),
        ExportFormat::TopoJSON => topojson::export_topojson(data, &output_path),
        ExportFormat::GML => gml::export_gml(data, &output_path),
    };

    match res {
        Ok(size) => ExportTaskResult {
            format,
            output_path,
            file_size_bytes: Some(size),
            success: true,
            error_message: None,
        },
        Err(err) => ExportTaskResult {
            format,
            output_path,
            file_size_bytes: None,
            success: false,
            error_message: Some(err),
        },
    }
}
