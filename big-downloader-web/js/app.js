/**
 * BIG Downloader Web — Application Controller
 */
import { searchService } from './services/search-service.js';
import { geometryService } from './services/geometry-service.js';
import { downloadService } from './services/download-service.js';
import { historyStorage } from './storage/history.js';
import { bigApi } from './api/big-api.js';

import { $, $$, showToast, openModal, closeModal } from './utils/dom.js';
import { escapeHTML, debounce } from './utils/helpers.js';
import { formatBytes, formatDate, getAdminLevelBadgeClass } from './utils/format.js';

export class App {
  constructor() {
    this.geometryCache = new Map(); // Client-side cache for instant re-selection
    this.state = {
      selectedLevel: 'Kota',
      searchQuery: '',
      provinceFilter: '',
      results: [],
      selectedRegion: null,
      cachedGeoJson: null,
      selectedFormats: new Set(['geojson', 'shapefile']),
      map: null,
      geojsonLayer: null,
      tileLayer: null,
      basemapVisible: true,
      apiOnline: false
    };

    this.init();
  }

  async init() {
    this.initTheme();
    this.initMap();
    this.bindEvents();
    this.loadProvincesFilter();
    this.checkApiStatus();
    this.renderHistory();

    // Default: Kotak pencarian kosong & tampilkan panduan awal (tidak auto-search agar hemat kuota API)
    this.showInitialEmptyState();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    this.setTheme(isDark);
  }

  setTheme(isDark) {
    const icon = $('#theme-toggle-icon');
    const text = $('#theme-toggle-text');

    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      if (icon) icon.textContent = '☀️';
      if (text) text.textContent = 'TERANG';
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      if (icon) icon.textContent = '🌙';
      if (text) text.textContent = 'GELAP';
    }
  }

  showInitialEmptyState() {
    const container = $('#search-results-list');
    const countBadge = $('#search-count-badge');
    if (countBadge) countBadge.textContent = '0 Wilayah';

    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.75rem 1.25rem; color: #4B5563;">
          <div style="font-size: 2.5rem; margin-bottom: 0.6rem;">🗺️</div>
          <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1.1rem; color: #171717;">
            PENCARIAN DATA BATAS WILAYAH
          </div>
          <p style="font-size: 0.85rem; margin-top: 0.4rem; line-height: 1.5; max-width: 300px; margin-left: auto; margin-right: auto;">
            Ketik nama wilayah pada kotak pencarian di atas lalu klik tombol <strong>CARI</strong> untuk mengambil data resmi dari BIG.
          </p>
        </div>
      `;
    }
  }

  /* ========================================================================
     1. LEAFLET MAP INITIALIZATION & CONTROLS
     ======================================================================== */
  initMap() {
    const mapElement = $('#leaflet-map');
    if (!mapElement) return;

    if (!window.L) {
      console.warn('Leaflet.js sedang dimuat atau gagal terhubung.');
      setTimeout(() => this.initMap(), 500);
      return;
    }

    // Initialize Map centered over Indonesia archipelago
    this.state.map = L.map('leaflet-map', {
      center: [-2.2, 118.0],
      zoom: 5,
      zoomControl: false // custom Neo-Brutalist buttons
    });

    // 100% Free Public Basemaps (No API Key Required!)
    this.basemaps = {
      'esri-topo': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri &mdash; Esri, USGS, NOAA'
      }),
      'esri-street': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri &mdash; Street Map'
      }),
      'opentopo': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap'
      }),
      'osm': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      })
    };

    // Default to ESRI Topo Map (Reliable, fast, no API key needed)
    this.currentBasemapKey = 'esri-topo';
    this.state.tileLayer = this.basemaps['esri-topo'].addTo(this.state.map);

    // Mouse move coordinate HUD
    this.state.map.on('mousemove', (e) => {
      const hud = $('#map-coords-text');
      if (hud) {
        hud.textContent = `${e.latlng.lat.toFixed(4)}°, ${e.latlng.lng.toFixed(4)}°`;
      }
    });

    // Force Leaflet recalculation of tile container dimensions
    setTimeout(() => {
      if (this.state.map) this.state.map.invalidateSize();
    }, 200);
    setTimeout(() => {
      if (this.state.map) this.state.map.invalidateSize();
    }, 700);
  }

  renderGeoJsonOnMap(geojson, regionName) {
    if (!this.state.map || !window.L) return;

    if (this.state.geojsonLayer) {
      this.state.map.removeLayer(this.state.geojsonLayer);
    }

    // Neo-Brutalist Polygon styling: Thick dark border + bright primary fill
    this.state.geojsonLayer = L.geoJSON(geojson, {
      style: {
        color: '#171717',
        weight: 3,
        opacity: 1,
        fillColor: '#FFD93D',
        fillOpacity: 0.45,
        dashArray: ''
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const title = escapeHTML(props.NAMOBJ || props.WADMKK || props.WADMPR || regionName);
        const prov = escapeHTML(props.WADMPR || '-');
        const kab = escapeHTML(props.WADMKK || '-');

        const popupContent = `
          <div style="font-family: var(--font-body); padding: 4px;">
            <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1rem; text-transform: uppercase;">${title}</div>
            <div style="font-size: 0.8rem; color: #4B5563; margin-top: 2px;">
              <strong>Provinsi:</strong> ${prov}<br/>
              <strong>Kab/Kota:</strong> ${kab}
            </div>
          </div>
        `;
        layer.bindPopup(popupContent);

        // Hover highlight
        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              fillColor: '#74C0FC',
              fillOpacity: 0.7,
              weight: 4
            });
          },
          mouseout: (e) => {
            this.state.geojsonLayer.resetStyle(e.target);
          }
        });
      }
    }).addTo(this.state.map);

    // Fit map bounds to polygon
    try {
      const bounds = this.state.geojsonLayer.getBounds();
      if (bounds.isValid()) {
        this.state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    } catch (e) {
      console.warn('Gagal memusatkan peta ke bounds:', e);
    }
  }

  /* ========================================================================
     2. EVENT LISTENERS & UI BINDINGS
     ======================================================================== */
  bindEvents() {
    // Admin Level Selector Tabs (Provinsi, Kota, Kecamatan)
    $$('.level-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.level-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.state.selectedLevel = tab.dataset.level;
        
        // Hanya cari ulang jika kotak pencarian sudah diisi pengguna
        const query = $('#search-input')?.value.trim();
        if (query) {
          this.executeSearch(query);
        }
      });
    });

    // Search Input (Hanya mencari saat tombol CARI ditekan atau tekan Enter)
    const searchInput = $('#search-input');
    const clearBtn = $('#search-clear-btn');

    if (searchInput) {
      // Toggle tombol X bersihkan input saat mengetik (tanpa auto-search agar hemat limit API)
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        clearBtn?.classList.toggle('visible', val.length > 0);
      });

      // Tekan tombol Enter untuk mulai pencarian
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = searchInput.value.trim();
          if (!val) {
            showToast('Kotak pencarian tidak boleh kosong. Masukkan nama wilayah.', 'warning');
            searchInput.focus();
            return;
          }
          this.executeSearch(val);
        }
      });
    }

    // Tombol X Clear
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        clearBtn.classList.remove('visible');
        this.state.searchQuery = '';
        this.showInitialEmptyState();
      });
    }

    // Tombol CARI ditekan
    $('#btn-search')?.addEventListener('click', () => {
      const val = $('#search-input')?.value.trim();
      if (!val) {
        showToast('Kotak pencarian tidak boleh kosong. Masukkan nama wilayah.', 'warning');
        $('#search-input')?.focus();
        return;
      }
      this.executeSearch(val);
    });

    // Province Filter Dropdown
    $('#filter-province')?.addEventListener('change', (e) => {
      this.state.provinceFilter = e.target.value;
      const query = $('#search-input')?.value.trim();
      if (query) {
        this.executeSearch(query);
      }
    });

    // Format Option Cards (multi-select)
    $$('.format-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const formatKey = card.dataset.format;
        if (this.state.selectedFormats.has(formatKey)) {
          if (this.state.selectedFormats.size > 1) {
            this.state.selectedFormats.delete(formatKey);
            card.classList.remove('selected');
          } else {
            showToast('Pilih setidaknya satu format data.', 'warning');
          }
        } else {
          this.state.selectedFormats.add(formatKey);
          card.classList.add('selected');
        }
        this.updateExportSummary();
      });
    });

    // Select All / Deselect All Formats
    $('#btn-select-all-formats')?.addEventListener('click', () => {
      $$('.format-option-card').forEach(card => {
        this.state.selectedFormats.add(card.dataset.format);
        card.classList.add('selected');
      });
      this.updateExportSummary();
    });

    // Download Action Button
    $('#btn-start-download')?.addEventListener('click', () => {
      this.startDownloadProcess();
    });

    // Cancel Download Button
    $('#btn-cancel-download')?.addEventListener('click', () => {
      downloadService.cancelActive();
      closeModal('download-progress-modal');
      showToast('Unduhan dibatalkan pengguna.', 'info');
    });

    // Map Floating Controls
    $('#map-btn-zoom-in')?.addEventListener('click', () => this.state.map?.zoomIn());
    $('#map-btn-zoom-out')?.addEventListener('click', () => this.state.map?.zoomOut());
    $('#map-btn-fit')?.addEventListener('click', () => {
      if (this.state.geojsonLayer) {
        this.state.map?.fitBounds(this.state.geojsonLayer.getBounds(), { padding: [30, 30] });
      } else {
        this.state.map?.setView([-2.2, 118.0], 5);
      }
    });

    // Basemap Provider Selector (ESRI Topo, OpenTopo, OSM)
    $('#map-basemap-select')?.addEventListener('change', (e) => {
      const key = e.target.value;
      if (!this.state.map || !this.basemaps) return;

      // Remove existing tile layer if any
      if (this.state.tileLayer) {
        this.state.map.removeLayer(this.state.tileLayer);
        this.state.tileLayer = null;
      }

      if (key !== 'none' && this.basemaps[key]) {
        this.currentBasemapKey = key;
        this.state.tileLayer = this.basemaps[key].addTo(this.state.map);
        this.state.basemapVisible = true;
        // Ensure polygon layer stays on top
        if (this.state.geojsonLayer) {
          this.state.geojsonLayer.bringToFront();
        }
        showToast(`Basemap diubah: ${e.target.options[e.target.selectedIndex].text}`, 'info', 2000);
      } else {
        this.state.basemapVisible = false;
        showToast('Basemap dinonaktifkan (Mode Batas Murni)', 'info', 2000);
      }
    });

    // Toggle Basemap (Quick toggle button)
    $('#map-btn-toggle-basemap')?.addEventListener('click', () => {
      if (!this.state.map || !this.basemaps) return;
      this.state.basemapVisible = !this.state.basemapVisible;
      const selectEl = $('#map-basemap-select');

      if (this.state.basemapVisible) {
        const key = this.currentBasemapKey || 'esri-topo';
        if (this.state.tileLayer) this.state.map.removeLayer(this.state.tileLayer);
        this.state.tileLayer = this.basemaps[key].addTo(this.state.map);
        if (this.state.geojsonLayer) this.state.geojsonLayer.bringToFront();
        if (selectEl) selectEl.value = key;
        showToast('Basemap diaktifkan', 'info', 2000);
      } else {
        if (this.state.tileLayer) {
          this.state.map.removeLayer(this.state.tileLayer);
          this.state.tileLayer = null;
        }
        if (selectEl) selectEl.value = 'none';
        showToast('Basemap disembunyikan (Batas Wilayah Murni)', 'info', 2000);
      }
    });

    // History Modal Trigger
    $('#btn-open-history')?.addEventListener('click', () => {
      this.renderHistory();
      openModal('history-modal');
    });

    $('#btn-clear-history')?.addEventListener('click', async () => {
      if (confirm('Yakin ingin menghapus seluruh riwayat unduhan? File yang sudah diunduh di perangkat Anda tidak akan terhapus.')) {
        await historyStorage.clear();
        this.renderHistory();
        showToast('Riwayat unduhan dibersihkan.', 'success');
      }
    });

    // Theme Toggle (Dark / Light Mode)
    $('#btn-theme-toggle')?.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      this.setTheme(!isDark);
      showToast(!isDark ? 'Mode Gelap diaktifkan' : 'Mode Terang diaktifkan', 'info', 2000);
    });

    // About Modal Trigger
    $('#btn-open-about')?.addEventListener('click', () => openModal('about-modal'));

    // Modal Close Buttons
    $$('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.target.closest('[data-close-modal]').dataset.closeModal;
        closeModal(modalId);
      });
    });

    // Hero Explore Button
    $('#btn-hero-explore')?.addEventListener('click', () => {
      $('#search-input')?.focus();
      document.querySelector('#workspace-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ========================================================================
     3. SEARCH & REGION SELECTION
     ======================================================================== */
  async loadProvincesFilter() {
    const provSelect = $('#filter-province');
    if (!provSelect) return;

    try {
      const provinces = await searchService.getProvinces();
      let html = '<option value="">Semua Provinsi</option>';
      for (const prov of provinces) {
        html += `<option value="${escapeHTML(prov)}">${escapeHTML(prov)}</option>`;
      }
      provSelect.innerHTML = html;
    } catch (e) {
      console.warn('Gagal mengisi dropdown provinsi:', e);
    }
  }

  async checkApiStatus() {
    const statusPill = $('#api-status-pill');
    const statusDot = $('#api-status-dot');
    const statusText = $('#api-status-text');

    const res = await bigApi.checkHealth();
    this.state.apiOnline = res.online;

    if (res.online) {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'BIG API ONLINE';
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'BIG API OFFLINE';
      showToast('Layanan BIG API sedang offline atau tidak dapat dijangkau.', 'error', 6000);
    }
  }

  async executeSearch(query = '') {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      showToast('Kotak pencarian tidak boleh kosong. Masukkan nama wilayah.', 'warning');
      $('#search-input')?.focus();
      return;
    }

    this.state.searchQuery = trimmed;
    const container = $('#search-results-list');
    const countBadge = $('#search-count-badge');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; font-family: var(--font-heading); font-weight: 800;">
        <div class="nb-progress-wrapper" style="max-width: 200px; margin: 0 auto 0.5rem;">
          <div class="nb-progress-bar indeterminate"></div>
        </div>
        MENCARI DATA DI BADAN INFORMASI GEOSPASIAL...
      </div>
    `;

    try {
      const result = await searchService.search({
        level: this.state.selectedLevel,
        query: query,
        provinceFilter: this.state.provinceFilter,
        offset: 0,
        limit: 25
      });

      this.state.results = result.items;
      if (countBadge) countBadge.textContent = `${result.items.length} Wilayah`;

      if (result.items.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 2.5rem 1rem; color: #4B5563;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
            <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1.1rem; color: #171717;">WILAYAH TIDAK DITEMUKAN</div>
            <p style="font-size: 0.85rem; margin-top: 0.25rem;">Coba periksa kembali ejaan nama atau ubah filter tingkat administrasi.</p>
          </div>
        `;
        return;
      }

      let html = '';
      result.items.forEach((item, index) => {
        const badgeClass = getAdminLevelBadgeClass(item.adminLevel);
        const isSelected = this.state.selectedRegion?.id === item.id;

        html += `
          <div class="result-card ${isSelected ? 'selected' : ''}" data-index="${index}">
            <div class="result-card-header">
              <div class="result-name">${escapeHTML(item.name)}</div>
              <span class="nb-badge ${badgeClass}">${escapeHTML(item.adminLevel)}</span>
            </div>
            <div class="result-hierarchy">
              ${item.regency !== '-' ? `Kab/Kota: ${escapeHTML(item.regency)} • ` : ''}
              Provinsi: ${escapeHTML(item.province)}
            </div>
            <div class="result-meta-row">
              <span style="font-family: var(--font-mono); font-size: 0.75rem; color: #6B7280;">Kode: ${escapeHTML(item.code)}</span>
              <button class="nb-btn nb-btn-sm nb-btn-primary btn-select-region" data-index="${index}">PILIH WILAYAH</button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      // Card click events
      $$('.result-card', container).forEach(card => {
        card.addEventListener('click', () => {
          const idx = Number(card.dataset.index);
          this.selectRegion(this.state.results[idx]);
        });
      });

      // CATATAN: Tidak melakukan auto-select hasil pertama agar pengguna memilih secara manual
    } catch (err) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #EF4444; font-weight: 700;">
          Gagal mengambil data dari BIG: ${escapeHTML(err.message)}
        </div>
      `;
    }
  }

  /**
   * Kunci atau buka interaksi peta dan tampilkan loading overlay
   */
  setMapLocked(locked, regionName = '', adminLevel = '') {
    const overlay = $('#map-loading-overlay');
    const title = $('#map-loading-title');
    const sub = $('#map-loading-sub');

    if (locked) {
      if (this.state.map) {
        this.state.map.dragging?.disable();
        this.state.map.touchZoom?.disable();
        this.state.map.doubleClickZoom?.disable();
        this.state.map.scrollWheelZoom?.disable();
        this.state.map.boxZoom?.disable();
        this.state.map.keyboard?.disable();
      }
      if (title) title.textContent = `MEMUAT: ${regionName.toUpperCase()}`;
      if (sub) sub.textContent = `Mengambil geometri ${adminLevel} dari BIG...`;
      overlay?.classList.add('active');
    } else {
      if (this.state.map) {
        this.state.map.dragging?.enable();
        this.state.map.touchZoom?.enable();
        this.state.map.doubleClickZoom?.enable();
        this.state.map.scrollWheelZoom?.enable();
        this.state.map.boxZoom?.enable();
        this.state.map.keyboard?.enable();
      }
      overlay?.classList.remove('active');
    }
  }

  async selectRegion(regionItem) {
    if (!regionItem) return;
    this.state.selectedRegion = regionItem;

    // Update active highlight on cards
    $$('.result-card').forEach(card => {
      const idx = Number(card.dataset.index);
      const isCurrent = this.state.results[idx]?.id === regionItem.id;
      card.classList.toggle('selected', isCurrent);
    });

    // Update Region Detail Panel UI
    $('#detail-region-name').textContent = regionItem.name;
    $('#detail-admin-level').textContent = regionItem.adminLevel;
    $('#detail-province').textContent = regionItem.province;
    $('#detail-regency').textContent = regionItem.regency;
    $('#detail-code').textContent = regionItem.code;

    // 1. Cek Cache: Jika sudah pernah dimuat, langsung gunakan cache (instan tanpa loading)
    if (this.geometryCache.has(regionItem.id)) {
      const cachedGeoJson = this.geometryCache.get(regionItem.id);
      this.state.cachedGeoJson = cachedGeoJson;
      this.applyRegionGeometry(cachedGeoJson, regionItem);
      showToast(`Batas wilayah ${regionItem.name} dimuat instan dari cache.`, 'info', 1800);
      this.updateExportSummary();
      return;
    }

    // 2. Jika belum ada di cache, kunci peta dan tampilkan loading overlay
    $('#detail-feature-count').textContent = 'Memuat...';
    $('#detail-geom-type').textContent = 'Memuat...';
    $('#detail-data-size').textContent = 'Memuat...';
    this.setMapLocked(true, regionItem.name, regionItem.adminLevel);

    try {
      const geojson = await geometryService.fetchRegionGeometry(regionItem);
      
      // Simpan ke cache lokal memori
      this.geometryCache.set(regionItem.id, geojson);
      this.state.cachedGeoJson = geojson;

      this.applyRegionGeometry(geojson, regionItem);
    } catch (err) {
      console.error('Error fetching geometry:', err);
      showToast(`Gagal memuat geometri: ${err.message}`, 'error', 5000);
      $('#detail-feature-count').textContent = 'Gagal';
      $('#detail-geom-type').textContent = '-';
      $('#detail-data-size').textContent = '-';
    } finally {
      this.setMapLocked(false);
      this.updateExportSummary();
    }
  }

  applyRegionGeometry(geojson, regionItem) {
    const numFeatures = geojson.features ? geojson.features.length : 1;
    const geomType = geojson.features?.[0]?.geometry?.type || 'Polygon';
    const sizeBytes = JSON.stringify(geojson).length;

    $('#detail-feature-count').textContent = `${numFeatures} Fitur`;
    $('#detail-geom-type').textContent = geomType;
    $('#detail-data-size').textContent = formatBytes(sizeBytes);

    // Render on Leaflet Map
    this.renderGeoJsonOnMap(geojson, regionItem.name);

    // Update attributes table in modal
    this.renderAttributeTable(geojson);
  }

  renderAttributeTable(geojson) {
    const tableContainer = $('#attributes-table-body');
    if (!tableContainer) return;

    const firstFeature = geojson.features?.[0];
    if (!firstFeature || !firstFeature.properties) {
      tableContainer.innerHTML = '<tr><td colspan="2">Tidak ada atribut tersedia</td></tr>';
      return;
    }

    let rows = '';
    for (const [key, val] of Object.entries(firstFeature.properties)) {
      rows += `
        <tr>
          <td style="font-weight: 700;">${escapeHTML(key)}</td>
          <td>${escapeHTML(String(val ?? '-'))}</td>
        </tr>
      `;
    }
    tableContainer.innerHTML = rows;
  }

  updateExportSummary() {
    const count = this.state.selectedFormats.size;
    const name = this.state.selectedRegion?.name || 'Wilayah';
    const btn = $('#btn-start-download');
    if (btn) {
      btn.textContent = `UNDUH ${count} FORMAT UNTUK ${name.toUpperCase()}`;
      btn.disabled = !this.state.selectedRegion || count === 0;
    }
  }

  /* ========================================================================
     4. DOWNLOAD PROCESS & MANAGER
     ======================================================================== */
  async startDownloadProcess() {
    if (!this.state.selectedRegion) {
      showToast('Pilih wilayah terlebih dahulu.', 'warning');
      return;
    }

    const formats = Array.from(this.state.selectedFormats);
    if (formats.length === 0) {
      showToast('Pilih setidaknya satu format data.', 'warning');
      return;
    }

    openModal('download-progress-modal');
    $('#progress-modal-region-name').textContent = this.state.selectedRegion.name;
    $('#progress-modal-formats-count').textContent = `${formats.length} Format`;

    const statusEl = $('#download-status-text');
    const barEl = $('#download-progress-bar');
    const percentEl = $('#download-progress-percent');

    try {
      const results = await downloadService.downloadFormats({
        regionItem: this.state.selectedRegion,
        formats: formats,
        cachedGeoJson: this.state.cachedGeoJson,
        onProgress: (statusText, percentage, indeterminate) => {
          if (statusEl) statusEl.textContent = statusText;
          if (barEl) {
            barEl.classList.toggle('indeterminate', indeterminate);
            if (!indeterminate) barEl.style.width = `${percentage}%`;
          }
          if (percentEl) {
            percentEl.textContent = indeterminate ? '...' : `${percentage}%`;
          }
        }
      });

      const successCount = results.filter(r => r.success).length;
      showToast(`${successCount} dari ${formats.length} format berhasil diunduh!`, 'success');
      setTimeout(() => closeModal('download-progress-modal'), 1200);
      this.renderHistory();
    } catch (err) {
      showToast(`Gagal mengunduh: ${err.message}`, 'error', 5000);
      if (statusEl) statusEl.textContent = `Error: ${err.message}`;
    }
  }

  /* ========================================================================
     5. DOWNLOAD HISTORY
     ======================================================================== */
  async renderHistory() {
    const tbody = $('#history-table-body');
    if (!tbody) return;

    const items = await historyStorage.getAll();
    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: #6B7280;">
            Belum ada riwayat unduhan di browser ini.
          </td>
        </tr>
      `;
      return;
    }

    let rows = '';
    items.forEach(item => {
      const badgeClass = getAdminLevelBadgeClass(item.adminLevel);
      rows += `
        <tr>
          <td style="font-weight: 700;">${escapeHTML(item.regionName)}</td>
          <td><span class="nb-badge ${badgeClass}">${escapeHTML(item.adminLevel)}</span></td>
          <td><strong>${escapeHTML(item.format)}</strong></td>
          <td>${escapeHTML(item.fileSizeStr || '-')}</td>
          <td>${formatDate(item.timestamp)}</td>
          <td>
            <button class="nb-btn nb-btn-sm nb-btn-accent btn-delete-history" data-id="${item.id}" title="Hapus dari riwayat">&times;</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;

    $$('.btn-delete-history', tbody).forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        await historyStorage.delete(id);
        this.renderHistory();
        showToast('Catatan riwayat dihapus.', 'info');
      });
    });
  }
}

