/**
 * Automated Test Suite for BIG Downloader Web
 * Run with: node tests/test_all.js
 */

import { QueryBuilder } from '../js/api/query-builder.js';
import { ValidationService } from '../js/services/validation-service.js';
import { GeoJsonExporter } from '../js/exporters/geojson.js';
import { CsvExporter } from '../js/exporters/csv.js';
import { KmlExporter } from '../js/exporters/kml.js';
import { GmlExporter } from '../js/exporters/gml.js';
import { TopoJsonExporter } from '../js/exporters/topojson.js';
import { ShapefileExporter } from '../js/exporters/shapefile.js';
import { GeoPackageExporter } from '../js/exporters/geopackage.js';
import { GeoParquetExporter } from '../js/exporters/geoparquet.js';
import { formatBytes, formatNumber, getAdminLevelBadgeClass } from '../js/utils/format.js';
import { escapeHTML } from '../js/utils/helpers.js';

// Sample mock GeoJSON representing an Indonesian administrative boundary
const sampleGeoJSON = {
  type: 'FeatureCollection',
  name: 'BIG_Batas_Bandung',
  features: [
    {
      type: 'Feature',
      properties: {
        OBJECTID: 101,
        NAMOBJ: 'KOTA BANDUNG',
        WADMPR: 'JAWA BARAT',
        WADMKK: 'KOTA BANDUNG',
        WADMKC: null,
        KDPKAB: '3273',
        LUASWH: 167.3
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [107.545, -6.950],
            [107.650, -6.950],
            [107.650, -6.870],
            [107.545, -6.870],
            [107.545, -6.950] // closed ring
          ]
        ]
      }
    }
  ]
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING BIG DOWNLOADER WEB TEST SUITE');
  console.log('========================================\n');

  // Test 1: Query Builder
  console.log('🔹 1. Testing QueryBuilder...');
  const where1 = QueryBuilder.buildSearchWhere('Bandung');
  assert(where1.includes("NAMOBJ) LIKE '%BANDUNG%'"), 'Search where contains uppercase NAMOBJ query');

  const where2 = QueryBuilder.buildSearchWhere('Malang', { province: 'JAWA TIMUR' });
  assert(where2.includes("WADMPR = 'JAWA TIMUR'"), 'Hierarchy province filter correctly formatted');

  const where3 = QueryBuilder.buildProvinceWhere("D.I. YOGYAKARTA");
  assert(where3 === "WADMPR = 'D.I. YOGYAKARTA'", 'buildProvinceWhere formats correctly');

  // Test 2: Validation Service
  console.log('\n🔹 2. Testing ValidationService...');
  const validRes = ValidationService.validate(sampleGeoJSON);
  assert(validRes.valid === true, 'Sample GeoJSON passes validation');
  assert(validRes.errors.length === 0, 'No validation errors on valid GeoJSON');

  const invalidRes = ValidationService.validate({ type: 'InvalidType', features: [] });
  assert(invalidRes.valid === false, 'Invalid root type fails validation');

  // Test 3: Formatting & Utilities
  console.log('\n🔹 3. Testing Format Utilities...');
  assert(formatBytes(1024) === '1 KB', 'formatBytes(1024) returns 1 KB');
  assert(formatBytes(1048576) === '1 MB', 'formatBytes(1048576) returns 1 MB');
  assert(getAdminLevelBadgeClass('Provinsi') === 'nb-badge-prov', 'Badge class for Provinsi correct');
  assert(escapeHTML('<script>alert("XSS")</script>').includes('&lt;script&gt;'), 'XSS tags properly escaped');

  // Test 4: GeoJSON Exporter
  console.log('\n🔹 4. Testing GeoJsonExporter...');
  const geojsonBlob = GeoJsonExporter.export(sampleGeoJSON, { regionName: 'Kota Bandung', adminLevel: 'Kabupaten/Kota' });
  assert(geojsonBlob instanceof Blob, 'Returns Blob instance');
  const geojsonText = await geojsonBlob.text();
  const parsedGeoJson = JSON.parse(geojsonText);
  assert(parsedGeoJson.type === 'FeatureCollection', 'Root type is FeatureCollection');
  assert(parsedGeoJson.features.length === 1, 'Contains 1 feature');
  assert(parsedGeoJson.metadata.source.includes('BIG'), 'Contains BIG source metadata');

  // Test 5: CSV Exporter
  console.log('\n🔹 5. Testing CsvExporter...');
  const csvBlob = CsvExporter.export(sampleGeoJSON);
  const csvText = await csvBlob.text();
  assert(csvText.includes('FEATURE_INDEX'), 'Contains CSV header FEATURE_INDEX');
  assert(csvText.includes('KOTA BANDUNG'), 'Contains attribute value KOTA BANDUNG');
  assert(csvText.includes('JAWA BARAT'), 'Contains province attribute JAWA BARAT');

  // Test 6: KML Exporter
  console.log('\n🔹 6. Testing KmlExporter...');
  const kmlBlob = KmlExporter.export(sampleGeoJSON, { regionName: 'Kota Bandung' });
  const kmlText = await kmlBlob.text();
  assert(kmlText.includes('<kml xmlns="http://www.opengis.net/kml/2.2">'), 'Valid KML 2.2 namespace');
  assert(kmlText.includes('<Polygon>'), 'Contains Polygon element');
  assert(kmlText.includes('107.545,-6.95,0'), 'Formatted coordinate point present');

  // Test 7: GML Exporter
  console.log('\n🔹 7. Testing GmlExporter...');
  const gmlBlob = GmlExporter.export(sampleGeoJSON, { regionName: 'Kota Bandung' });
  const gmlText = await gmlBlob.text();
  assert(gmlText.includes('<gml:FeatureCollection'), 'Valid GML FeatureCollection element');
  assert(gmlText.includes('<gml:Envelope srsName="EPSG:4326">'), 'Contains EPSG:4326 Envelope bounds');
  assert(gmlText.includes('<gml:posList>'), 'Contains gml:posList element');

  // Test 8: TopoJSON Exporter
  console.log('\n🔹 8. Testing TopoJsonExporter...');
  const topoBlob = TopoJsonExporter.export(sampleGeoJSON, { regionName: 'Kota Bandung' });
  const topoText = await topoBlob.text();
  const topoObj = JSON.parse(topoText);
  assert(topoObj.type === 'Topology', 'TopoJSON root type is Topology');
  assert(Array.isArray(topoObj.arcs) && topoObj.arcs.length > 0, 'Contains shared arcs array');
  assert(topoObj.objects.administrative_boundaries !== undefined, 'Contains administrative_boundaries object');

  // Test 9: Shapefile Binary Generator (.shp, .shx, .dbf)
  console.log('\n🔹 9. Testing ShapefileExporter Binary Writer...');
  const shpData = ShapefileExporter.buildShpAndShx(sampleGeoJSON);
  const shpView = new DataView(shpData.shp);
  assert(shpView.getInt32(0, false) === 9994, 'SHP File Code is 9994 (Big-Endian)');
  assert(shpView.getInt32(28, true) === 1000, 'SHP Version is 1000 (Little-Endian)');
  assert(shpView.getInt32(32, true) === 5, 'SHP Shape Type is 5 (Polygon)');

  const shxView = new DataView(shpData.shx);
  assert(shxView.getInt32(0, false) === 9994, 'SHX File Code is 9994');
  assert(shpData.shx.byteLength === 108, 'SHX has header (100) + 1 record (8) = 108 bytes');

  const dbfBuffer = ShapefileExporter.buildDbf(sampleGeoJSON);
  const dbfView = new DataView(dbfBuffer);
  assert(dbfView.getUint8(0) === 0x03, 'DBF Signature is 0x03 (dBase III)');
  assert(dbfView.getUint32(4, true) === 1, 'DBF record count is 1');

  // Test 10: GeoPackage Binary Container
  console.log('\n🔹 10. Testing GeoPackageExporter Container...');
  const gpkgBlob = await GeoPackageExporter.export(sampleGeoJSON, { regionName: 'Kota Bandung' });
  const gpkgBuf = await gpkgBlob.arrayBuffer();
  const gpkgU8 = new Uint8Array(gpkgBuf);
  const gpkgMagic = String.fromCharCode(...gpkgU8.slice(0, 15));
  assert(gpkgMagic.startsWith('SQLite format 3'), 'GeoPackage starts with SQLite format 3 magic');
  const gpkgView = new DataView(gpkgBuf);
  assert(gpkgView.getUint32(68, false) === 0x47504B47, 'GeoPackage Application ID is 0x47504B47 (GPKG)');

  // Test 11: GeoParquet Binary Container
  console.log('\n🔹 11. Testing GeoParquetExporter Container...');
  const parquetBlob = GeoParquetExporter.export(sampleGeoJSON, { regionName: 'Kota Bandung' });
  const parquetBuf = await parquetBlob.arrayBuffer();
  const parquetU8 = new Uint8Array(parquetBuf);
  const headerMagic = String.fromCharCode(...parquetU8.slice(0, 4));
  const footerMagic = String.fromCharCode(...parquetU8.slice(parquetBuf.byteLength - 4, parquetBuf.byteLength));
  assert(headerMagic === 'PAR1', 'Parquet starts with PAR1 header magic');
  assert(footerMagic === 'PAR1', 'Parquet ends with PAR1 footer magic');

  console.log('\n========================================');
  console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
