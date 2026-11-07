use directories::{ProjectDirs, UserDirs};
use std::path::PathBuf;

const QUALIFIER: &str = "id";
const ORGANIZATION: &str = "big-downloader";
const APPLICATION: &str = "big-downloader";

pub fn get_app_dir() -> PathBuf {
    if let Some(proj_dirs) = ProjectDirs::from(QUALIFIER, ORGANIZATION, APPLICATION) {
        let dir = proj_dirs.data_local_dir().to_path_buf();
        let _ = std::fs::create_dir_all(&dir);
        dir
    } else {
        let fallback = PathBuf::from("./big_downloader_data");
        let _ = std::fs::create_dir_all(&fallback);
        fallback
    }
}

pub fn get_log_dir() -> PathBuf {
    let dir = get_app_dir().join("logs");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn get_db_path() -> PathBuf {
    get_app_dir().join("big_downloader.db")
}

pub fn get_cache_dir() -> PathBuf {
    let dir = get_app_dir().join("cache");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn get_default_download_dir() -> PathBuf {
    if let Some(user_dirs) = UserDirs::new() {
        if let Some(download_dir) = user_dirs.download_dir() {
            let app_download_dir = download_dir.join("BIG_Downloader");
            let _ = std::fs::create_dir_all(&app_download_dir);
            return app_download_dir;
        }
    }
    let fallback = PathBuf::from("./downloads");
    let _ = std::fs::create_dir_all(&fallback);
    fallback
}

