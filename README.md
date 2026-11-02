# 🍃 Esteh Indonesia - Outlet Finder (Pencari Kebun Resmi)

Aplikasi web ultra-ringan (**< 75 KB total payload, 0 framework bloat**) untuk mencari dan menavigasi ke seluruh outlet resmi Esteh Indonesia di seluruh Indonesia.

Dibuat khusus untuk kecepatan loading instan, hemat kuota, dan responsif di smartphone maupun desktop.

---

## ⚡ Fitur Utama

1. **📍 Lokasi GPS & Perhitungan Jarak Realtime (Haversine Formula):**
   - Satu klik tombol *"Cari Sekitar Saya (GPS)"* langsung mendeteksi koordinat pengguna via HTML5 Geolocation API.
   - Menghitung jarak presisi (dalam kilometer / meter) ke setiap outlet Esteh.
   - Mengurutkan daftar outlet secara dinamis dari yang paling dekat.
   - Menampilkan badge jarak terdekat pada kartu outlet.

2. **🔍 Pencarian Cepat (Instant Live Filter):**
   - Cari berdasarkan nama kebun (misal: *Pandu Raya, PVJ, Sawangan*), nama kota/kabupaten (misal: *Bogor, Jakarta, Surabaya, Malang, Makassar*), provinsi, atau alamat jalan.

3. **🕒 Status Buka / Tutup Otomatis (Live Operating Hours):**
   - Menghitung apakah outlet sedang buka atau tutup secara otomatis berdasarkan jam & hari lokal saat ini dibandingkan dengan jadwal `jamOperasional`.
   - Modal detail untuk melihat jadwal buka lengkap dari Senin hingga Minggu.

4. **🧭 Navigasi 1-Klik ke Google Maps:**
   - Tombol *"Rute Peta"* langsung membuka navigasi Google Maps atau Apple Maps ke titik koordinat GPS outlet yang akurat.

5. **💬 Kontak Langsung (WhatsApp / Telepon):**
   - Tombol hubungi outlet langsung via WhatsApp dengan pesan template otomatis.

6. **🗺️ Tampilan Peta Interaktif (Leaflet OSM):**
   - Peta ringan berbasis OpenStreetMap (tanpa API key Google Maps berbayar).
   - Menampilkan pin daun teh untuk semua outlet dan pin biru berdenyut untuk lokasi pengguna.
   - Klik kartu dapat langsung menggeser (*pan & zoom*) ke pin outlet di peta.

7. **⚡ Dual-Data Strategy (Zero Latency + Live Sync):**
   - Data 37 outlet pre-bundled di `outlets.json` untuk rendering 0 milidetik saat pertama kali dibuka.
   - Serverless function `/api/outlets` di Vercel yang otomatis menyinkronkan data terbaru dari server backend Esteh dengan Edge Caching (`s-maxage=3600`).

---

## 🚀 Cara Deploy ke Vercel

### Opsi 1: Menggunakan Vercel CLI (Paling Mudah)
Jalankan perintah berikut di terminal:
```bash
cd esteh-outlet
vercel login
vercel --prod
```

### Opsi 2: Menggunakan GitHub + Vercel Dashboard
1. Buat repository baru di GitHub:
   ```bash
   cd esteh-outlet
   git init
   git add .
   git commit -m "feat: initial esteh outlet finder"
   gh repo create esteh-outlet --public --source=. --push
   ```
2. Buka [vercel.com/new](https://vercel.com/new).
3. Import repository `esteh-outlet` dan klik **Deploy**.

---

## 📁 Struktur File Proyek

```
esteh-outlet/
├── index.html        # Markup semantik bersih & ramah SEO/PWA (~5 KB)
├── style.css         # Styling aesthetic Esteh (Emerald Green), responsive & dark mode (~14 KB)
├── app.js            # Vanilla JS logic: GPS, Haversine sort, filter, map (~20 KB)
├── outlets.json      # Dataset lokal 37 outlet terverifikasi (~39 KB)
├── vercel.json       # Konfigurasi routing & edge cache Vercel
├── package.json      # Metadata proyek
├── api/
│   └── outlets.js    # Vercel Serverless Function (CORS proxy + Edge caching)
└── README.md         # Dokumentasi teknis proyek
```
