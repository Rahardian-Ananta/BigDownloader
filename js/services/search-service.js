/**
 * BIG Downloader Web — Search Service
 */
import { bigApi, LAYER_KABKOTA, LAYER_KECAMATAN } from '../api/big-api.js';
import { QueryBuilder } from '../api/query-builder.js';
import { normalizeName } from '../utils/helpers.js';

export class SearchService {
  constructor() {
    this.provinceCache = null;
    this.currentAbortController = null;
  }

  /**
   * Cancel ongoing search request
   */
  cancelOngoing() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  /**
   * Fetch and cache all Indonesian provinces from BIG Layer 0
   * @returns {Promise<string[]>}
   */
  async getProvinces() {
    if (this.provinceCache && this.provinceCache.length > 0) {
      return this.provinceCache;
    }

    try {
      const res = await bigApi.queryAttributes({
        layerId: LAYER_KABKOTA,
        where: '1=1',
        outFields: 'WADMPR',
        offset: 0,
        recordCount: 1000
      });

      const provSet = new Set();
      for (const f of res.features) {
        const prov = f.attributes?.WADMPR;
        if (prov && prov.trim() && prov.trim() !== 'null') {
          provSet.add(prov.trim());
        }
      }

      this.provinceCache = Array.from(provSet).sort();
      return this.provinceCache;
    } catch (err) {
      console.warn('Gagal memuat daftar provinsi otomatis, menggunakan fallback daftar resmi:', err);
      // Reliable fallback standard list of 38 Indonesian provinces
      this.provinceCache = [
        "ACEH", "BALI", "BANTEN", "BENGKULU", "DI YOGYAKARTA", "DKI JAKARTA",
        "GORONTALO", "JAMBI", "JAWA BARAT", "JAWA TENGAH", "JAWA TIMUR",
        "KALIMANTAN BARAT", "KALIMANTAN SELATAN", "KALIMANTAN TENGAH", "KALIMANTAN TIMUR", "KALIMANTAN UTARA",
        "KEPULAUAN BANGKA BELITUNG", "KEPULAUAN RIAU", "LAMPUNG", "MALUKU", "MALUKU UTARA",
        "NUSA TENGGARA BARAT", "NUSA TENGGARA TIMUR", "PAPUA", "PAPUA BARAT", "PAPUA BARAT DAYA",
        "PAPUA PEGUNUNGAN", "PAPUA SELATAN", "PAPUA TENGAH", "RIAU", "SULAWESI BARAT",
        "SULAWESI SELATAN", "SULAWESI TENGAH", "SULAWESI TENGGARA", "SULAWESI UTARA",
        "SUMATERA BARAT", "SUMATERA SELATAN", "SUMATERA UTARA"
      ];
      return this.provinceCache;
    }
  }

  /**
   * Perform unified administrative region search
   * @param {Object} options 
   * @returns {Promise<{ items: Array, total: number, hasMore: boolean }>}
   */
  async search({ level, query = '', provinceFilter = '', offset = 0, limit = 20 }) {
    this.cancelOngoing();
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    const normalizedQuery = query.trim().toUpperCase();

    // 1. Search Provinces
    if (level === 'Provinsi') {
      const provinces = await this.getProvinces();
      let matched = provinces;
      if (normalizedQuery) {
        matched = provinces.filter(p => p.includes(normalizedQuery));
      }

      const paged = matched.slice(offset, offset + limit);
      const items = paged.map(provName => ({
        id: `PROV_${provName}`,
        name: provName,
        adminLevel: 'Provinsi',
        regency: '-',
        province: provName,
        code: '-',
        layerId: LAYER_KABKOTA,
        objectId: null,
        attributes: { WADMPR: provName }
      }));

      return {
        items,
        total: matched.length,
        hasMore: offset + limit < matched.length
      };
    }

    // 2. Search Kota / Kabupaten (Layer 0)
    if (level === 'Kota' || level === 'Kabupaten/Kota') {
      const where = QueryBuilder.buildSearchWhere(normalizedQuery, { province: provinceFilter });
      const res = await bigApi.queryAttributes({
        layerId: LAYER_KABKOTA,
        where,
        offset,
        recordCount: limit,
        signal
      });

      const items = res.features.map(f => {
        const attr = f.attributes || {};
        const name = attr.NAMOBJ || attr.WADMKK || 'Tanpa Nama';
        return {
          id: `KAB_${attr.OBJECTID}`,
          name: name,
          adminLevel: 'Kota',
          regency: attr.WADMKK || name,
          province: attr.WADMPR || '-',
          code: attr.KDPKAB || attr.KDPPUM || '-',
          layerId: LAYER_KABKOTA,
          objectId: attr.OBJECTID,
          attributes: attr
        };
      });

      return {
        items,
        total: items.length,
        hasMore: res.exceededTransferLimit
      };
    }

    // 3. Search Kecamatan (Layer 1)
    if (level === 'Kecamatan') {
      const where = QueryBuilder.buildSearchWhere(normalizedQuery, { province: provinceFilter });
      const res = await bigApi.queryAttributes({
        layerId: LAYER_KECAMATAN,
        where,
        offset,
        recordCount: limit,
        signal
      });

      const items = res.features.map(f => {
        const attr = f.attributes || {};
        const name = attr.NAMOBJ || attr.WADMKC || 'Tanpa Nama';
        return {
          id: `KEC_${attr.OBJECTID}`,
          name: name,
          adminLevel: 'Kecamatan',
          regency: attr.WADMKK || '-',
          province: attr.WADMPR || '-',
          code: attr.KDCPUM || attr.KDPPUM || '-',
          layerId: LAYER_KECAMATAN,
          objectId: attr.OBJECTID,
          attributes: attr
        };
      });

      return {
        items,
        total: items.length,
        hasMore: res.exceededTransferLimit
      };
    }

    return { items: [], total: 0, hasMore: false };
  }
}

export const searchService = new SearchService();

