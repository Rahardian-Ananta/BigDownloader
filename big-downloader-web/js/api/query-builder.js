/**
 * BIG Downloader Web — ArcGIS Query Builder
 */

export class QueryBuilder {
  /**
   * Escape single quotes for ArcGIS SQL where clause
   * @param {string} val 
   * @returns {string}
   */
  static escapeSQL(val) {
    if (!val) return '';
    return val.replace(/'/g, "''").trim();
  }

  /**
   * Build WHERE clause for searching by region name
   * @param {string} queryText 
   * @param {Object} [hierarchyFilter] - Optional province or regency filter
   * @returns {string}
   */
  static buildSearchWhere(queryText, hierarchyFilter = {}) {
    const clauses = [];
    const cleanQuery = this.escapeSQL(queryText).toUpperCase();

    if (cleanQuery) {
      // ArcGIS supports UPPER() in WHERE clause
      clauses.push(`(UPPER(NAMOBJ) LIKE '%${cleanQuery}%' OR UPPER(WADMKK) LIKE '%${cleanQuery}%' OR UPPER(WADMKC) LIKE '%${cleanQuery}%')`);
    } else {
      clauses.push('1=1');
    }

    if (hierarchyFilter.province) {
      const prov = this.escapeSQL(hierarchyFilter.province);
      clauses.push(`WADMPR = '${prov}'`);
    }

    if (hierarchyFilter.regency) {
      const reg = this.escapeSQL(hierarchyFilter.regency);
      clauses.push(`WADMKK = '${reg}'`);
    }

    return clauses.join(' AND ');
  }

  /**
   * Build WHERE clause to fetch all districts or regencies of a specific province
   * @param {string} provinceName 
   * @returns {string}
   */
  static buildProvinceWhere(provinceName) {
    const prov = this.escapeSQL(provinceName);
    return `WADMPR = '${prov}'`;
  }

  /**
   * Build WHERE clause to fetch single feature by OBJECTID
   * @param {number|string} objectId 
   * @returns {string}
   */
  static buildObjectIdWhere(objectId) {
    return `OBJECTID = ${Number(objectId)}`;
  }
}

