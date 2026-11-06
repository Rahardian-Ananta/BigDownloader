use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadRecord {
    pub id: i64,
    pub region_name: String,
    pub admin_level: String,
    pub regency: Option<String>,
    pub province: Option<String>,
    pub export_format: String,
    pub timestamp: DateTime<Utc>,
    pub output_path: String,
    pub status: String,
    pub file_size_bytes: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewDownloadRecord {
    pub region_name: String,
    pub admin_level: String,
    pub regency: Option<String>,
    pub province: Option<String>,
    pub export_format: String,
    pub output_path: String,
    pub status: String,
    pub file_size_bytes: Option<i64>,
}

pub struct HistoryDb<'a> {
    conn: &'a Connection,
}

impl<'a> HistoryDb<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn insert(&self, record: &NewDownloadRecord) -> Result<i64> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO download_history (region_name, admin_level, regency, province, export_format, timestamp, output_path, status, file_size_bytes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                record.region_name,
                record.admin_level,
                record.regency,
                record.province,
                record.export_format,
                now,
                record.output_path,
                record.status,
                record.file_size_bytes,
            ],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_all(&self) -> Result<Vec<DownloadRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, region_name, admin_level, regency, province, export_format, timestamp, output_path, status, file_size_bytes
             FROM download_history ORDER BY id DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let ts_str: String = row.get(6)?;
            let ts = DateTime::parse_from_rfc3339(&ts_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(DownloadRecord {
                id: row.get(0)?,
                region_name: row.get(1)?,
                admin_level: row.get(2)?,
                regency: row.get(3)?,
                province: row.get(4)?,
                export_format: row.get(5)?,
                timestamp: ts,
                output_path: row.get(7)?,
                status: row.get(8)?,
                file_size_bytes: row.get(9)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn delete(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM download_history WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn clear_all(&self) -> Result<()> {
        self.conn.execute("DELETE FROM download_history", [])?;
        Ok(())
    }

    pub fn count(&self) -> Result<i64> {
        let mut stmt = self.conn.prepare("SELECT COUNT(*) FROM download_history")?;
        let count: i64 = stmt.query_row([], |r| r.get(0))?;
        Ok(count)
    }
}
