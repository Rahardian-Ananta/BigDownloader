pub mod history;
pub mod settings;

use rusqlite::{Connection, Result};
use std::path::Path;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Self { conn };
        db.init_tables()?;
        Ok(db)
    }

    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Self { conn };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS download_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                region_name TEXT NOT NULL,
                admin_level TEXT NOT NULL,
                regency TEXT,
                province TEXT,
                export_format TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                output_path TEXT NOT NULL,
                status TEXT NOT NULL,
                file_size_bytes INTEGER
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_history_timestamp ON download_history(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_history_region ON download_history(region_name);
            ",
        )?;
        Ok(())
    }

    pub fn history(&self) -> history::HistoryDb {
        history::HistoryDb::new(&self.conn)
    }

    pub fn settings(&self) -> settings::SettingsDb {
        settings::SettingsDb::new(&self.conn)
    }
}

