use crate::core::downloader::DownloadedRegionData;
use crate::core::geometry::RawGeometry;
use std::fs::File;
use std::io::Write;
use std::path::Path;

pub fn export_gml<P: AsRef<Path>>(
    data: &DownloadedRegionData,
    output_path: P,
) -> Result<u64, String> {
    let mut gml = String::with_capacity(32768);
    gml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    gml.push_str("<gml:FeatureCollection\n");
    gml.push_str("  xmlns:gml=\"http://www.opengis.net/gml/3.2\"\n");
    gml.push_str("  xmlns:bapanas=\"http://big.go.id/bapanas\"\n");
    gml.push_str("  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n");
    gml.push_str("  gml:id=\"BIG_Batas_Administrasi\">\n");

    let bbox = &data.bbox;
    gml.push_str("  <gml:boundedBy>\n");
    gml.push_str("    <gml:Envelope srsName=\"urn:ogc:def:crs:EPSG::4326\">\n");
    gml.push_str(&format!(
        "      <gml:lowerCorner>{:.6} {:.6}</gml:lowerCorner>\n",
        bbox.min_y, bbox.min_x
    ));
    gml.push_str(&format!(
        "      <gml:upperCorner>{:.6} {:.6}</gml:upperCorner>\n",
        bbox.max_y, bbox.max_x
    ));
    gml.push_str("    </gml:Envelope>\n");
    gml.push_str("  </gml:boundedBy>\n");

    for (idx, feat) in data.features.iter().enumerate() {
        let feat_id = format!("feature_{}", idx + 1);
        gml.push_str("  <gml:featureMember>\n");
        gml.push_str(&format!("    <bapanas:BatasWilayah gml:id=\"{}\">\n", feat_id));
        gml.push_str(&format!(
            "      <bapanas:nama_wilayah>{}</bapanas:nama_wilayah>\n",
            escape_xml(&data.item.name)
        ));
        gml.push_str(&format!(
            "      <bapanas:tingkat_administrasi>{}</bapanas:tingkat_administrasi>\n",
            escape_xml(&data.item.level.to_string())
        ));
        if let Some(r) = &data.item.regency {
            gml.push_str(&format!(
                "      <bapanas:kabupaten_kota>{}</bapanas:kabupaten_kota>\n",
                escape_xml(r)
            ));
        }
        if let Some(p) = &data.item.province {
            gml.push_str(&format!(
                "      <bapanas:provinsi>{}</bapanas:provinsi>\n",
                escape_xml(p)
            ));
        }
        if let Some(c) = &data.item.code {
            gml.push_str(&format!(
                "      <bapanas:kode_wilayah>{}</bapanas:kode_wilayah>\n",
                escape_xml(c)
            ));
        }

        gml.push_str("      <bapanas:geometry>\n");
        match &feat.geometry {
            RawGeometry::Polygon { coordinates } => {
                gml.push_str("        <gml:Polygon srsName=\"urn:ogc:def:crs:EPSG::4326\">\n");
                render_gml_rings(&mut gml, coordinates);
                gml.push_str("        </gml:Polygon>\n");
            }
            RawGeometry::MultiPolygon { coordinates } => {
                gml.push_str("        <gml:MultiSurface srsName=\"urn:ogc:def:crs:EPSG::4326\">\n");
                for poly in coordinates {
                    gml.push_str("          <gml:surfaceMember>\n");
                    gml.push_str("            <gml:Polygon>\n");
                    render_gml_rings(&mut gml, poly);
                    gml.push_str("            </gml:Polygon>\n");
                    gml.push_str("          </gml:surfaceMember>\n");
                }
                gml.push_str("        </gml:MultiSurface>\n");
            }
        }
        gml.push_str("      </bapanas:geometry>\n");

        gml.push_str("    </bapanas:BatasWilayah>\n");
        gml.push_str("  </gml:featureMember>\n");
    }

    gml.push_str("</gml:FeatureCollection>\n");

    let mut file = File::create(&output_path)
        .map_err(|e| format!("Gagal membuat file GML: {}", e))?;

    file.write_all(gml.as_bytes())
        .map_err(|e| format!("Gagal menulis data GML: {}", e))?;

    Ok(gml.len() as u64)
}

fn render_gml_rings(gml: &mut String, rings: &[Vec<[f64; 2]>]) {
    if let Some(exterior) = rings.first() {
        gml.push_str("            <gml:exterior>\n");
        gml.push_str("              <gml:LinearRing>\n");
        gml.push_str("                <gml:posList>");
        for pt in exterior {
            gml.push_str(&format!("{} {} ", pt[1], pt[0]));
        }
        gml.push_str("</gml:posList>\n");
        gml.push_str("              </gml:LinearRing>\n");
        gml.push_str("            </gml:exterior>\n");
    }

    for interior in rings.iter().skip(1) {
        gml.push_str("            <gml:interior>\n");
        gml.push_str("              <gml:LinearRing>\n");
        gml.push_str("                <gml:posList>");
        for pt in interior {
            gml.push_str(&format!("{} {} ", pt[1], pt[0]));
        }
        gml.push_str("</gml:posList>\n");
        gml.push_str("              </gml:LinearRing>\n");
        gml.push_str("            </gml:interior>\n");
    }
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
