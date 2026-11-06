use crate::core::metadata::{
    AdminLevel, BIG_BASE_MAPSERVER_URL, LAYER_ID_KABKOTA, LAYER_ID_KECAMATAN,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiFeatureAttributes {
    #[serde(rename = "OBJECTID")]
    pub object_id: Option<i64>,
    #[serde(rename = "NAMOBJ")]
    pub namobj: Option<String>,
    #[serde(rename = "WADMPR")]
    pub wadmpr: Option<String>,
    #[serde(rename = "WADMKK")]
    pub wadmkk: Option<String>,
    #[serde(rename = "WADMKC")]
    pub wadmkc: Option<String>,
    #[serde(rename = "WADMKD")]
    pub wadmkd: Option<String>,
    #[serde(rename = "KDPKAB")]
    pub kdpkab: Option<String>,
    #[serde(rename = "KDPPUM")]
    pub kdppum: Option<String>,
    #[serde(rename = "KDCPUM")]
    pub kdcpum: Option<String>,
    #[serde(rename = "LUASWH")]
    pub luaswh: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiQueryResult {
    pub features: Vec<ApiFeature>,
    #[serde(rename = "exceededTransferLimit", default)]
    pub exceeded_transfer_limit: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiFeature {
    pub attributes: ApiFeatureAttributes,
}

pub struct BigApiClient {
    client: Client,
    base_url: String,
    timeout_secs: u64,
    retry_count: u32,
}

impl BigApiClient {
    pub fn new(timeout_secs: u64, retry_count: u32) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(timeout_secs))
            .danger_accept_invalid_certs(true)
            .user_agent("BIG-Downloader-Rust/0.1.0 (Windows/Debian; Indonesia Geospatial)")
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            base_url: BIG_BASE_MAPSERVER_URL.to_string(),
            timeout_secs,
            retry_count,
        }
    }

    pub fn with_base_url(mut self, base_url: String) -> Self {
        self.base_url = base_url;
        self
    }

    async fn execute_with_retry<F, Fut, T>(&self, op_name: &str, mut f: F) -> Result<T, String>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<T, reqwest::Error>>,
    {
        let mut attempts = 0;
        let mut delay = Duration::from_millis(1000);

        loop {
            attempts += 1;
            match f().await {
                Ok(val) => return Ok(val),
                Err(err) => {
                    tracing::warn!(
                        "API {} attempt {}/{} failed: {}",
                        op_name,
                        attempts,
                        self.retry_count + 1,
                        err
                    );
                    if attempts > self.retry_count {
                        return Err(format!(
                            "Gagal menghubungi BIG API ({}) setelah {} percobaan: {}",
                            op_name, attempts, err
                        ));
                    }
                    tokio::time::sleep(delay).await;
                    delay = delay.saturating_mul(2);
                }
            }
        }
    }

    /// Health check for BIG MapServer
    pub async fn check_health(&self) -> Result<bool, String> {
        let url = format!("{}?f=pjson", self.base_url);
        let resp = self
            .execute_with_retry("check_health", || self.client.get(&url).send())
            .await?;

        if resp.status().is_success() {
            let text = resp.text().await.map_err(|e| e.to_string())?;
            if text.contains("currentVersion") || text.contains("Batas") {
                return Ok(true);
            }
        }
        Ok(false)
    }

    /// Search attributes without geometry for high performance
    pub async fn query_attributes(
        &self,
        layer_id: u32,
        where_clause: &str,
        out_fields: &str,
        offset: usize,
        record_count: usize,
    ) -> Result<ApiQueryResult, String> {
        let url = format!("{}/{}/query", self.base_url, layer_id);

        let query_params = [
            ("where", where_clause),
            ("outFields", out_fields),
            ("returnGeometry", "false"),
            ("f", "json"),
            ("resultOffset", &offset.to_string()),
            ("resultRecordCount", &record_count.to_string()),
        ];

        let resp = self
            .execute_with_retry("query_attributes", || {
                self.client.get(&url).query(&query_params).send()
            })
            .await?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| e.to_string())?;

        if !status.is_success() {
            return Err(format!("BIG API HTTP {}: {}", status, text));
        }

        let result: ApiQueryResult = serde_json::from_str(&text).map_err(|e| {
            format!(
                "Gagal parsing respons API (Layer {}): {}. Raw: {}",
                layer_id,
                e,
                if text.len() > 200 { &text[..200] } else { &text }
            )
        })?;

        Ok(result)
    }

    /// Fetch full GeoJSON features with geometry
    pub async fn query_geojson(
        &self,
        layer_id: u32,
        where_clause: &str,
        out_fields: &str,
        offset: usize,
        record_count: usize,
    ) -> Result<serde_json::Value, String> {
        let url = format!("{}/{}/query", self.base_url, layer_id);

        let query_params = [
            ("where", where_clause),
            ("outFields", out_fields),
            ("returnGeometry", "true"),
            ("outSR", "4326"),
            ("f", "geojson"),
            ("resultOffset", &offset.to_string()),
            ("resultRecordCount", &record_count.to_string()),
        ];

        let resp = self
            .execute_with_retry("query_geojson", || {
                self.client.get(&url).query(&query_params).send()
            })
            .await?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| e.to_string())?;

        if !status.is_success() {
            return Err(format!("BIG API HTTP {}: {}", status, text));
        }

        let val: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| format!("Gagal memproses GeoJSON dari BIG: {}", e))?;

        Ok(val)
    }
}
