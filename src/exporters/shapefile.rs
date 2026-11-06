use crate::core::downloader::DownloadedRegionData;
use crate::core::geometry::RawGeometry;
use byteorder::{BigEndian, LittleEndian, WriteBytesExt};
use std::fs::File;
use std::io::{Cursor, Write};
use std::path::Path;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

const WGS84_PRJ: &str = "GEOGCS[\"GCS_WGS_1984\",DATUM[\"D_WGS_1984\",SPHEROID[\"WGS_1984\",6378137.0,298.257223563]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]]";

pub fn export_shapefile<P: AsRef<Path>>(
    data: &DownloadedRegionData,
    output_zip_path: P,
) -> Result<u64, String> {
    let base_name = sanitize_filename(&data.item.name);

    // Build .shp and .shx buffers
    let (shp_bytes, shx_bytes) = build_shp_and_shx(data)?;

    // Build .dbf buffer
    let dbf_bytes = build_dbf(data)?;

    // Build .prj and .cpg
    let prj_bytes = WGS84_PRJ.as_bytes();
    let cpg_bytes = b"UTF-8";

    // Create the ZIP archive
    let zip_file = File::create(&output_zip_path)
        .map_err(|e| format!("Gagal membuat file ZIP Shapefile: {}", e))?;

    let mut zip = ZipWriter::new(zip_file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Add .shp
    zip.start_file(format!("{}.shp", base_name), options)
        .map_err(|e| e.to_string())?;
    zip.write_all(&shp_bytes).map_err(|e| e.to_string())?;

    // Add .shx
    zip.start_file(format!("{}.shx", base_name), options)
        .map_err(|e| e.to_string())?;
    zip.write_all(&shx_bytes).map_err(|e| e.to_string())?;

    // Add .dbf
    zip.start_file(format!("{}.dbf", base_name), options)
        .map_err(|e| e.to_string())?;
    zip.write_all(&dbf_bytes).map_err(|e| e.to_string())?;

    // Add .prj
    zip.start_file(format!("{}.prj", base_name), options)
        .map_err(|e| e.to_string())?;
    zip.write_all(prj_bytes).map_err(|e| e.to_string())?;

    // Add .cpg
    zip.start_file(format!("{}.cpg", base_name), options)
        .map_err(|e| e.to_string())?;
    zip.write_all(cpg_bytes).map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;

    let meta = std::fs::metadata(&output_zip_path)
        .map_err(|e| format!("Gagal membaca metadata Shapefile ZIP: {}", e))?;

    Ok(meta.len())
}

fn build_shp_and_shx(data: &DownloadedRegionData) -> Result<(Vec<u8>, Vec<u8>), String> {
    let mut shp_records = Vec::new();
    let mut shx_records = Vec::new();

    let mut current_offset_words = 50i32; // 100 bytes = 50 16-bit words

    for (idx, feat) in data.features.iter().enumerate() {
        let record_num = (idx + 1) as i32;
        let feat_bbox = feat.geometry.bbox();

        // Collect parts and points
        let mut parts = Vec::new();
        let mut points = Vec::new();

        match &feat.geometry {
            RawGeometry::Polygon { coordinates } => {
                for ring in coordinates {
                    parts.push(points.len() as i32);
                    for pt in ring {
                        points.push(*pt);
                    }
                }
            }
            RawGeometry::MultiPolygon { coordinates } => {
                for poly in coordinates {
                    for ring in poly {
                        parts.push(points.len() as i32);
                        for pt in ring {
                            points.push(*pt);
                        }
                    }
                }
            }
        }

        let num_parts = parts.len() as i32;
        let num_points = points.len() as i32;

        // Content length in 16-bit words:
        // shape_type(2 words) + bbox(16 words) + num_parts(2 words) + num_points(2 words)
        // + parts(num_parts * 2 words) + points(num_points * 8 words)
        let content_length_bytes = 4 + 32 + 4 + 4 + (num_parts * 4) + (num_points * 16);
        let content_length_words = content_length_bytes / 2;

        // Record header in SHP:
        shp_records.write_i32::<BigEndian>(record_num).map_err(|e| e.to_string())?;
        shp_records.write_i32::<BigEndian>(content_length_words).map_err(|e| e.to_string())?;

        // Record content in SHP:
        shp_records.write_i32::<LittleEndian>(5).map_err(|e| e.to_string())?; // Shape type 5 = Polygon
        shp_records.write_f64::<LittleEndian>(feat_bbox.min_x).map_err(|e| e.to_string())?;
        shp_records.write_f64::<LittleEndian>(feat_bbox.min_y).map_err(|e| e.to_string())?;
        shp_records.write_f64::<LittleEndian>(feat_bbox.max_x).map_err(|e| e.to_string())?;
        shp_records.write_f64::<LittleEndian>(feat_bbox.max_y).map_err(|e| e.to_string())?;
        shp_records.write_i32::<LittleEndian>(num_parts).map_err(|e| e.to_string())?;
        shp_records.write_i32::<LittleEndian>(num_points).map_err(|e| e.to_string())?;

        for p_idx in parts {
            shp_records.write_i32::<LittleEndian>(p_idx).map_err(|e| e.to_string())?;
        }
        for pt in points {
            shp_records.write_f64::<LittleEndian>(pt[0]).map_err(|e| e.to_string())?;
            shp_records.write_f64::<LittleEndian>(pt[1]).map_err(|e| e.to_string())?;
        }

        // Record in SHX:
        shx_records.write_i32::<BigEndian>(current_offset_words).map_err(|e| e.to_string())?;
        shx_records.write_i32::<BigEndian>(content_length_words).map_err(|e| e.to_string())?;

        current_offset_words += 4 + content_length_words; // 4 words for record header
    }

    let overall_bbox = &data.bbox;

    // Build 100-byte header for SHP
    let shp_total_words = 50 + (shp_records.len() as i32 / 2);
    let mut shp_file = Vec::with_capacity(100 + shp_records.len());
    write_shapefile_header(&mut shp_file, shp_total_words, overall_bbox)?;
    shp_file.extend_from_slice(&shp_records);

    // Build 100-byte header for SHX
    let shx_total_words = 50 + (shx_records.len() as i32 / 2);
    let mut shx_file = Vec::with_capacity(100 + shx_records.len());
    write_shapefile_header(&mut shx_file, shx_total_words, overall_bbox)?;
    shx_file.extend_from_slice(&shx_records);

    Ok((shp_file, shx_file))
}

fn write_shapefile_header(
    buf: &mut Vec<u8>,
    file_length_words: i32,
    bbox: &crate::core::geometry::BBox,
) -> Result<(), String> {
    buf.write_i32::<BigEndian>(9994).map_err(|e| e.to_string())?; // File Code
    for _ in 0..5 {
        buf.write_i32::<BigEndian>(0).map_err(|e| e.to_string())?; // Unused
    }
    buf.write_i32::<BigEndian>(file_length_words).map_err(|e| e.to_string())?; // File Length
    buf.write_i32::<LittleEndian>(1000).map_err(|e| e.to_string())?; // Version
    buf.write_i32::<LittleEndian>(5).map_err(|e| e.to_string())?; // Shape Type 5 (Polygon)

    buf.write_f64::<LittleEndian>(bbox.min_x).map_err(|e| e.to_string())?;
    buf.write_f64::<LittleEndian>(bbox.min_y).map_err(|e| e.to_string())?;
    buf.write_f64::<LittleEndian>(bbox.max_x).map_err(|e| e.to_string())?;
    buf.write_f64::<LittleEndian>(bbox.max_y).map_err(|e| e.to_string())?;

    buf.write_f64::<LittleEndian>(0.0).map_err(|e| e.to_string())?; // Zmin
    buf.write_f64::<LittleEndian>(0.0).map_err(|e| e.to_string())?; // Zmax
    buf.write_f64::<LittleEndian>(0.0).map_err(|e| e.to_string())?; // Mmin
    buf.write_f64::<LittleEndian>(0.0).map_err(|e| e.to_string())?; // Mmax

    Ok(())
}

fn build_dbf(data: &DownloadedRegionData) -> Result<Vec<u8>, String> {
    let mut buf = Vec::new();
    let num_records = data.features.len() as u32;

    // Fields definition:
    // (Name, Type, Length, Decimals)
    let fields = [
        ("NAMOBJ", b'C', 50u8, 0u8),
        ("TINGKAT", b'C', 25u8, 0u8),
        ("KABKOTA", b'C', 50u8, 0u8),
        ("PROVINSI", b'C', 50u8, 0u8),
        ("KODE", b'C', 20u8, 0u8),
        ("LUAS_HA", b'N', 16u8, 2u8),
    ];

    let header_length = (32 + (fields.len() * 32) + 1) as u16;
    let mut record_length = 1u16; // 1 byte delete flag
    for f in &fields {
        record_length += f.2 as u16;
    }

    // 32-byte DBF header
    buf.push(0x03); // dBase III
    buf.push(26);   // Year - 2000
    buf.push(11);   // Month
    buf.push(7);    // Day
    buf.write_u32::<LittleEndian>(num_records).map_err(|e| e.to_string())?;
    buf.write_u16::<LittleEndian>(header_length).map_err(|e| e.to_string())?;
    buf.write_u16::<LittleEndian>(record_length).map_err(|e| e.to_string())?;
    buf.extend_from_slice(&[0u8; 20]); // Reserved

    // Field descriptor array
    for f in &fields {
        let mut name_bytes = [0u8; 11];
        let name_slice = f.0.as_bytes();
        let copy_len = name_slice.len().min(10);
        name_bytes[..copy_len].copy_from_slice(&name_slice[..copy_len]);
        buf.extend_from_slice(&name_bytes);
        buf.push(f.1); // Type
        buf.extend_from_slice(&[0u8; 4]); // Field data address
        buf.push(f.2); // Length
        buf.push(f.3); // Decimals
        buf.extend_from_slice(&[0u8; 14]); // Reserved
    }

    buf.push(0x0D); // Header record terminator

    // Records
    for feat in &data.features {
        buf.push(0x20); // 0x20 = Valid record (not deleted)

        // NAMOBJ
        let name_str = feat
            .attributes
            .get("NAMOBJ")
            .and_then(|v| v.as_str())
            .unwrap_or(&data.item.name);
        write_fixed_string(&mut buf, name_str, 50);

        // TINGKAT
        write_fixed_string(&mut buf, &data.item.level.to_string(), 25);

        // KABKOTA
        let reg_str = data.item.regency.as_deref().unwrap_or("");
        write_fixed_string(&mut buf, reg_str, 50);

        // PROVINSI
        let prov_str = data.item.province.as_deref().unwrap_or("");
        write_fixed_string(&mut buf, prov_str, 50);

        // KODE
        let code_str = data.item.code.as_deref().unwrap_or("");
        write_fixed_string(&mut buf, code_str, 20);

        // LUAS_HA
        let luas_str = feat
            .attributes
            .get("LUASWH")
            .and_then(|v| v.as_f64())
            .map(|l| format!("{:.2}", l))
            .unwrap_or_default();
        write_fixed_string(&mut buf, &luas_str, 16);
    }

    buf.push(0x1A); // EOF marker

    Ok(buf)
}

fn write_fixed_string(buf: &mut Vec<u8>, s: &str, target_len: usize) {
    let bytes = s.as_bytes();
    if bytes.len() >= target_len {
        buf.extend_from_slice(&bytes[..target_len]);
    } else {
        buf.extend_from_slice(bytes);
        buf.extend(std::iter::repeat(b' ').take(target_len - bytes.len()));
    }
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
        .collect()
}
