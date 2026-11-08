/**
 * BIG Downloader Web — Download Manager Service
 */
import { GeoJsonExporter } from '../exporters/geojson.js';
import { ShapefileExporter } from '../exporters/shapefile.js';
import { GeoPackageExporter } from '../exporters/geopackage.js';
import { KmlExporter } from '../exporters/kml.js';
import { GeoParquetExporter } from '../exporters/geoparquet.js';
import { TopoJsonExporter } from '../exporters/topojson.js';
import { CsvExporter } from '../exporters/csv.js';
import { GmlExporter } from '../exporters/gml.js';

import { geometryService } from './geometry-service.js';
import { ValidationService } from './validation-service.js';
import { historyStorage } from '../storage/history.js';
import { downloadBlob, sleep } from '../utils/helpers.js';
import { generateFilename, formatBytes } from '../utils/format.js';

export const EXPORTERS = {
  geojson: GeoJsonExporter,
  shapefile: ShapefileExporter,
  geopackage: GeoPackageExporter,
  kml: KmlExporter,
  geoparquet: GeoParquetExporter,
  topojson: TopoJsonExporter,
  csv: CsvExporter,
  gml: GmlExporter
};

export class DownloadService {
  constructor() {
    this.currentAbortController = null;
    this.activeTask = null;
  }

  cancelActive() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.activeTask = null;
  }

  /**
   * Execute multi-format download process
   * @param {Object} options
   * @param {Object} options.regionItem
   * @param {string[]} options.formats - Array of format keys e.g. ['geojson', 'shapefile']
   * @param {Object} [options.cachedGeoJson] - If geometry was already previewed, avoid re-fetching!
   * @param {Function} [options.onProgress] - (statusText, percentage, indeterminate) => void
   * @returns {Promise<Array>}
   */
  async downloadFormats({ regionItem, formats, cachedGeoJson = null, onProgress = () => {} }) {
    if (!regionItem) throw new Error('Wilayah belum dipilih.');
    if (!formats || formats.length === 0) throw new Error('Pilih setidaknya satu format data.');

    this.cancelActive();
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    this.activeTask = {
      regionName: regionItem.name,
      adminLevel: regionItem.adminLevel,
      formats,
      startTime: Date.now()
    };

    let geojson = cachedGeoJson;

    // Stage 1: Fetch Geometry from BIG if not already in memory
    if (!geojson) {
      onProgress('Menghubungi BIG MapServer untuk mengambil batas wilayah...', 15, true);
      geojson = await geometryService.fetchRegionGeometry(
        regionItem,
        (prog) => {
          onProgress(`Mengunduh fitur geometri (${prog.fetchedCount} fitur)...`, 35, true);
        },
        signal
      );
    }

    // Stage 2: Validate Geometry
    onProgress('Memvalidasi struktur dan topologi geometri...', 50, false);
    const validation = ValidationService.validate(geojson);
    if (!validation.valid) {
      console.warn('Peringatan validasi geometri:', validation.errors);
    }

    const metadata = {
      regionName: regionItem.name,
      adminLevel: regionItem.adminLevel,
      regency: regionItem.regency,
      province: regionItem.province,
      code: regionItem.code
    };

    const results = [];
    const totalFormats = formats.length;

    // Stage 3: Convert and export each selected format
    for (let i = 0; i < totalFormats; i++) {
      if (signal.aborted) throw new Error('Proses unduhan dibatalkan.');

      const formatKey = formats[i];
      const Exporter = EXPORTERS[formatKey];
      if (!Exporter) continue;

      const stepPercent = 50 + Math.floor(((i + 1) / totalFormats) * 45);
      onProgress(`Membuat format ${Exporter.format} (${Exporter.extension.toUpperCase()})...`, stepPercent, false);

      try {
        const blob = await Exporter.export(geojson, metadata);
        const filename = generateFilename(regionItem.name, regionItem.adminLevel, Exporter.extension);

        // Trigger browser download
        downloadBlob(blob, filename, Exporter.mimeType);

        // Record history
        await historyStorage.add({
          regionName: regionItem.name,
          adminLevel: regionItem.adminLevel,
          regency: regionItem.regency,
          province: regionItem.province,
          format: Exporter.format,
          extension: Exporter.extension,
          filename: filename,
          fileSize: blob.size,
          fileSizeStr: formatBytes(blob.size),
          featureCount: geojson.features ? geojson.features.length : 1,
          status: 'SUCCESS'
        });

        results.push({ format: formatKey, success: true, size: blob.size, filename });
        await sleep(250); // slight pause between downloads so browser doesn't block multi-download
      } catch (err) {
        console.error(`Gagal membuat format ${formatKey}:`, err);
        results.push({ format: formatKey, success: false, error: err.message });
      }
    }

    onProgress('Semua format berhasil diunduh!', 100, false);
    this.activeTask = null;
    return results;
  }
}

export const downloadService = new DownloadService();

