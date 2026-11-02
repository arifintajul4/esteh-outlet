const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'https://loyalti.rencanacerdas.com/stagingBEapi/masterkebun/list/app';

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Edge caching: 1 hour edge cache, 24 hours stale while revalidate
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const upstream = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dart/3.5 (dart:io)'
      },
      body: JSON.stringify({}),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (upstream.ok) {
      const data = await upstream.json();
      const rawOutlets = data.data || [];
      const cleaned = rawOutlets.map(o => ({
        id: o._id,
        code: o.noKebun || '',
        name: o.nameKebun || '',
        address: o.alamat || '',
        city: o.daerah || '',
        province: o.provinsi || '',
        region: o.region || '',
        area: o.area || '',
        lat: o.lat,
        lng: o.long,
        phone: o.noTelpKebun || '',
        email: o.email || '',
        active: o.active !== false,
        hours: o.jamOperasional || []
      }));

      return res.status(200).json({
        success: true,
        source: 'live',
        count: cleaned.length,
        outlets: cleaned
      });
    }
  } catch (err) {
    // Fallback to static data
  }

  // Fallback to static bundled outlets
  try {
    const staticPath = path.join(__dirname, '..', 'outlets.json');
    if (fs.existsSync(staticPath)) {
      const staticData = JSON.parse(fs.readFileSync(staticPath, 'utf8'));
      return res.status(200).json({
        success: true,
        source: 'static_fallback',
        count: staticData.length,
        outlets: staticData
      });
    }
  } catch (err) {
    //
  }

  return res.status(500).json({ success: false, error: 'Gagal mengambil data outlet' });
};

