const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR    = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

/* ─── STARTUP: ensure directories exist ─────────────────────── */
[DATA_DIR, UPLOADS_DIR, path.join(DATA_DIR, 'products')].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

/* ─── SESSIONS ───────────────────────────────────────────────── */
const sessions = new Map(); // token → { userId, role, email }

/* ─── MULTER — dynamic dest per product slug ─────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const slug = req.params.slug || 'default';
    const dir  = path.join(UPLOADS_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

/* ─── PASSWORD HASHING ───────────────────────────────────────── */
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

/* ─── USER HELPERS ───────────────────────────────────────────── */
function getUsers()        { return readJSON('users.json', []); }
function saveUsers(users)  { writeJSON('users.json', users); }

function ensureSuperUser() {
  const users = getUsers();
  if (users.find(u => u.role === 'superuser')) return;
  const salt = crypto.randomBytes(16).toString('hex');
  users.unshift({
    id:           'u_superuser',
    email:        'omar@prismorglasses.com',
    passwordHash: hashPassword('k&P9#zR2vL7nB$mQ', salt),
    passwordSalt: salt,
    role:         'superuser',
  });
  saveUsers(users);
}

/* ─── JSON HELPERS ───────────────────────────────────────────── */
function readJSON(relPath, defaultVal) {
  const p = path.join(DATA_DIR, relPath);
  if (!fs.existsSync(p)) return defaultVal;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return defaultVal; }
}
function writeJSON(relPath, data) {
  const p = path.join(DATA_DIR, relPath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

/* ─── PRODUCT HELPERS ────────────────────────────────────────── */
function isValidSlug(s) {
  return typeof s === 'string' && /^[a-z0-9][a-z0-9_-]{0,59}$/.test(s);
}
function listSlugs() {
  const dir = path.join(DATA_DIR, 'products');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f =>
    fs.statSync(path.join(dir, f)).isDirectory()
  );
}
function productPath(slug, file) {
  return path.join('products', slug, file);
}

/* ─── AUTH MIDDLEWARE ────────────────────────────────────────── */
function getToken(req) {
  return (req.headers.authorization || '').replace('Bearer ', '').trim();
}
function requireAuth(req, res, next) {
  const sess = sessions.get(getToken(req));
  if (!sess) return res.status(401).json({ error: 'Unauthorized' });
  req.session = sess;
  next();
}
function requireSuperUser(req, res, next) {
  requireAuth(req, res, () => {
    if (req.session.role !== 'superuser')
      return res.status(403).json({ error: 'Forbidden: superuser only' });
    next();
  });
}

/* ─── INIT ───────────────────────────────────────────────────── */
ensureSuperUser();

/* ─── MIDDLEWARE ─────────────────────────────────────────────── */
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

/* ══════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════ */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(401).json({ error: 'Invalid credentials' });
  const user = getUsers().find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (hashPassword(password, user.passwordSalt) !== user.passwordHash)
    return res.status(401).json({ error: 'Invalid credentials' });
  const tok = crypto.randomBytes(32).toString('hex');
  sessions.set(tok, { userId: user.id, role: user.role, email: user.email });
  res.json({ token: tok, role: user.role, email: user.email });
});
app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(getToken(req));
  res.json({ ok: true });
});
app.get('/api/auth/check', (req, res) => {
  const sess = sessions.get(getToken(req));
  if (!sess) return res.json({ valid: false });
  res.json({ valid: true, role: sess.role, email: sess.email });
});

/* ══════════════════════════════════════════════════════════════
   PRODUCTS — list / create / delete
══════════════════════════════════════════════════════════════ */
// Public: landing page needs this to find first product
app.get('/api/products', (req, res) => {
  const products = listSlugs().map(slug => {
    const p = readJSON(productPath(slug, 'product.json'), {});
    return { slug, name: p.productName || slug };
  });
  res.json(products);
});

app.post('/api/products', requireAuth, (req, res) => {
  const { slug, productName } = req.body || {};
  if (!isValidSlug(slug)) return res.status(400).json({ error: 'Invalid slug. Use lowercase letters, numbers, hyphens only.' });
  const dir = path.join(DATA_DIR, 'products', slug);
  if (fs.existsSync(dir)) return res.status(409).json({ error: 'A product with that slug already exists.' });
  fs.mkdirSync(dir, { recursive: true });
  writeJSON(productPath(slug, 'product.json'),        { ...defaultProduct(), productName: productName || slug });
  writeJSON(productPath(slug, 'media.json'),          defaultMedia());
  writeJSON(productPath(slug, 'recommendations.json'), defaultRecs());
  res.json({ slug, name: productName || slug });
});

app.delete('/api/products/:slug', requireAuth, (req, res) => {
  const { slug } = req.params;
  const dir = path.join(DATA_DIR, 'products', slug);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Not found' });
  fs.rmSync(dir, { recursive: true, force: true });
  const upDir = path.join(UPLOADS_DIR, slug);
  if (fs.existsSync(upDir)) fs.rmSync(upDir, { recursive: true, force: true });
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   PRODUCT CONFIG (per-product)
══════════════════════════════════════════════════════════════ */
app.get('/api/products/:slug/product', (req, res) => {
  const { slug } = req.params;
  res.json(readJSON(productPath(slug, 'product.json'), defaultProduct()));
});
app.put('/api/products/:slug/product', requireAuth, (req, res) => {
  const { slug } = req.params;
  const existing = readJSON(productPath(slug, 'product.json'), defaultProduct());
  const updated  = { ...existing, ...req.body };
  writeJSON(productPath(slug, 'product.json'), updated);
  res.json(updated);
});

/* ══════════════════════════════════════════════════════════════
   MEDIA (per-product)
══════════════════════════════════════════════════════════════ */
app.get('/api/products/:slug/media', (req, res) => {
  res.json(readJSON(productPath(req.params.slug, 'media.json'), defaultMedia()));
});

app.post('/api/products/:slug/media', requireAuth, upload.single('file'), (req, res) => {
  const { slug } = req.params;
  const media = readJSON(productPath(slug, 'media.json'), defaultMedia());
  const { label, type, gradient, isBestseller } = req.body;
  const fileType = req.file ? (req.file.mimetype.startsWith('video') ? 'video' : 'image') : null;
  const item = {
    id: `pm_${Date.now()}`,
    label:       (label || 'Untitled').trim(),
    type:        type || fileType || 'image',
    gradient:    gradient || 'linear-gradient(148deg, #1a1a1a 0%, #3a3a3a 100%)',
    isBestseller: isBestseller === 'true' || isBestseller === true,
    src:         req.file ? `/uploads/${slug}/${req.file.filename}` : null,
  };
  media.push(item);
  writeJSON(productPath(slug, 'media.json'), media);
  res.json(item);
});

app.put('/api/products/:slug/media/:id', requireAuth, (req, res) => {
  const { slug, id } = req.params;
  const media = readJSON(productPath(slug, 'media.json'), defaultMedia());
  const idx = media.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  media[idx] = { ...media[idx], ...req.body, id: media[idx].id, src: media[idx].src };
  writeJSON(productPath(slug, 'media.json'), media);
  res.json(media[idx]);
});

app.delete('/api/products/:slug/media/:id', requireAuth, (req, res) => {
  const { slug, id } = req.params;
  let media = readJSON(productPath(slug, 'media.json'), defaultMedia());
  const item = media.find(m => m.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (item.src) {
    const fp = path.join(UPLOADS_DIR, slug, path.basename(item.src));
    if (fs.existsSync(fp)) try { fs.unlinkSync(fp); } catch {}
  }
  writeJSON(productPath(slug, 'media.json'), media.filter(m => m.id !== id));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   RECOMMENDATIONS (per-product, supports image upload)
══════════════════════════════════════════════════════════════ */
app.get('/api/products/:slug/recommendations', (req, res) => {
  res.json(readJSON(productPath(req.params.slug, 'recommendations.json'), defaultRecs()));
});

app.post('/api/products/:slug/recommendations', requireAuth, upload.single('imageSrc'), (req, res) => {
  const { slug } = req.params;
  const recs = readJSON(productPath(slug, 'recommendations.json'), defaultRecs());
  const rec = {
    id: `r_${Date.now()}`,
    name:       (req.body.name || '').trim(),
    color:      (req.body.color || '').trim(),
    colorHex:   req.body.colorHex || '#1a1a1a',
    price:      parseFloat(req.body.price) || 0,
    original:   parseFloat(req.body.original) || 0,
    badge:      (req.body.badge || '').trim(),
    badgeColor: req.body.badgeColor || '',
    gradient:   req.body.gradient || 'linear-gradient(148deg, #232526 0%, #414345 100%)',
    link:       (req.body.link || '').trim(),
    imageSrc:   req.file ? `/uploads/${slug}/${req.file.filename}` : null,
  };
  recs.push(rec);
  writeJSON(productPath(slug, 'recommendations.json'), recs);
  res.json(rec);
});

app.put('/api/products/:slug/recommendations/:id', requireAuth, upload.single('imageSrc'), (req, res) => {
  const { slug, id } = req.params;
  const recs = readJSON(productPath(slug, 'recommendations.json'), defaultRecs());
  const idx = recs.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updates = { ...req.body };
  if (req.file) {
    // Delete old image
    if (recs[idx].imageSrc) {
      const fp = path.join(UPLOADS_DIR, slug, path.basename(recs[idx].imageSrc));
      if (fs.existsSync(fp)) try { fs.unlinkSync(fp); } catch {}
    }
    updates.imageSrc = `/uploads/${slug}/${req.file.filename}`;
  }
  recs[idx] = { ...recs[idx], ...updates, id: recs[idx].id };
  writeJSON(productPath(slug, 'recommendations.json'), recs);
  res.json(recs[idx]);
});

app.delete('/api/products/:slug/recommendations/:id', requireAuth, (req, res) => {
  const { slug, id } = req.params;
  let recs = readJSON(productPath(slug, 'recommendations.json'), defaultRecs());
  const item = recs.find(r => r.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (item.imageSrc) {
    const fp = path.join(UPLOADS_DIR, slug, path.basename(item.imageSrc));
    if (fs.existsSync(fp)) try { fs.unlinkSync(fp); } catch {}
  }
  writeJSON(productPath(slug, 'recommendations.json'), recs.filter(r => r.id !== id));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   ORDERS (global, includes productSlug)
══════════════════════════════════════════════════════════════ */
app.get('/api/orders', requireAuth, (req, res) => {
  res.json(readJSON('orders.json', []));
});
app.post('/api/orders', (req, res) => {
  const orders = readJSON('orders.json', []);
  const order  = { ...req.body, status: 'pending', createdAt: new Date().toISOString() };
  orders.unshift(order);
  writeJSON('orders.json', orders);
  res.json(order);
});
app.put('/api/orders/:orderId', requireAuth, (req, res) => {
  const orders = readJSON('orders.json', []);
  const idx    = orders.findIndex(o => o.orderId === req.params.orderId);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  orders[idx] = { ...orders[idx], ...req.body };
  writeJSON('orders.json', orders);
  res.json(orders[idx]);
});
app.delete('/api/orders/:orderId', requireAuth, (req, res) => {
  const orders = readJSON('orders.json', []);
  writeJSON('orders.json', orders.filter(o => o.orderId !== req.params.orderId));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   SETTINGS (superuser only — change own password)
══════════════════════════════════════════════════════════════ */
app.put('/api/settings/password', requireSuperUser, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const users = getUsers();
  const idx   = users.findIndex(u => u.id === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  if (hashPassword(currentPassword || '', users[idx].passwordSalt) !== users[idx].passwordHash)
    return res.status(401).json({ error: 'Current password is incorrect' });
  const salt = crypto.randomBytes(16).toString('hex');
  users[idx].passwordHash = hashPassword(newPassword, salt);
  users[idx].passwordSalt = salt;
  saveUsers(users);
  const currentTok = getToken(req);
  for (const [tok, sess] of sessions.entries()) {
    if (sess.userId === req.session.userId && tok !== currentTok) sessions.delete(tok);
  }
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   USER MANAGEMENT (superuser only)
══════════════════════════════════════════════════════════════ */
app.get('/api/users', requireSuperUser, (req, res) => {
  res.json(getUsers()
    .filter(u => u.role !== 'superuser')
    .map(({ id, email, role }) => ({ id, email, role })));
});

app.post('/api/users', requireSuperUser, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 6)
    return res.status(400).json({ error: 'Email and password (min 6 chars) required' });
  const users = getUsers();
  if (users.find(u => u.email === email))
    return res.status(409).json({ error: 'Email already in use' });
  const salt = crypto.randomBytes(16).toString('hex');
  const user = {
    id:           `u_${Date.now()}`,
    email,
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    role:         'admin',
  };
  users.push(user);
  saveUsers(users);
  res.json({ id: user.id, email: user.email, role: user.role });
});

app.put('/api/users/:id', requireSuperUser, (req, res) => {
  const users = getUsers();
  const idx   = users.findIndex(u => u.id === req.params.id && u.role !== 'superuser');
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { email, password } = req.body || {};
  if (email) {
    if (users.find((u, i) => i !== idx && u.email === email))
      return res.status(409).json({ error: 'Email already in use' });
    users[idx].email = email;
  }
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
    const salt = crypto.randomBytes(16).toString('hex');
    users[idx].passwordHash = hashPassword(password, salt);
    users[idx].passwordSalt = salt;
  }
  saveUsers(users);
  for (const [tok, sess] of sessions.entries()) {
    if (sess.userId === users[idx].id) sessions.delete(tok);
  }
  res.json({ id: users[idx].id, email: users[idx].email, role: users[idx].role });
});

app.delete('/api/users/:id', requireSuperUser, (req, res) => {
  const users = getUsers();
  const user  = users.find(u => u.id === req.params.id && u.role !== 'superuser');
  if (!user) return res.status(404).json({ error: 'Not found' });
  saveUsers(users.filter(u => u.id !== req.params.id));
  for (const [tok, sess] of sessions.entries()) {
    if (sess.userId === req.params.id) sessions.delete(tok);
  }
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   CATCH-ALL — never serve HTML for asset requests
══════════════════════════════════════════════════════════════ */
app.get('*', (req, res) => {
  const ext = path.extname(req.path);
  if (ext && ext !== '.html') return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ══════════════════════════════════════════════════════════════
   DEFAULT DATA
══════════════════════════════════════════════════════════════ */
function defaultProduct() {
  return {
    productName:    'New Product',
    originalPrice:  3500,
    discountPct:    20,
    deliveryInside: 70,
    deliveryOutside:120,
    whatsapp:       '8801700000000',
    website:        'https://prismorglasses.com',
    specs: [
      { key: 'Lens Type',      val: 'Polarized CR-39' },
      { key: 'UV Protection',  val: 'UV400 (100%)'    },
      { key: 'Frame Material', val: 'Premium Acetate' },
      { key: 'Frame Width',    val: '140 mm'          },
      { key: 'Lens Width',     val: '58 mm'           },
      { key: 'Bridge',         val: '18 mm'           },
      { key: 'Temple Length',  val: '145 mm'          },
      { key: 'Weight',         val: '22 g'            },
      { key: 'Gender',         val: 'Unisex'          },
      { key: 'Includes',       val: 'Hard Case + Cloth' },
    ],
  };
}
function defaultMedia() {
  return [
    { id: 'pm1', label: 'View 1', type: 'image', gradient: 'linear-gradient(148deg, #1a1a2e 0%, #16213e 45%, #0a0a14 100%)', isBestseller: true,  src: null },
    { id: 'pm2', label: 'View 2', type: 'image', gradient: 'linear-gradient(148deg, #3d1f0a 0%, #7a3a12 45%, #c07030 100%)', isBestseller: false, src: null },
  ];
}
function defaultRecs() { return []; }

app.listen(PORT, () => {
  console.log(`\n  PRISMOR — Landing Page + Admin`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Landing:  http://localhost:${PORT}/<slug>`);
  console.log(`  Admin:    http://localhost:${PORT}/admin`);
  console.log(`  Products: ${listSlugs().join(', ') || '(none yet)'}`);
  console.log(`  Press Ctrl+C to stop\n`);
});
