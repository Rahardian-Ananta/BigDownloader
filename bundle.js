/**
 * Simple Bundler to enable 100% Static file:// direct double-click
 * Combines all ES Modules into a single standalone bundle.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = __dirname;

// Order of dependency
const files = [
  'js/utils/helpers.js',
  'js/utils/format.js',
  'js/utils/dom.js',
  'js/storage/history.js',
  'js/api/query-builder.js',
  'js/api/big-api.js',
  'js/services/validation-service.js',
  'js/services/geometry-service.js',
  'js/services/search-service.js',
  'js/exporters/geojson.js',
  'js/exporters/csv.js',
  'js/exporters/kml.js',
  'js/exporters/gml.js',
  'js/exporters/topojson.js',
  'js/exporters/shapefile.js',
  'js/exporters/geopackage.js',
  'js/exporters/geoparquet.js',
  'js/services/download-service.js',
  'js/app.js',
  'js/main.js'
];

let bundleContent = '/* BIG Downloader Web — Standalone Static Bundle (No Localhost Required) */\n';
bundleContent += '(function() {\n';
bundleContent += '  "use strict";\n\n';

for (const relPath of files) {
  const fullPath = path.join(webRoot, relPath);
  let code = fs.readFileSync(fullPath, 'utf8');

  // Strip import statements
  code = code.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '');
  
  // Strip export statements:
  // export function foo -> function foo
  // export class Bar -> class Bar
  // export const baz -> const baz
  // export let x -> let x
  // export default ...
  // export { ... };
  code = code.replace(/^export\s+(function|class|const|let|var)\s+/gm, '$1 ');
  code = code.replace(/^export\s+default\s+/gm, '');
  code = code.replace(/^export\s*\{[\s\S]*?\};?/gm, '');

  bundleContent += `  /* --- File: ${relPath} --- */\n`;
  bundleContent += code + '\n\n';
}

bundleContent += '})();\n';

const outputPath = path.join(webRoot, 'js', 'bundle.js');
fs.writeFileSync(outputPath, bundleContent, 'utf8');
console.log(`Bundle generated successfully at: ${outputPath} (${(bundleContent.length / 1024).toFixed(1)} KB)`);
