use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub download_dir: String,
    pub dark_theme: bool,
    pub http_timeout_secs: u64,
    pub retry_count: u32,
    pub show_basemap: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            download_dir: crate::utils::paths::get_default_download_dir()
                .to_string_lossy()
                .to_string(),
            dark_theme: true,
            http_timeout_secs: 60,
            retry_count: 3,
            show_basemap: true,
        }
    }
}

pub struct SettingsDb<'a> {
    conn: &'a Connection,
}

impl<'a> SettingsDb<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn get_value(&self, key: &str) -> Result<Option<String>> {
        let mut stmt = self.conn.prepare("SELECT value FROM app_settings WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;
        if let Some(row) = rows.next()? {
            let val: String = row.get(0)?;
            Ok(Some(val))
        } else {
            Ok(None)
        }
    }

    pub fn set_value(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn load_settings(&self) -> AppSettings {
        let mut settings = AppSettings::default();

        if let Ok(Some(dir)) = self.get_value("download_dir") {
            settings.download_dir = dir;
        }
        if let Ok(Some(theme)) = self.get_value("theme") {
            settings.dark_theme = theme == "dark";
        }
        if let Ok(Some(timeout)) = self.get_value("http_timeout_secs") {
            if let Ok(t) = timeout.parse::<u64>() {
                settings.http_timeout_secs = t;
            }
        }
        if let Ok(Some(retries)) = self.get_value("retry_count") {
            if let Ok(r) = retries.parse::<u32>() {
                settings.retry_count = r;
            }
        }
        if let Ok(Some(basemap)) = self.get_value("show_basemap") {
            settings.show_basemap = basemap == "true";
        }

        settings
    }

    pub fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        self.set_value("download_dir", &settings.download_dir)?;
        self.set_value("theme", if settings.dark_theme { "dark" } else { "light" })?;
        self.set_value("http_timeout_secs", &settings.http_timeout_secs.to_string())?;
        self.set_value("retry_count", &settings.retry_count.to_string())?;
        self.set_value("show_basemap", if settings.show_basemap { "true" } else { "false" })?;
        Ok(())
    }
}
