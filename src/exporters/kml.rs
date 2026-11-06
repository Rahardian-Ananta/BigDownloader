use crate::core::downloader::DownloadedRegionData;
use crate::core::geometry::RawGeometry;
use std::fs::File;
use std::io::Write;
use std::path::Path;

pub fn export_kml<P: AsRef<Path>>(
    data: &DownloadedRegionData,
    output_path: P,
) -> Result<u64, String> {
    let mut kml = String::with_capacity(32768);
    kml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    kml.push_str("<kml xmlns=\"http://www.opengis.net/kml/2.2\">\n");
    kml.push_str("  <Document>\n");
    kml.push_str(&format!(
        "    <name>{}</name>\n",
        quick_xml_escape(&data.item.name)
    ));
    kml.push_str(&format!(
        "    <description>Batas Wilayah {} - Sumber: Badan Informasi Geospasial</description>\n",
        quick_xml_escape(&data.item.level.to_string())
    ));

    // Style for boundaries
    kml.push_str("    <Style id=\"boundaryStyle\">\n");
    kml.push_str("      <LineStyle>\n");
    kml.push_str("        <color>ff0000ff</color>\n");
    kml.push_str("        <width>2</width>\n");
    kml.push_str("      </LineStyle>\n");
    kml.push_str("      <PolyStyle>\n");
    kml.push_str("        <color>40ff0000</color>\n");
    kml.push_str("        <fill>1</fill>\n");
    kml.push_str("        <outline>1</outline>\n");
    kml.push_str("      </PolyStyle>\n");
    kml.push_str("    </Style>\n");

    for (idx, feat) in data.features.iter().enumerate() {
        let feat_name = feat
            .attributes
            .get("NAMOBJ")
            .and_then(|v| v.as_str())
            .unwrap_or(&data.item.name);

        kml.push_str("    <Placemark>\n");
        kml.push_str(&format!(
            "      <name>{}_{}</name>\n",
            quick_xml_escape(feat_name),
            idx + 1
        ));
        kml.push_str("      <styleUrl>#boundaryStyle</styleUrl>\n");
        kml.push_str("      <ExtendedData>\n");
        kml.push_str(&format!(
            "        <Data name=\"Tingkat\"><value>{}</value></Data>\n",
            quick_xml_escape(&data.item.level.to_string())
        ));
        if let Some(p) = &data.item.province {
            kml.push_str(&format!(
                "        <Data name=\"Provinsi\"><value>{}</value></Data>\n",
                quick_xml_escape(p)
            ));
        }
        if let Some(r) = &data.item.regency {
            kml.push_str(&format!(
                "        <Data name=\"Kabupaten\"><value>{}</value></Data>\n",
                quick_xml_escape(r)
            ));
        }
        if let Some(c) = &data.item.code {
            kml.push_str(&format!(
                "        <Data name=\"KodeWilayah\"><value>{}</value></Data>\n",
                quick_xml_escape(c)
            ));
        }
        kml.push_str("      </ExtendedData>\n");

        match &feat.geometry {
            RawGeometry::Polygon { coordinates } => {
                kml.push_str("      <Polygon>\n");
                render_polygon_rings(&mut kml, coordinates);
                kml.push_str("      </Polygon>\n");
            }
            RawGeometry::MultiPolygon { coordinates } => {
                kml.push_str("      <MultiGeometry>\n");
                for poly in coordinates {
                    kml.push_str("        <Polygon>\n");
                    render_polygon_rings(&mut kml, poly);
                    kml.push_str("        </Polygon>\n");
                }
                kml.push_str("      </MultiGeometry>\n");
            }
        }

        kml.push_str("    </Placemark>\n");
    }

    kml.push_str("  </Document>\n");
    kml.push_str("</kml>\n");

    let mut file = File::create(&output_path)
        .map_err(|e| format!("Gagal membuat file KML: {}", e))?;

    file.write_all(kml.as_bytes())
        .map_err(|e| format!("Gagal menulis data KML: {}", e))?;

    Ok(kml.len() as u64)
}

fn render_polygon_rings(kml: &mut String, rings: &[Vec<[f64; 2]>]) {
    if let Some(exterior) = rings.first() {
        kml.push_str("        <outerBoundaryIs>\n");
        kml.push_str("          <LinearRing>\n");
        kml.push_str("            <coordinates>\n");
        for pt in exterior {
            kml.push_str(&format!("{},{},0 ", pt[0], pt[1]));
        }
        kml.push_str("\n            </coordinates>\n");
        kml.push_str("          </LinearRing>\n");
        kml.push_str("        </outerBoundaryIs>\n");
    }

    for interior in rings.iter().skip(1) {
        kml.push_str("        <innerBoundaryIs>\n");
        kml.push_str("          <LinearRing>\n");
        kml.push_str("            <coordinates>\n");
        for pt in interior {
            kml.push_str(&format!("{},{},0 ", pt[0], pt[1]));
        }
        kml.push_str("\n            </coordinates>\n");
        kml.push_str("          </LinearRing>\n");
        kml.push_str("        </innerBoundaryIs>\n");
    }
}

fn quick_xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
