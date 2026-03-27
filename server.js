const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
[DATA_DIR, UPLOADS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// In-memory session token
let adminToken = null;

/* ─── MULTER ─────────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `media_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

/* ─── JSON HELPERS ───────────────────────────────────── */
function readJSON(file, defaultVal) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return defaultVal;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return defaultVal; }
}
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

/* ─── AUTH MIDDLEWARE ────────────────────────────────── */
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!adminToken || token !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/* ─── MIDDLEWARE ─────────────────────────────────────── */
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  const config = readJSON('config.json', { adminPassword: 'prismor2024' });
  if (!password || password !== config.adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  adminToken = crypto.randomBytes(32).toString('hex');
  res.json({ token: adminToken });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  adminToken = null;
  res.json({ ok: true });
});

app.get('/api/auth/check', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  res.json({ valid: !!adminToken && token === adminToken });
});

/* ══════════════════════════════════════════════════════
   PRODUCT
══════════════════════════════════════════════════════ */
app.get('/api/product', (req, res) => {
  res.json(readJSON('product.json', defaultProduct()));
});

app.put('/api/product', requireAuth, (req, res) => {
  const existing = readJSON('product.json', defaultProduct());
  const updated = { ...existing, ...req.body };
  writeJSON('product.json', updated);
  res.json(updated);
});

/* ══════════════════════════════════════════════════════
   MEDIA
══════════════════════════════════════════════════════ */
app.get('/api/media', (req, res) => {
  res.json(readJSON('media.json', defaultMedia()));
});

// Add new media item (with optional file upload)
app.post('/api/media', requireAuth, upload.single('file'), (req, res) => {
  const media = readJSON('media.json', defaultMedia());
  const { label, type, gradient, isBestseller } = req.body;
  const fileType = req.file
    ? (req.file.mimetype.startsWith('video') ? 'video' : 'image')
    : null;
  const item = {
    id: `pm_${Date.now()}`,
    label: (label || 'Untitled').trim(),
    type: type || fileType || 'image',
    gradient: gradient || 'linear-gradient(148deg, #1a1a1a 0%, #3a3a3a 100%)',
    isBestseller: isBestseller === 'true' || isBestseller === true,
    src: req.file ? `/uploads/${req.file.filename}` : null,
  };
  media.push(item);
  writeJSON('media.json', media);
  res.json(item);
});

// Update media item (label, gradient, isBestseller)
app.put('/api/media/:id', requireAuth, (req, res) => {
  const media = readJSON('media.json', defaultMedia());
  const idx = media.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  media[idx] = { ...media[idx], ...req.body, id: media[idx].id, src: media[idx].src };
  writeJSON('media.json', media);
  res.json(media[idx]);
});

// Delete media item
app.delete('/api/media/:id', requireAuth, (req, res) => {
  let media = readJSON('media.json', defaultMedia());
  const item = media.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  if (item.src) {
    const filePath = path.join(UPLOADS_DIR, path.basename(item.src));
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  writeJSON('media.json', media.filter(m => m.id !== req.params.id));
  res.json({ ok: true });
});

// Reorder media (PUT full array)
app.put('/api/media', requireAuth, (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected array' });
  writeJSON('media.json', req.body);
  res.json(req.body);
});

/* ══════════════════════════════════════════════════════
   ORDERS
══════════════════════════════════════════════════════ */
app.get('/api/orders', requireAuth, (req, res) => {
  res.json(readJSON('orders.json', []));
});

// Create order (called by landing page)
app.post('/api/orders', (req, res) => {
  const orders = readJSON('orders.json', []);
  const order = {
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.unshift(order);
  writeJSON('orders.json', orders);
  res.json(order);
});

// Update order status
app.put('/api/orders/:orderId', requireAuth, (req, res) => {
  const orders = readJSON('orders.json', []);
  const idx = orders.findIndex(o => o.orderId === req.params.orderId);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  orders[idx] = { ...orders[idx], ...req.body };
  writeJSON('orders.json', orders);
  res.json(orders[idx]);
});

// Delete order
app.delete('/api/orders/:orderId', requireAuth, (req, res) => {
  const orders = readJSON('orders.json', []);
  writeJSON('orders.json', orders.filter(o => o.orderId !== req.params.orderId));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════
   RECOMMENDATIONS
══════════════════════════════════════════════════════ */
app.get('/api/recommendations', (req, res) => {
  res.json(readJSON('recommendations.json', defaultRecs()));
});

app.post('/api/recommendations', requireAuth, (req, res) => {
  const recs = readJSON('recommendations.json', defaultRecs());
  const rec = { id: `r_${Date.now()}`, ...req.body };
  recs.push(rec);
  writeJSON('recommendations.json', recs);
  res.json(rec);
});

app.put('/api/recommendations/:id', requireAuth, (req, res) => {
  const recs = readJSON('recommendations.json', defaultRecs());
  const idx = recs.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  recs[idx] = { ...recs[idx], ...req.body, id: recs[idx].id };
  writeJSON('recommendations.json', recs);
  res.json(recs[idx]);
});

app.delete('/api/recommendations/:id', requireAuth, (req, res) => {
  const recs = readJSON('recommendations.json', defaultRecs());
  writeJSON('recommendations.json', recs.filter(r => r.id !== req.params.id));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════
   SETTINGS (password)
══════════════════════════════════════════════════════ */
app.put('/api/settings/password', requireAuth, (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const config = readJSON('config.json', { adminPassword: 'prismor2024' });
  config.adminPassword = newPassword;
  writeJSON('config.json', config);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════
   CATCH-ALL
══════════════════════════════════════════════════════ */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ══════════════════════════════════════════════════════
   DEFAULT DATA
══════════════════════════════════════════════════════ */
function defaultProduct() {
  return {
    productName: 'Eclipse Pro · Polarized UV400',
    originalPrice: 3500,
    discountPct: 20,
    deliveryInside: 70,
    deliveryOutside: 120,
    whatsapp: '8801700000000',
    website: 'https://prismorglasses.com',
    specs: [
      { key: 'Lens Type', val: 'Polarized CR-39' },
      { key: 'UV Protection', val: 'UV400 (100%)' },
      { key: 'Frame Material', val: 'Premium Acetate' },
      { key: 'Frame Width', val: '140 mm' },
      { key: 'Lens Width', val: '58 mm' },
      { key: 'Bridge', val: '18 mm' },
      { key: 'Temple Length', val: '145 mm' },
      { key: 'Weight', val: '22 g' },
      { key: 'Gender', val: 'Unisex' },
      { key: 'Includes', val: 'Hard Case + Cloth' },
    ],
  };
}

function defaultMedia() {
  return [
    { id: 'pm1', label: 'Classic Matte Black', type: 'image', gradient: 'linear-gradient(148deg, #1a1a2e 0%, #16213e 45%, #0a0a14 100%)', isBestseller: true, src: null },
    { id: 'pm2', label: 'Amber Tortoise', type: 'image', gradient: 'linear-gradient(148deg, #3d1f0a 0%, #7a3a12 45%, #c07030 100%)', isBestseller: false, src: null },
    { id: 'pm3', label: 'Ocean Blue Polarized', type: 'image', gradient: 'linear-gradient(148deg, #0f2027 0%, #1e4d6b 50%, #2c5364 100%)', isBestseller: false, src: null },
    { id: 'pm4', label: 'Desert Gold', type: 'image', gradient: 'linear-gradient(148deg, #4a3200 0%, #9a7020 45%, #c9a030 100%)', isBestseller: false, src: null },
    { id: 'pm5', label: 'Smoke Mirror', type: 'image', gradient: 'linear-gradient(148deg, #252525 0%, #484848 50%, #1a1a1a 100%)', isBestseller: false, src: null },
    { id: 'pm6', label: 'Forest Tint', type: 'image', gradient: 'linear-gradient(148deg, #0d2e1a 0%, #1a5c38 50%, #0a2014 100%)', isBestseller: false, src: null },
    { id: 'pm7', label: 'Lifestyle Film', type: 'video', gradient: 'linear-gradient(148deg, #1e1e2e 0%, #2d2d44 50%, #12121e 100%)', isBestseller: false, src: null },
    { id: 'pm8', label: 'Campaign Story', type: 'video', gradient: 'linear-gradient(148deg, #1a0a0a 0%, #3a1818 50%, #1a0a0a 100%)', isBestseller: false, src: null },
  ];
}

function defaultRecs() {
  return [
    { id: 'r1', name: 'Horizon Classic', color: 'Matte Black', colorHex: '#1a1a1a', price: 2800, original: 3500, badge: 'Popular', badgeColor: '#ff8401', gradient: 'linear-gradient(148deg, #232526 0%, #414345 100%)', link: '' },
    { id: 'r2', name: 'Soleil Slim', color: 'Crystal Silver', colorHex: '#b0b8c1', price: 2400, original: 3000, badge: '', badgeColor: '', gradient: 'linear-gradient(148deg, #8e9eab 0%, #ccd6dd 100%)', link: '' },
    { id: 'r3', name: 'Terra Pro', color: 'Amber Brown', colorHex: '#a0522d', price: 3200, original: 4000, badge: 'New', badgeColor: '#2e9e4f', gradient: 'linear-gradient(148deg, #6b3a1a 0%, #c07832 100%)', link: '' },
    { id: 'r4', name: 'Arctic Shield', color: 'Ice Blue', colorHex: '#7ec8e3', price: 2600, original: 3200, badge: '', badgeColor: '', gradient: 'linear-gradient(148deg, #3a7bd5 0%, #3a9fd5 100%)', link: '' },
    { id: 'r5', name: 'Apex Wraparound', color: 'Gunmetal', colorHex: '#4a4e58', price: 3500, original: 4500, badge: 'Sport', badgeColor: '#1a6bff', gradient: 'linear-gradient(148deg, #1c2130 0%, #3a4464 100%)', link: '' },
    { id: 'r6', name: 'Porto Aviator', color: 'Rose Gold', colorHex: '#c6846a', price: 2200, original: 2800, badge: '', badgeColor: '', gradient: 'linear-gradient(148deg, #c94b4b 0%, #4b134f 100%)', link: '' },
    { id: 'r7', name: 'Zenith Round', color: 'Havana Tortoise', colorHex: '#8B5E3C', price: 2000, original: 2500, badge: '', badgeColor: '', gradient: 'linear-gradient(148deg, #4e2a0a 0%, #8a5228 100%)', link: '' },
    { id: 'r8', name: 'Cascade Sport', color: 'Electric Blue', colorHex: '#0066ff', price: 2900, original: 3800, badge: 'Sport', badgeColor: '#1a6bff', gradient: 'linear-gradient(148deg, #0050c8 0%, #0090e0 100%)', link: '' },
    { id: 'r9', name: 'Milano Square', color: 'Olive Green', colorHex: '#6b7c3a', price: 3100, original: 4000, badge: '', badgeColor: '', gradient: 'linear-gradient(148deg, #2c4a1a 0%, #5a8030 100%)', link: '' },
    { id: 'r10', name: 'Luxe Oversized', color: 'Jet Black', colorHex: '#0a0a0a', price: 4500, original: 6000, badge: 'Premium', badgeColor: '#ff8401', gradient: 'linear-gradient(148deg, #0a0a0a 0%, #2a2a2a 100%)', link: '' },
  ];
}

app.listen(PORT, () => {
  console.log(`\n  PRISMOR — Landing Page + Admin`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Landing:  http://localhost:${PORT}`);
  console.log(`  Admin:    http://localhost:${PORT}/admin`);
  console.log(`  Press Ctrl+C to stop\n`);
});
