use crate::core::geometry::RawGeometry;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ValidationError {
    EmptyGeometry,
    RingTooSmall(usize),
    RingNotClosed,
    CoordinatesOutOfBounds(f64, f64),
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::EmptyGeometry => write!(f, "Geometry contains no coordinates"),
            ValidationError::RingTooSmall(n) => {
                write!(f, "Polygon ring must have at least 4 points (has {})", n)
            }
            ValidationError::RingNotClosed => write!(f, "Polygon ring is not closed"),
            ValidationError::CoordinatesOutOfBounds(x, y) => {
                write!(f, "Coordinates out of WGS84 bounds: lon={}, lat={}", x, y)
            }
        }
    }
}

impl std::error::Error for ValidationError {}

pub fn validate_geometry(geom: &RawGeometry) -> Result<(), ValidationError> {
    match geom {
        RawGeometry::Polygon { coordinates } => {
            if coordinates.is_empty() {
                return Err(ValidationError::EmptyGeometry);
            }
            for ring in coordinates {
                validate_ring(ring)?;
            }
        }
        RawGeometry::MultiPolygon { coordinates } => {
            if coordinates.is_empty() {
                return Err(ValidationError::EmptyGeometry);
            }
            for poly in coordinates {
                if poly.is_empty() {
                    return Err(ValidationError::EmptyGeometry);
                }
                for ring in poly {
                    validate_ring(ring)?;
                }
            }
        }
    }
    Ok(())
}

fn validate_ring(ring: &[[f64; 2]]) -> Result<(), ValidationError> {
    if ring.len() < 4 {
        return Err(ValidationError::RingTooSmall(ring.len()));
    }
    if ring.first() != ring.last() {
        return Err(ValidationError::RingNotClosed);
    }
    for pt in ring {
        let lon = pt[0];
        let lat = pt[1];
        if !(-180.0..=180.0).contains(&lon) || !(-90.0..=90.0).contains(&lat) {
            return Err(ValidationError::CoordinatesOutOfBounds(lon, lat));
        }
    }
    Ok(())
}
