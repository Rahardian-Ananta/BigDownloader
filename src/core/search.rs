use crate::core::big_api::BigApiClient;
use crate::core::metadata::{AdminLevel, LAYER_ID_KABKOTA, LAYER_ID_KECAMATAN};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegionItem {
    pub id: String,
    pub name: String,
    pub level: AdminLevel,
    pub regency: Option<String>,
    pub province: Option<String>,
    pub code: Option<String>,
    pub layer_id: u32,
    pub where_clause: String,
}

pub struct SearchEngine<'a> {
    api: &'a BigApiClient,
}

impl<'a> SearchEngine<'a> {
    pub fn new(api: &'a BigApiClient) -> Self {
        Self { api }
    }

    pub async fn search(
        &self,
        query: &str,
        level: AdminLevel,
        province_filter: Option<&str>,
        offset: usize,
        limit: usize,
    ) -> Result<Vec<RegionItem>, String> {
        let clean_q = query.trim().replace('\'', "''");
        let mut results = Vec::new();

        match level {
            AdminLevel::Provinsi => {
                let where_clause = if clean_q.is_empty() {
                    "WADMPR IS NOT NULL AND WADMPR <> ' '".to_string()
                } else {
                    format!("UPPER(WADMPR) LIKE UPPER('%{}%')", clean_q)
                };

                let out_fields = "WADMPR,KDPPUM";
                let res = self
                    .api
                    .query_attributes(LAYER_ID_KABKOTA, &where_clause, out_fields, offset, limit)
                    .await?;

                let mut seen_provinces = HashSet::new();
                for f in res.features {
                    if let Some(prov) = f.attributes.wadmpr {
                        let prov_trimmed = prov.trim().to_string();
                        if !prov_trimmed.is_empty() && seen_provinces.insert(prov_trimmed.clone()) {
                            let where_geom = format!("WADMPR = '{}'", prov_trimmed.replace('\'', "''"));
                            results.push(RegionItem {
                                id: format!("prov_{}", prov_trimmed),
                                name: prov_trimmed.clone(),
                                level: AdminLevel::Provinsi,
                                regency: None,
                                province: Some(prov_trimmed),
                                code: f.attributes.kdppum.map(|c| c.trim().to_string()),
                                layer_id: LAYER_ID_KABKOTA,
                                where_clause: where_geom,
                            });
                        }
                    }
                }
            }

            AdminLevel::KabupatenKota => {
                let mut where_clause = if clean_q.is_empty() {
                    "NAMOBJ IS NOT NULL AND NAMOBJ <> ' '".to_string()
                } else {
                    format!(
                        "(UPPER(NAMOBJ) LIKE UPPER('%{}%') OR UPPER(WADMKK) LIKE UPPER('%{}%'))",
                        clean_q, clean_q
                    )
                };

                if let Some(pf) = province_filter {
                    let pf_clean = pf.trim().replace('\'', "''");
                    if !pf_clean.is_empty() {
                        where_clause.push_str(&format!(" AND UPPER(WADMPR) = UPPER('{}')", pf_clean));
                    }
                }

                let out_fields = "OBJECTID,NAMOBJ,WADMKK,WADMPR,KDPKAB,KDPPUM";
                let res = self
                    .api
                    .query_attributes(LAYER_ID_KABKOTA, &where_clause, out_fields, offset, limit)
                    .await?;

                let mut seen = HashSet::new();
                for f in res.features {
                    let name = f
                        .attributes
                        .namobj
                        .or(f.attributes.wadmkk.clone())
                        .unwrap_or_default()
                        .trim()
                        .to_string();

                    let prov = f.attributes.wadmpr.map(|s| s.trim().to_string());
                    let reg_key = format!("{}:{}", name, prov.as_deref().unwrap_or(""));

                    if !name.is_empty() && seen.insert(reg_key) {
                        let where_geom = if let Some(oid) = f.attributes.object_id {
                            format!("OBJECTID = {}", oid)
                        } else {
                            format!("NAMOBJ = '{}'", name.replace('\'', "''"))
                        };

                        results.push(RegionItem {
                            id: format!("kab_{}_{}", name, f.attributes.object_id.unwrap_or(0)),
                            name: name.clone(),
                            level: AdminLevel::KabupatenKota,
                            regency: Some(name),
                            province: prov,
                            code: f.attributes.kdpkab.map(|c| c.trim().to_string()),
                            layer_id: LAYER_ID_KABKOTA,
                            where_clause: where_geom,
                        });
                    }
                }
            }

            AdminLevel::Kecamatan => {
                let mut where_clause = if clean_q.is_empty() {
                    "NAMOBJ IS NOT NULL AND NAMOBJ <> ' '".to_string()
                } else {
                    format!(
                        "(UPPER(NAMOBJ) LIKE UPPER('%{}%') OR UPPER(WADMKC) LIKE UPPER('%{}%'))",
                        clean_q, clean_q
                    )
                };

                if let Some(pf) = province_filter {
                    let pf_clean = pf.trim().replace('\'', "''");
                    if !pf_clean.is_empty() {
                        where_clause.push_str(&format!(" AND UPPER(WADMPR) = UPPER('{}')", pf_clean));
                    }
                }

                let out_fields = "OBJECTID,NAMOBJ,WADMKC,WADMKK,WADMPR,KDCPUM,KDPKAB";
                let res = self
                    .api
                    .query_attributes(LAYER_ID_KECAMATAN, &where_clause, out_fields, offset, limit)
                    .await?;

                let mut seen = HashSet::new();
                for f in res.features {
                    let name = f
                        .attributes
                        .namobj
                        .or(f.attributes.wadmkc.clone())
                        .unwrap_or_default()
                        .trim()
                        .to_string();

                    let regency = f.attributes.wadmkk.map(|s| s.trim().to_string());
                    let prov = f.attributes.wadmpr.map(|s| s.trim().to_string());

                    let key = format!(
                        "{}:{}:{}",
                        name,
                        regency.as_deref().unwrap_or(""),
                        prov.as_deref().unwrap_or("")
                    );

                    if !name.is_empty() && seen.insert(key) {
                        let where_geom = if let Some(oid) = f.attributes.object_id {
                            format!("OBJECTID = {}", oid)
                        } else {
                            format!("NAMOBJ = '{}'", name.replace('\'', "''"))
                        };

                        results.push(RegionItem {
                            id: format!("kec_{}_{}", name, f.attributes.object_id.unwrap_or(0)),
                            name: name.clone(),
                            level: AdminLevel::Kecamatan,
                            regency,
                            province: prov,
                            code: f.attributes.kdcpum.map(|c| c.trim().to_string()),
                            layer_id: LAYER_ID_KECAMATAN,
                            where_clause: where_geom,
                        });
                    }
                }
            }

            AdminLevel::DesaKelurahan => {
                // Not queried by default, placeholder for future expansion
            }
        }

        Ok(results)
    }
}
