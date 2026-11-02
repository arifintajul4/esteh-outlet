/**
 * Esteh Indonesia Outlet Finder
 * Ultra lightweight, fast, GPS & search client
 */

// Embedded initial cache of outlets (ensures instant 0ms initial render)
let outlets = [];
let filteredOutlets = [];
let userLocation = null; // { lat, lng }
let activeFilter = 'all';
let searchQuery = '';
let mapInstance = null;
let markersLayer = null;
let userMarker = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const gpsBtn = document.getElementById('gpsBtn');
const gpsBtnText = document.getElementById('gpsBtnText');
const gpsSpinner = document.getElementById('gpsSpinner');
const gpsBanner = document.getElementById('gpsBanner');
const resetGpsBtn = document.getElementById('resetGpsBtn');
const listViewBtn = document.getElementById('listViewBtn');
const mapViewBtn = document.getElementById('mapViewBtn');
const mapSection = document.getElementById('mapSection');
const outletsGrid = document.getElementById('outletsGrid');
const emptyState = document.getElementById('emptyState');
const resultsCount = document.getElementById('resultsCount');
const sortNotice = document.getElementById('sortNotice');
const totalOutletsPill = document.getElementById('totalOutletsPill');
const themeToggle = document.getElementById('themeToggle');
const hoursModal = document.getElementById('hoursModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModalBtn');
const toastEl = document.getElementById('toast');

// Indonesian Days Map
const DAYS_ID = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupEventListeners();
  await loadOutlets();
});

// Load Outlets (Initial local file -> Background live API sync)
async function loadOutlets() {
  try {
    // 1. Load from static local JSON for instant display
    const res = await fetch('outlets.json');
    if (res.ok) {
      outlets = await res.json();
      render();
    }
  } catch (err) {
    console.warn('Local outlets.json fetch failed:', err);
  }

  // 2. Background sync from serverless proxy endpoint
  try {
    const liveRes = await fetch('/api/outlets');
    if (liveRes.ok) {
      const data = await liveRes.json();
      if (data.outlets && data.outlets.length > 0) {
        outlets = data.outlets;
        render();
      }
    }
  } catch (err) {
    // Keep local cached outlets
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    render();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    render();
  });

  // GPS Button
  gpsBtn.addEventListener('click', handleGpsClick);
  resetGpsBtn.addEventListener('click', resetGps);

  // Filter Pills
  document.querySelectorAll('.filter-pills .pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pills .pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.getAttribute('data-filter');
      render();
    });
  });

  // View Toggle (List / Map)
  listViewBtn.addEventListener('click', () => {
    listViewBtn.classList.add('active');
    mapViewBtn.classList.remove('active');
    mapSection.style.display = 'none';
    outletsGrid.style.display = 'grid';
  });

  mapViewBtn.addEventListener('click', () => {
    mapViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    mapSection.style.display = 'block';
    outletsGrid.style.display = 'grid';
    initMap();
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 200);
  });

  // Reset in empty state
  document.getElementById('resetFilterBtn')?.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    activeFilter = 'all';
    document.querySelectorAll('.filter-pills .pill').forEach((p, idx) => {
      p.classList.toggle('active', idx === 0);
    });
    render();
  });

  // Modal Close
  closeModalBtn.addEventListener('click', () => {
    hoursModal.style.display = 'none';
  });
  hoursModal.addEventListener('click', (e) => {
    if (e.target === hoursModal) hoursModal.style.display = 'none';
  });

  // Theme Toggle
  themeToggle.addEventListener('click', toggleTheme);
}

// GPS Location Handler
function handleGpsClick() {
  if (!navigator.geolocation) {
    showToast('❌ Peramban Anda tidak mendukung fitur lokasi GPS.');
    return;
  }

  gpsBtnText.textContent = 'Mencari lokasi...';
  gpsSpinner.style.display = 'inline-block';
  gpsBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      gpsBtnText.textContent = '📍 Lokasi GPS Aktif';
      gpsSpinner.style.display = 'none';
      gpsBtn.classList.add('active');
      gpsBtn.disabled = false;
      gpsBanner.style.display = 'flex';
      sortNotice.style.display = 'inline';

      showToast('📍 Lokasi GPS berhasil didapatkan! Outlet diurutkan dari yang terdekat.');

      // Update map if initialized
      if (mapInstance) {
        updateMapUserMarker();
      }

      render();
    },
    (error) => {
      gpsBtnText.textContent = 'Cari Sekitar Saya (GPS)';
      gpsSpinner.style.display = 'none';
      gpsBtn.disabled = false;

      let msg = 'Gagal mengakses GPS';
      if (error.code === error.PERMISSION_DENIED) {
        msg = 'Izin akses lokasi ditolak. Silakan izinkan akses lokasi pada browser Anda.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        msg = 'Informasi lokasi tidak tersedia saat ini.';
      } else if (error.code === error.TIMEOUT) {
        msg = 'Waktu pencarian lokasi habis. Silakan coba lagi.';
      }
      showToast('⚠️ ' + msg);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

function resetGps() {
  userLocation = null;
  gpsBtn.classList.remove('active');
  gpsBtnText.textContent = 'Cari Sekitar Saya (GPS)';
  gpsBanner.style.display = 'none';
  sortNotice.style.display = 'none';
  if (userMarker && mapInstance) {
    mapInstance.removeLayer(userMarker);
    userMarker = null;
  }
  showToast('Reset lokasi GPS.');
  render();
}

// Distance Calculation (Haversine formula in KM)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format Distance nicely
function formatDistance(distKm) {
  if (distKm === null || distKm === undefined) return '';
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} meter`;
  }
  return `${distKm.toFixed(1)} km`;
}

// Check Opening Status
function getOpenStatus(hours) {
  if (!hours || !Array.isArray(hours) || hours.length === 0) {
    return { isOpen: true, text: 'Buka' };
  }

  const now = new Date();
  const currentDay = DAYS_ID[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySchedule = hours.find((h) => h.day && h.day.toUpperCase() === currentDay);
  if (!todaySchedule || !todaySchedule.open || !todaySchedule.close) {
    return { isOpen: true, text: 'Buka' };
  }

  const [openH, openM] = todaySchedule.open.split(':').map(Number);
  const [closeH, closeM] = todaySchedule.close.split(':').map(Number);
  const openMinutes = openH * 60 + (openM || 0);
  const closeMinutes = closeH * 60 + (closeM || 0);

  if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
    return {
      isOpen: true,
      text: `Buka • Tutup ${todaySchedule.close}`
    };
  } else {
    return {
      isOpen: false,
      text: `Tutup • Buka ${todaySchedule.open}`
    };
  }
}

// Filter and Sort Outlets
function filterAndSortOutlets() {
  let list = [...outlets];

  // 1. Calculate distance if user location is available
  if (userLocation) {
    list.forEach((o) => {
      o.distance = calculateDistance(userLocation.lat, userLocation.lng, o.lat, o.lng);
    });
  } else {
    list.forEach((o) => {
      o.distance = null;
    });
  }

  // 2. Search query filter
  if (searchQuery) {
    list = list.filter((o) => {
      const name = (o.name || '').toLowerCase();
      const code = (o.code || '').toLowerCase();
      const city = (o.city || '').toLowerCase();
      const prov = (o.province || '').toLowerCase();
      const addr = (o.address || '').toLowerCase();
      return (
        name.includes(searchQuery) ||
        code.includes(searchQuery) ||
        city.includes(searchQuery) ||
        prov.includes(searchQuery) ||
        addr.includes(searchQuery)
      );
    });
  }

  // 3. Category Pill Filter
  if (activeFilter === 'open_now') {
    list = list.filter((o) => getOpenStatus(o.hours).isOpen);
  } else if (activeFilter === 'jabar') {
    list = list.filter((o) => (o.province || '').toLowerCase().includes('jawa barat'));
  } else if (activeFilter === 'dki') {
    list = list.filter((o) => (o.province || '').toLowerCase().includes('jakarta'));
  } else if (activeFilter === 'jatim') {
    list = list.filter((o) => (o.province || '').toLowerCase().includes('jawa timur'));
  } else if (activeFilter === 'luar_jawa') {
    list = list.filter((o) => {
      const p = (o.province || '').toLowerCase();
      return !p.includes('jawa') && !p.includes('jakarta') && !p.includes('banten');
    });
  }

  // 4. Sort: By distance if GPS active, otherwise alphabetical
  if (userLocation) {
    list.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  } else {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  return list;
}

// Main Render Function
function render() {
  filteredOutlets = filterAndSortOutlets();

  totalOutletsPill.textContent = `${outlets.length} Outlet`;

  if (filteredOutlets.length === 0) {
    outletsGrid.innerHTML = '';
    emptyState.style.display = 'block';
    resultsCount.textContent = '0 outlet ditemukan';
  } else {
    emptyState.style.display = 'none';
    resultsCount.textContent = `Menampilkan ${filteredOutlets.length} dari ${outlets.length} outlet`;
    renderCards(filteredOutlets);
  }

  // Update map markers if map is open
  if (mapInstance && mapSection.style.display !== 'none') {
    updateMapMarkers(filteredOutlets);
  }
}

// Render Outlet Cards
function renderCards(items) {
  outletsGrid.innerHTML = items
    .map((o) => {
      const openStatus = getOpenStatus(o.hours);
      const statusBadge = openStatus.isOpen
        ? `<span class="status-badge open">🟢 ${openStatus.text}</span>`
        : `<span class="status-badge closed">🔴 ${openStatus.text}</span>`;

      const distanceBadge =
        o.distance !== null && o.distance !== undefined
          ? `<div class="distance-badge">📍 <strong>${formatDistance(o.distance)}</strong> dari Anda</div>`
          : '';

      const hasCoordinates = o.lat && o.lng;
      const mapsUrl = hasCoordinates
        ? `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.name + ' Esteh Indonesia ' + (o.city || ''))}`;

      const waNumber = (o.phone || '').replace(/[^0-9]/g, '');
      const waUrl = waNumber ? `https://wa.me/${waNumber.startsWith('0') ? '62' + waNumber.slice(1) : waNumber}?text=Halo%20Esteh%20Indonesia%20${encodeURIComponent(o.name)}` : '';

      return `
      <div class="outlet-card" data-id="${o.id}">
        <div>
          <div class="outlet-header">
            <div>
              <h2 class="outlet-title">${escapeHtml(o.name)}</h2>
              <div class="outlet-code">No. ${escapeHtml(o.code || '-')}</div>
            </div>
            ${statusBadge}
          </div>

          ${distanceBadge}

          <p class="outlet-address">${escapeHtml(o.address || 'Alamat belum tersedia')}</p>

          <div class="outlet-meta">
            ${o.city ? `<span class="meta-chip">🏙️ ${escapeHtml(o.city)}</span>` : ''}
            ${o.province ? `<span class="meta-chip">📍 ${escapeHtml(o.province)}</span>` : ''}
          </div>

          <div class="hours-preview" onclick="openHoursModal('${o.id}')">
            <span>🕒 Jam Operasional Lengkap</span>
            <span>Lihat ›</span>
          </div>
        </div>

        <div class="card-actions">
          <a href="${mapsUrl}" target="_blank" rel="noopener" class="action-btn action-maps" title="Petunjuk Arah Google Maps">
            🧭 Rute Peta
          </a>
          ${
            waUrl
              ? `<a href="${waUrl}" target="_blank" rel="noopener" class="action-btn action-wa" title="WhatsApp Outlet">
                  💬 Hubungi
                </a>`
              : `<button class="action-btn action-wa" style="opacity: 0.5; cursor: not-allowed;" disabled>
                  💬 No Telp -
                </button>`
          }
          <button class="action-btn action-full" onclick="focusOnMap(${o.lat}, ${o.lng}, '${o.id}')" ${!hasCoordinates ? 'disabled style="display:none;"' : ''}>
            🗺️ Tampilkan di Peta
          </button>
        </div>
      </div>
    `;
    })
    .join('');
}

// Operating Hours Modal
window.openHoursModal = function (outletId) {
  const o = outlets.find((item) => item.id === outletId);
  if (!o) return;

  modalTitle.textContent = `Jam Operasional - ${o.name}`;
  const now = new Date();
  const currentDay = DAYS_ID[now.getDay()];

  if (!o.hours || o.hours.length === 0) {
    modalBody.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Informasi jadwal belum tersedia.</p>';
  } else {
    const rows = o.hours
      .map((h) => {
        const isToday = h.day && h.day.toUpperCase() === currentDay;
        return `
        <tr class="${isToday ? 'today' : ''}">
          <td class="day">${h.day} ${isToday ? '<em>(Hari ini)</em>' : ''}</td>
          <td style="text-align: right;">${h.open} - ${h.close}</td>
        </tr>
      `;
      })
      .join('');

    modalBody.innerHTML = `
      <table class="hours-table">
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  hoursModal.style.display = 'flex';
};

// Initialize Leaflet Map (Lightweight, OpenStreetMap)
function initMap() {
  if (mapInstance) return;

  // Center on Indonesia roughly
  const defaultCenter = userLocation ? [userLocation.lat, userLocation.lng] : [-6.5764, 106.8178];
  const defaultZoom = userLocation ? 13 : 8;

  mapInstance = L.map('map', {
    center: defaultCenter,
    zoom: defaultZoom,
    zoomControl: true
  });

  // OpenStreetMap Tile Layer (Free, fast & lightweight)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);

  updateMapMarkers(filteredOutlets);
  if (userLocation) {
    updateMapUserMarker();
  }
}

// Update Outlet Map Markers
function updateMapMarkers(items) {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  const validPoints = [];

  items.forEach((o) => {
    if (!o.lat || !o.lng) return;

    validPoints.push([o.lat, o.lng]);

    // Custom Tea Cup Icon
    const customIcon = L.divIcon({
      className: 'custom-tea-pin',
      html: `<div style="background:#0d5c3a; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 2px 8px rgba(0,0,0,0.3); border:2px solid #fff;">🍃</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([o.lat, o.lng], { icon: customIcon });

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`;
    const openStatus = getOpenStatus(o.hours);

    const popupHtml = `
      <div style="font-family:sans-serif; min-width:180px; padding:4px;">
        <strong style="font-size:14px; color:#0d5c3a;">${escapeHtml(o.name)}</strong>
        <div style="font-size:11px; margin:3px 0; color:#555;">${escapeHtml(o.address || '')}</div>
        <div style="font-size:11px; font-weight:bold; margin-bottom:8px;">${openStatus.text}</div>
        <a href="${mapsUrl}" target="_blank" rel="noopener" style="display:inline-block; background:#0d5c3a; color:#fff; text-decoration:none; padding:5px 10px; border-radius:4px; font-size:12px; font-weight:bold;">🧭 Buka Rute</a>
      </div>
    `;

    marker.bindPopup(popupHtml);
    markersLayer.addLayer(marker);
  });

  if (validPoints.length > 0 && !userLocation) {
    mapInstance.fitBounds(validPoints, { padding: [40, 40], maxZoom: 13 });
  }
}

// Update User Marker
function updateMapUserMarker() {
  if (!mapInstance || !userLocation) return;

  if (userMarker) {
    userMarker.setLatLng([userLocation.lat, userLocation.lng]);
  } else {
    const userIcon = L.divIcon({
      className: 'user-gps-pin',
      html: `<div style="background:#0066ff; color:#fff; width:22px; height:22px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 12px #0066ff;"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
    userMarker.bindPopup('<strong>📍 Lokasi Anda Saat Ini</strong>');
    userMarker.addTo(mapInstance);
  }

  mapInstance.setView([userLocation.lat, userLocation.lng], 13);
}

// Focus on map from Card click
window.focusOnMap = function (lat, lng, outletId) {
  if (!lat || !lng) return;

  // Switch to map view
  mapViewBtn.click();

  setTimeout(() => {
    if (mapInstance) {
      mapInstance.setView([lat, lng], 16, { animate: true });
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Open popup for this marker
      markersLayer.eachLayer((marker) => {
        const pos = marker.getLatLng();
        if (Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001) {
          marker.openPopup();
        }
      });
    }
  }, 250);
};

// Toast notification helper
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3500);
}

// Theme management
function initTheme() {
  const saved = localStorage.getItem('esteh_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('esteh_theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
}

// Security HTML escape helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
