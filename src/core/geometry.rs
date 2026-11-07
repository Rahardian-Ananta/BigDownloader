use geo::{Coord, LineString, MultiPolygon, Polygon};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BBox {
    pub min_x: f64,
    pub min_y: f64,
    pub max_x: f64,
    pub max_y: f64,
}

impl BBox {
    pub fn new(min_x: f64, min_y: f64, max_x: f64, max_y: f64) -> Self {
        Self {
            min_x,
            min_y,
            max_x,
            max_y,
        }
    }

    pub fn empty() -> Self {
        Self {
            min_x: f64::INFINITY,
            min_y: f64::INFINITY,
            max_x: f64::NEG_INFINITY,
            max_y: f64::NEG_INFINITY,
        }
    }

    pub fn expand_point(&mut self, x: f64, y: f64) {
        if x < self.min_x {
            self.min_x = x;
        }
        if x > self.max_x {
            self.max_x = x;
        }
        if y < self.min_y {
            self.min_y = y;
        }
        if y > self.max_y {
            self.max_y = y;
        }
    }

    pub fn expand_bbox(&mut self, other: &BBox) {
        if other.min_x < self.min_x {
            self.min_x = other.min_x;
        }
        if other.max_x > self.max_x {
            self.max_x = other.max_x;
        }
        if other.min_y < self.min_y {
            self.min_y = other.min_y;
        }
        if other.max_y > self.max_y {
            self.max_y = other.max_y;
        }
    }

    pub fn center(&self) -> (f64, f64) {
        (
            (self.min_x + self.max_x) / 2.0,
            (self.min_y + self.max_y) / 2.0,
        )
    }

    pub fn width(&self) -> f64 {
        if self.max_x > self.min_x {
            self.max_x - self.min_x
        } else {
            0.0
        }
    }

    pub fn height(&self) -> f64 {
        if self.max_y > self.min_y {
            self.max_y - self.min_y
        } else {
            0.0
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RawGeometry {
    Polygon { coordinates: Vec<Vec<[f64; 2]>> },
    MultiPolygon { coordinates: Vec<Vec<Vec<[f64; 2]>>> },
}

impl RawGeometry {
    pub fn bbox(&self) -> BBox {
        let mut bbox = BBox::empty();
        match self {
            RawGeometry::Polygon { coordinates } => {
                for ring in coordinates {
                    for coord in ring {
                        bbox.expand_point(coord[0], coord[1]);
                    }
                }
            }
            RawGeometry::MultiPolygon { coordinates } => {
                for poly in coordinates {
                    for ring in poly {
                        for coord in ring {
                            bbox.expand_point(coord[0], coord[1]);
                        }
                    }
                }
            }
        }
        bbox
    }

    pub fn centroid(&self) -> (f64, f64) {
        let mut sum_x = 0.0;
        let mut sum_y = 0.0;
        let mut count = 0usize;

        match self {
            RawGeometry::Polygon { coordinates } => {
                if let Some(exterior) = coordinates.first() {
                    for pt in exterior {
                        sum_x += pt[0];
                        sum_y += pt[1];
                        count += 1;
                    }
                }
            }
            RawGeometry::MultiPolygon { coordinates } => {
                for poly in coordinates {
                    if let Some(exterior) = poly.first() {
                        for pt in exterior {
                            sum_x += pt[0];
                            sum_y += pt[1];
                            count += 1;
                        }
                    }
                }
            }
        }

        if count > 0 {
            (sum_x / count as f64, sum_y / count as f64)
        } else {
            let (cx, cy) = self.bbox().center();
            (cx, cy)
        }
    }

    pub fn to_geo_multipolygon(&self) -> MultiPolygon<f64> {
        match self {
            RawGeometry::Polygon { coordinates } => {
                if let Some(poly) = rings_to_polygon(coordinates) {
                    MultiPolygon::new(vec![poly])
                } else {
                    MultiPolygon::new(vec![])
                }
            }
            RawGeometry::MultiPolygon { coordinates } => {
                let mut polys = Vec::new();
                for poly_rings in coordinates {
                    if let Some(poly) = rings_to_polygon(poly_rings) {
                        polys.push(poly);
                    }
                }
                MultiPolygon::new(polys)
            }
        }
    }

    pub fn from_geojson_value(val: &serde_json::Value) -> Option<Self> {
        let geom_type = val.get("type")?.as_str()?;
        let coords_val = val.get("coordinates")?;

        match geom_type {
            "Polygon" => {
                let coords: Vec<Vec<[f64; 2]>> = parse_polygon_coords(coords_val)?;
                Some(RawGeometry::Polygon { coordinates: coords })
            }
            "MultiPolygon" => {
                let coords: Vec<Vec<Vec<[f64; 2]>>> = parse_multipolygon_coords(coords_val)?;
                Some(RawGeometry::MultiPolygon { coordinates: coords })
            }
            _ => None,
        }
    }

    pub fn ensure_multipolygon(self) -> Self {
        match self {
            RawGeometry::Polygon { coordinates } => {
                RawGeometry::MultiPolygon {
                    coordinates: vec![coordinates],
                }
            }
            mp @ RawGeometry::MultiPolygon { .. } => mp,
        }
    }
}

fn parse_polygon_coords(val: &serde_json::Value) -> Option<Vec<Vec<[f64; 2]>>> {
    let array = val.as_array()?;
    let mut rings = Vec::new();
    for ring_val in array {
        let ring_arr = ring_val.as_array()?;
        let mut coords = Vec::new();
        for pt_val in ring_arr {
            let pt_arr = pt_val.as_array()?;
            if pt_arr.len() >= 2 {
                let x = pt_arr[0].as_f64()?;
                let y = pt_arr[1].as_f64()?;
                coords.push([x, y]);
            }
        }
        if !coords.is_empty() {
            // Ensure closed ring
            if coords.first() != coords.last() {
                coords.push(*coords.first().unwrap());
            }
            rings.push(coords);
        }
    }
    Some(rings)
}

fn parse_multipolygon_coords(val: &serde_json::Value) -> Option<Vec<Vec<Vec<[f64; 2]>>>> {
    let array = val.as_array()?;
    let mut polys = Vec::new();
    for poly_val in array {
        if let Some(rings) = parse_polygon_coords(poly_val) {
            if !rings.is_empty() {
                polys.push(rings);
            }
        }
    }
    Some(polys)
}

fn rings_to_polygon(rings: &[Vec<[f64; 2]>]) -> Option<Polygon<f64>> {
    if rings.is_empty() {
        return None;
    }
    let exterior_coords: Vec<Coord<f64>> = rings[0]
        .iter()
        .map(|pt| Coord { x: pt[0], y: pt[1] })
        .collect();
    let exterior = LineString::new(exterior_coords);

    let interiors: Vec<LineString<f64>> = rings[1..]
        .iter()
        .map(|ring| {
            let c: Vec<Coord<f64>> = ring
                .iter()
                .map(|pt| Coord { x: pt[0], y: pt[1] })
                .collect();
            LineString::new(c)
        })
        .collect();

    Some(Polygon::new(exterior, interiors))
}

/// Dissolves multiple geometries into a single MultiPolygon.
/// Preserves all islands, holes, and multipart components.
pub fn dissolve_geometries(geoms: &[RawGeometry]) -> RawGeometry {
    let mut all_polys = Vec::new();

    for g in geoms {
        match g {
            RawGeometry::Polygon { coordinates } => {
                if !coordinates.is_empty() {
                    all_polys.push(coordinates.clone());
                }
            }
            RawGeometry::MultiPolygon { coordinates } => {
                for p in coordinates {
                    if !p.is_empty() {
                        all_polys.push(p.clone());
                    }
                }
            }
        }
    }

    RawGeometry::MultiPolygon {
        coordinates: all_polys,
    }
}

