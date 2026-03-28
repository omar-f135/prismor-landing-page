/* ═══════════════════════════════════════════════════════════════
   PRISMOR Admin Panel — Vanilla JS
═══════════════════════════════════════════════════════════════ */

/* ─── STATE ──────────────────────────────────────────────────── */
let token = localStorage.getItem('adminToken') || '';
let currentPage = 'dashboard';
let allOrders = [];
let editingRecId = null;

/* ─── API HELPER ─────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }
  const res = await fetch(path, opts);
  if (res.status === 401) { forceLogout(); return null; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

/* ─── TOAST ──────────────────────────────────────────────────── */
let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `visible ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

/* ─── AUTH ───────────────────────────────────────────────────── */
async function checkAuth() {
  if (!token) return showLogin();
  const data = await fetch('/api/auth/check', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()).catch(() => ({ valid: false }));
  if (data.valid) showApp();
  else showLogin();
}

function showLogin() {
  document.getElementById('loginScreen').style.display = '';
  document.getElementById('app').style.display = 'none';
}

async function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  navigate(currentPage);
}

function forceLogout() {
  token = '';
  localStorage.removeItem('adminToken');
  showLogin();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('loginPassword').value.trim();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginErr');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const data = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(r => r.json());
    if (data.token) {
      token = data.token;
      localStorage.setItem('adminToken', token);
      showApp();
    } else {
      errEl.textContent = data.error || 'Login failed.';
    }
  } catch {
    errEl.textContent = 'Connection error.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('POST', '/api/auth/logout').catch(() => {});
  forceLogout();
});

/* ─── NAVIGATION ─────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  product: 'Product',
  media: 'Media',
  orders: 'Orders',
  recommendations: 'Recommendations',
  settings: 'Settings',
};

function navigate(page) {
  currentPage = page;

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Show correct page
  document.querySelectorAll('.page').forEach(el => {
    el.style.display = el.id === `page-${page}` ? '' : 'none';
  });

  // Update title
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');

  // Load page data
  loadPage(page);
}

async function loadPage(page) {
  switch (page) {
    case 'dashboard':      await loadDashboard(); break;
    case 'product':        await loadProduct();   break;
    case 'media':          await loadMedia();      break;
    case 'orders':         await loadOrders();     break;
    case 'recommendations': await loadRecs();      break;
  }
}

// Nav link clicks
document.querySelectorAll('.nav-link').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(el.dataset.page);
  });
});

// Dashboard "view all" link
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page]');
  if (link && !link.classList.contains('nav-link')) {
    e.preventDefault();
    navigate(link.dataset.page);
  }
});

// Mobile menu
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
});
document.getElementById('sidebarOverlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
});

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    allOrders = await api('GET', '/api/orders') || [];
  } catch { allOrders = []; }

  const total     = allOrders.length;
  const pending   = allOrders.filter(o => o.status === 'pending').length;
  const confirmed = allOrders.filter(o => o.status === 'confirmed').length;
  const delivered = allOrders.filter(o => o.status === 'delivered').length;

  document.getElementById('statTotal').textContent     = total;
  document.getElementById('statPending').textContent   = pending;
  document.getElementById('statConfirmed').textContent = confirmed;
  document.getElementById('statDelivered').textContent = delivered;

  // Pending badge on nav
  const badge = document.getElementById('pendingBadge');
  if (pending > 0) { badge.textContent = pending; badge.style.display = ''; }
  else badge.style.display = 'none';

  // Recent 5 orders
  const recent = allOrders.slice(0, 5);
  const container = document.getElementById('recentOrdersTable');
  if (!recent.length) {
    container.innerHTML = '<p class="table-empty">No orders yet.</p>';
    return;
  }
  container.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Order ID</th><th>Name</th><th>Phone</th><th>Total</th><th>Status</th><th>Date</th>
        </tr></thead>
        <tbody>
          ${recent.map(o => `
            <tr>
              <td><strong>${o.orderId}</strong></td>
              <td>${escHtml(o.name)}</td>
              <td>${escHtml(o.phone)}</td>
              <td>৳ ${Number(o.total || 0).toLocaleString()}</td>
              <td>${statusBadge(o.status)}</td>
              <td>${formatDate(o.createdAt)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT
═══════════════════════════════════════════════════════════════ */
async function loadProduct() {
  let product;
  try { product = await api('GET', '/api/product'); }
  catch { toast('Failed to load product data', 'error'); return; }

  document.getElementById('pName').value       = product.productName || '';
  document.getElementById('pPrice').value      = product.originalPrice || '';
  document.getElementById('pDiscount').value   = product.discountPct || '';
  document.getElementById('pDeliveryIn').value = product.deliveryInside || '';
  document.getElementById('pDeliveryOut').value = product.deliveryOutside || '';
  document.getElementById('pWhatsapp').value   = product.whatsapp || '';
  document.getElementById('pWebsite').value    = product.website || '';

  updatePricePreview();
  renderSpecEditor(product.specs || []);
}

function updatePricePreview() {
  const price    = parseFloat(document.getElementById('pPrice').value) || 0;
  const discount = parseFloat(document.getElementById('pDiscount').value) || 0;
  const inside   = parseFloat(document.getElementById('pDeliveryIn').value) || 0;
  if (!price) { document.getElementById('pricePreview').classList.remove('visible'); return; }
  const disc = Math.round(price * discount / 100);
  const after = price - disc;
  document.getElementById('pricePreview').classList.add('visible');
  document.getElementById('pricePreview').innerHTML =
    `Price: ৳${price.toLocaleString()} → after ${discount}% discount: <strong>৳${after.toLocaleString()}</strong> ·
     Total COD (Inside Dhaka): <strong>৳${(after + inside).toLocaleString()}</strong>`;
}

['pPrice', 'pDiscount', 'pDeliveryIn', 'pDeliveryOut'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updatePricePreview);
});

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    await api('PUT', '/api/product', {
      productName:    document.getElementById('pName').value.trim(),
      originalPrice:  parseFloat(document.getElementById('pPrice').value),
      discountPct:    parseFloat(document.getElementById('pDiscount').value),
      deliveryInside: parseFloat(document.getElementById('pDeliveryIn').value),
      deliveryOutside:parseFloat(document.getElementById('pDeliveryOut').value),
      whatsapp:       document.getElementById('pWhatsapp').value.trim(),
      website:        document.getElementById('pWebsite').value.trim(),
    });
    toast('Product details saved!');
  } catch (err) {
    toast(err.message || 'Save failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Product Details';
  }
});

/* ── Spec Editor ─────────────────────────────────────── */
function renderSpecEditor(specs) {
  const container = document.getElementById('specEditor');
  container.innerHTML = `<div class="spec-table" id="specRows">
    ${specs.map((s, i) => specRowHTML(s.key, s.val, i)).join('')}
  </div>`;
}

function specRowHTML(key, val, i) {
  return `<div class="spec-row" data-idx="${i}">
    <input type="text" placeholder="e.g. Lens Type" value="${escHtml(key)}" class="spec-key-input" />
    <input type="text" placeholder="e.g. Polarized CR-39" value="${escHtml(val)}" class="spec-val-input" />
    <button type="button" class="btn-danger" onclick="removeSpecRow(this)">✕</button>
  </div>`;
}

function removeSpecRow(btn) {
  btn.closest('.spec-row').remove();
}

document.getElementById('addSpecBtn').addEventListener('click', () => {
  const container = document.getElementById('specRows');
  const idx = container.children.length;
  const row = document.createElement('div');
  row.className = 'spec-row';
  row.dataset.idx = idx;
  row.innerHTML = `
    <input type="text" placeholder="e.g. Lens Type" class="spec-key-input" />
    <input type="text" placeholder="e.g. Polarized CR-39" class="spec-val-input" />
    <button type="button" class="btn-danger" onclick="removeSpecRow(this)">✕</button>`;
  container.appendChild(row);
  row.querySelector('input').focus();
});

document.getElementById('saveSpecsBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveSpecsBtn');
  const specs = [];
  document.querySelectorAll('.spec-row').forEach(row => {
    const key = row.querySelector('.spec-key-input').value.trim();
    const val = row.querySelector('.spec-val-input').value.trim();
    if (key) specs.push({ key, val });
  });
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const product = await api('GET', '/api/product');
    await api('PUT', '/api/product', { ...product, specs });
    toast('Specifications saved!');
  } catch (err) {
    toast(err.message || 'Save failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Specifications';
  }
});

/* ═══════════════════════════════════════════════════════════════
   MEDIA
═══════════════════════════════════════════════════════════════ */
async function loadMedia() {
  let media;
  try { media = await api('GET', '/api/media') || []; }
  catch { toast('Failed to load media', 'error'); return; }
  renderMediaGrid(media);
}

function renderMediaGrid(media) {
  const grid = document.getElementById('mediaGrid');
  if (!media.length) {
    grid.innerHTML = '<p class="media-empty">No media items yet. Upload one below.</p>';
    return;
  }
  grid.innerHTML = media.map(item => `
    <div class="media-item" id="mi-${item.id}">
      <div class="media-thumb" style="background:${item.gradient};">
        ${item.src
          ? (item.type === 'video'
              ? `<video src="${item.src}" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
              : `<img src="${item.src}" alt="${escHtml(item.label)}" />`)
          : glassesThumbSVG()}
        <span class="media-type-badge">${item.type}</span>
        ${item.isBestseller ? '<span class="bestseller-badge">★ Best</span>' : ''}
      </div>
      <div class="media-info">
        <p class="media-label" title="${escHtml(item.label)}">${escHtml(item.label)}</p>
        <div class="media-actions">
          <button class="btn-danger btn-sm" onclick="deleteMedia('${item.id}')">Delete</button>
        </div>
      </div>
    </div>`).join('');
}

async function deleteMedia(id) {
  if (!confirm('Delete this media item?')) return;
  try {
    await api('DELETE', `/api/media/${id}`);
    document.getElementById(`mi-${id}`)?.remove();
    toast('Media deleted.');
    // Check if grid is now empty
    if (!document.querySelector('.media-item')) {
      document.getElementById('mediaGrid').innerHTML =
        '<p class="media-empty">No media items yet. Upload one below.</p>';
    }
  } catch (err) {
    toast(err.message || 'Delete failed', 'error');
  }
}

document.getElementById('mediaUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('uploadMediaBtn');
  const label = document.getElementById('mLabel').value.trim();
  if (!label) { toast('Please enter a label', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Uploading…';

  const fd = new FormData();
  fd.append('label',       label);
  fd.append('type',        document.getElementById('mType').value);
  fd.append('gradient',    document.getElementById('mGradient').value.trim() || 'linear-gradient(148deg, #1a1a1a 0%, #3a3a3a 100%)');
  fd.append('isBestseller', document.getElementById('mBestseller').value);

  const file = document.getElementById('mFile').files[0];
  if (file) fd.append('file', file);

  try {
    await api('POST', '/api/media', fd);
    toast('Media uploaded!');
    e.target.reset();
    await loadMedia();
  } catch (err) {
    toast(err.message || 'Upload failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Upload & Add';
  }
});

/* ═══════════════════════════════════════════════════════════════
   ORDERS
═══════════════════════════════════════════════════════════════ */
async function loadOrders(filter = '') {
  try { allOrders = await api('GET', '/api/orders') || []; }
  catch { toast('Failed to load orders', 'error'); return; }

  // Update pending badge
  const pending = allOrders.filter(o => o.status === 'pending').length;
  const badge = document.getElementById('pendingBadge');
  if (pending > 0) { badge.textContent = pending; badge.style.display = ''; }
  else badge.style.display = 'none';

  renderOrdersTable(filter || document.getElementById('orderSearch')?.value || '');
}

function renderOrdersTable(search = '') {
  const filtered = search
    ? allOrders.filter(o =>
        (o.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.phone || '').includes(search) ||
        (o.orderId || '').toLowerCase().includes(search.toLowerCase()))
    : allOrders;

  const container = document.getElementById('ordersTable');
  if (!filtered.length) {
    container.innerHTML = `<p class="table-empty">${search ? 'No matching orders.' : 'No orders yet.'}</p>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Order ID</th><th>Name</th><th>Phone</th><th>Address</th>
          <th>Variant</th><th>Delivery</th><th>Total</th><th>Status</th><th>Date</th><th></th>
        </tr></thead>
        <tbody>
          ${filtered.map(o => `
            <tr id="or-${o.orderId}">
              <td><strong>${escHtml(o.orderId)}</strong></td>
              <td>${escHtml(o.name)}</td>
              <td>${escHtml(o.phone)}</td>
              <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(o.address)}">${escHtml(o.address)}</td>
              <td style="font-size:12px;color:#666;">${escHtml(o.mediaLabel || '—')}</td>
              <td style="font-size:12px;">${o.delivery === 'outside' ? 'Outside Dhaka' : 'Inside Dhaka'}</td>
              <td><strong>৳ ${Number(o.total || 0).toLocaleString()}</strong></td>
              <td>
                <select class="status-select status-${o.status}" onchange="updateOrderStatus('${o.orderId}', this)">
                  <option value="pending"   ${o.status === 'pending'   ? 'selected' : ''}>Pending</option>
                  <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                  <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                  <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
              </td>
              <td style="font-size:12px;color:#888;">${formatDate(o.createdAt)}</td>
              <td><button class="btn-danger btn-sm" onclick="deleteOrder('${o.orderId}')">Delete</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function updateOrderStatus(orderId, selectEl) {
  const newStatus = selectEl.value;
  // Update class immediately
  selectEl.className = `status-select status-${newStatus}`;
  try {
    await api('PUT', `/api/orders/${orderId}`, { status: newStatus });
    // Refresh pending count
    allOrders = allOrders.map(o => o.orderId === orderId ? { ...o, status: newStatus } : o);
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const badge = document.getElementById('pendingBadge');
    if (pending > 0) { badge.textContent = pending; badge.style.display = ''; }
    else badge.style.display = 'none';
    toast('Status updated.');
  } catch (err) {
    toast(err.message || 'Update failed', 'error');
  }
}

async function deleteOrder(orderId) {
  if (!confirm(`Delete order ${orderId}?`)) return;
  try {
    await api('DELETE', `/api/orders/${orderId}`);
    document.getElementById(`or-${orderId}`)?.remove();
    allOrders = allOrders.filter(o => o.orderId !== orderId);
    toast('Order deleted.');
    if (!document.querySelector('#ordersTable tr[id^="or-"]')) {
      document.getElementById('ordersTable').innerHTML =
        '<p class="table-empty">No orders yet.</p>';
    }
  } catch (err) {
    toast(err.message || 'Delete failed', 'error');
  }
}

// Order search
document.getElementById('orderSearch')?.addEventListener('input', (e) => {
  renderOrdersTable(e.target.value);
});

/* ═══════════════════════════════════════════════════════════════
   RECOMMENDATIONS
═══════════════════════════════════════════════════════════════ */
async function loadRecs() {
  let recs;
  try { recs = await api('GET', '/api/recommendations') || []; }
  catch { toast('Failed to load recommendations', 'error'); return; }
  renderRecList(recs);
}

function renderRecList(recs) {
  const container = document.getElementById('recList');
  if (!recs.length) {
    container.innerHTML = '<p class="table-empty">No recommendations yet.</p>';
    return;
  }
  container.innerHTML = `
    <div class="table-wrap">
      <table class="rec-list-table">
        <thead><tr>
          <th>Preview</th><th>Name</th><th>Color</th><th>Price</th><th>Original</th><th>Badge</th><th>Link</th><th></th>
        </tr></thead>
        <tbody>
          ${recs.map(r => `
            <tr id="rec-${r.id}">
              <td><span class="rec-gradient-dot" style="background:${r.gradient};"></span></td>
              <td><strong>${escHtml(r.name)}</strong></td>
              <td>
                <span class="rec-color-dot" style="background:${r.colorHex};"></span>
                ${escHtml(r.color)}
              </td>
              <td>৳ ${Number(r.price).toLocaleString()}</td>
              <td style="color:#888;text-decoration:line-through;">৳ ${Number(r.original).toLocaleString()}</td>
              <td>${r.badge ? `<span style="background:${r.badgeColor};color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;">${escHtml(r.badge)}</span>` : '—'}</td>
              <td class="rec-link-cell">${r.link ? `<a href="${escHtml(r.link)}" target="_blank" rel="noopener">${escHtml(r.link)}</a>` : '—'}</td>
              <td style="white-space:nowrap;">
                <button class="btn-edit btn-sm" onclick="openRecForm('${r.id}')">Edit</button>
                <button class="btn-danger btn-sm" style="margin-left:4px;" onclick="deleteRec('${r.id}')">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

document.getElementById('addRecBtn').addEventListener('click', () => {
  editingRecId = null;
  document.getElementById('recFormTitle').textContent = 'Add Product';
  document.getElementById('recSubmitBtn').textContent = 'Add Product';
  document.getElementById('recForm').reset();
  document.getElementById('recId').value = '';
  document.getElementById('recFormCard').style.display = '';
  document.getElementById('recFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('cancelRecBtn').addEventListener('click', () => {
  document.getElementById('recFormCard').style.display = 'none';
  editingRecId = null;
});

async function openRecForm(id) {
  let recs;
  try { recs = await api('GET', '/api/recommendations') || []; }
  catch { toast('Failed to load data', 'error'); return; }
  const rec = recs.find(r => r.id === id);
  if (!rec) return;

  editingRecId = id;
  document.getElementById('recFormTitle').textContent = 'Edit Product';
  document.getElementById('recSubmitBtn').textContent = 'Save Changes';
  document.getElementById('recId').value        = rec.id;
  document.getElementById('rName').value         = rec.name || '';
  document.getElementById('rColor').value        = rec.color || '';
  document.getElementById('rColorHex').value     = rec.colorHex || '#1a1a1a';
  document.getElementById('rColorHexPicker').value = rec.colorHex || '#1a1a1a';
  document.getElementById('rLink').value         = rec.link || '';
  document.getElementById('rPrice').value        = rec.price || '';
  document.getElementById('rOriginal').value     = rec.original || '';
  document.getElementById('rBadge').value        = rec.badge || '';
  document.getElementById('rBadgeColor').value   = rec.badgeColor || '#ff8401';
  document.getElementById('rBadgeColorPicker').value = rec.badgeColor || '#ff8401';
  document.getElementById('rGradient').value     = rec.gradient || '';

  document.getElementById('recFormCard').style.display = '';
  document.getElementById('recFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('recForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('recSubmitBtn');
  btn.disabled = true;

  const payload = {
    name:       document.getElementById('rName').value.trim(),
    color:      document.getElementById('rColor').value.trim(),
    colorHex:   document.getElementById('rColorHex').value.trim(),
    link:       document.getElementById('rLink').value.trim(),
    price:      parseFloat(document.getElementById('rPrice').value),
    original:   parseFloat(document.getElementById('rOriginal').value),
    badge:      document.getElementById('rBadge').value.trim(),
    badgeColor: document.getElementById('rBadgeColor').value.trim(),
    gradient:   document.getElementById('rGradient').value.trim() || 'linear-gradient(148deg, #232526 0%, #414345 100%)',
  };

  try {
    if (editingRecId) {
      await api('PUT', `/api/recommendations/${editingRecId}`, payload);
      toast('Product updated!');
    } else {
      await api('POST', '/api/recommendations', payload);
      toast('Product added!');
    }
    document.getElementById('recFormCard').style.display = 'none';
    editingRecId = null;
    await loadRecs();
  } catch (err) {
    toast(err.message || 'Save failed', 'error');
  } finally {
    btn.disabled = false;
  }
});

async function deleteRec(id) {
  if (!confirm('Delete this recommendation?')) return;
  try {
    await api('DELETE', `/api/recommendations/${id}`);
    document.getElementById(`rec-${id}`)?.remove();
    toast('Deleted.');
  } catch (err) {
    toast(err.message || 'Delete failed', 'error');
  }
}

// Color picker sync
function syncColorPicker(pickerId, textId) {
  const picker = document.getElementById(pickerId);
  const text   = document.getElementById(textId);
  picker?.addEventListener('input', () => { text.value = picker.value; });
  text?.addEventListener('input',   () => {
    if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value;
  });
}
syncColorPicker('rColorHexPicker',   'rColorHex');
syncColorPicker('rBadgeColorPicker', 'rBadgeColor');

/* ═══════════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════════ */
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const current  = document.getElementById('currentPassword').value;
  const next     = document.getElementById('newPassword').value;
  const confirm  = document.getElementById('confirmPassword').value;
  const errEl    = document.getElementById('passwordErr');
  errEl.textContent = '';

  if (next !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
  if (next.length < 6)  { errEl.textContent = 'Password must be at least 6 characters.'; return; }

  // Verify current password by attempting login
  const check = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: current }),
  }).then(r => r.json()).catch(() => ({}));

  if (!check.token) { errEl.textContent = 'Current password is incorrect.'; return; }

  const btn = e.submitter;
  btn.disabled = true;
  try {
    await api('PUT', '/api/settings/password', { newPassword: next });
    toast('Password updated! Please log in again.');
    e.target.reset();
    setTimeout(forceLogout, 2000);
  } catch (err) {
    errEl.textContent = err.message || 'Update failed.';
  } finally {
    btn.disabled = false;
  }
});

/* ═══════════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const labels = { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' };
  return `<span class="status-select status-${status}" style="pointer-events:none;font-size:11px;">${labels[status] || status}</span>`;
}

function glassesThumbSVG() {
  return `<svg width="64" height="35" viewBox="0 0 180 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 50 Q20 20 38 36" stroke="rgba(255,255,255,.3)" stroke-width="3" stroke-linecap="round"/>
    <path d="M142 36 Q160 20 176 50" stroke="rgba(255,255,255,.3)" stroke-width="3" stroke-linecap="round"/>
    <rect x="18" y="30" width="58" height="42" rx="18" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" stroke-width="3"/>
    <rect x="104" y="30" width="58" height="42" rx="18" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" stroke-width="3"/>
    <path d="M76 51 Q90 43 104 51" stroke="rgba(255,255,255,.25)" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

/* ─── BOOT ───────────────────────────────────────────────────── */
checkAuth();
