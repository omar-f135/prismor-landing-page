/* ═══════════════════════════════════════════════════════════════
   PRISMOR Admin Panel — Multi-product edition
═══════════════════════════════════════════════════════════════ */

/* ─── STATE ──────────────────────────────────────────────────── */
let token              = localStorage.getItem('adminToken') || '';
let currentUserRole    = localStorage.getItem('adminRole')  || '';
let currentUserEmail   = localStorage.getItem('adminEmail') || '';
let currentPage        = 'dashboard';
let currentProductSlug = localStorage.getItem('adminCurrentProduct') || '';
let allOrders          = [];
let editingRecId       = null;
let removeRecImage     = false;
let editingUserId      = null;

/* ─── API HELPER ─────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
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
  if (data.valid) {
    currentUserRole  = data.role;
    currentUserEmail = data.email;
    localStorage.setItem('adminRole',  data.role);
    localStorage.setItem('adminEmail', data.email);
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').style.display = '';
  document.getElementById('app').style.display = 'none';
}

function applyRoleUI() {
  const isSuperUser = currentUserRole === 'superuser';
  // Users nav: superuser only
  document.getElementById('navUsers').style.display = isSuperUser ? '' : 'none';
  // Settings nav: superuser only (admins can't change password)
  document.getElementById('navSettings').style.display = isSuperUser ? '' : 'none';
}

async function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  applyRoleUI();
  navigate(currentPage);
}

function forceLogout() {
  token = '';
  currentUserRole  = '';
  currentUserEmail = '';
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminRole');
  localStorage.removeItem('adminEmail');
  showLogin();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const btn      = document.getElementById('loginBtn');
  const errEl    = document.getElementById('loginErr');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const data = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json());
    if (data.token) {
      token = data.token;
      currentUserRole  = data.role;
      currentUserEmail = data.email;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminRole',  data.role);
      localStorage.setItem('adminEmail', data.email);
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

/* ─── CURRENT PRODUCT HELPERS ────────────────────────────────── */
const PER_PRODUCT_PAGES = ['product', 'media', 'recommendations'];

function setCurrentProduct(slug, name) {
  currentProductSlug = slug;
  localStorage.setItem('adminCurrentProduct', slug);

  // Show/hide per-product nav links
  const show = !!slug;
  document.getElementById('perProductSep').style.display  = show ? '' : 'none';
  document.getElementById('navProduct').style.display     = show ? '' : 'none';
  document.getElementById('navMedia').style.display       = show ? '' : 'none';
  document.getElementById('navRecs').style.display        = show ? '' : 'none';

  // Update chip
  const chip = document.getElementById('currentProductChip');
  if (slug) {
    chip.textContent = `Editing: ${slug}`;
    chip.style.display = '';
  } else {
    chip.style.display = 'none';
  }

  // Update "View Page" link
  const viewBtn = document.getElementById('viewPageBtn');
  if (viewBtn) viewBtn.href = slug ? `/${slug}` : '/';
}

function requireProduct() {
  if (!currentProductSlug) {
    document.getElementById('pageContent').querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(`page-${currentPage}`).style.display = '';
    document.getElementById(`page-${currentPage}`).innerHTML = `
      <div class="card" style="padding:32px;text-align:center;">
        <p style="color:#888;font-size:14px;margin-bottom:16px;">Select a product first to manage this section.</p>
        <button class="btn-primary" onclick="navigate('products')">Go to Products</button>
      </div>`;
    return false;
  }
  return true;
}

/* ─── NAVIGATION ─────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard: 'Dashboard', products: 'Products',
  product: 'Product Details', media: 'Media',
  orders: 'Orders', recommendations: 'Recommendations',
  users: 'Users', settings: 'Settings',
};

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el => { el.style.display = el.id === `page-${page}` ? '' : 'none'; });
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  loadPage(page);
}

async function loadPage(page) {
  switch (page) {
    case 'dashboard':       await loadDashboard();     break;
    case 'products':        await loadProductsList();  break;
    case 'product':         await loadProduct();       break;
    case 'media':           await loadMedia();         break;
    case 'orders':          await loadOrders();        break;
    case 'recommendations': await loadRecs();          break;
    case 'users':           await loadUsersPage();     break;
  }
}

document.querySelectorAll('.nav-link').forEach(el => {
  el.addEventListener('click', (e) => { e.preventDefault(); navigate(el.dataset.page); });
});
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page]');
  if (link && !link.classList.contains('nav-link')) { e.preventDefault(); navigate(link.dataset.page); }
});
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
  try { allOrders = await api('GET', '/api/orders') || []; } catch { allOrders = []; }

  const total     = allOrders.length;
  const pending   = allOrders.filter(o => o.status === 'pending').length;
  const confirmed = allOrders.filter(o => o.status === 'confirmed').length;
  const delivered = allOrders.filter(o => o.status === 'delivered').length;

  document.getElementById('statTotal').textContent     = total;
  document.getElementById('statPending').textContent   = pending;
  document.getElementById('statConfirmed').textContent = confirmed;
  document.getElementById('statDelivered').textContent = delivered;

  const badge = document.getElementById('pendingBadge');
  if (pending > 0) { badge.textContent = pending; badge.style.display = ''; }
  else badge.style.display = 'none';

  const recent = allOrders.slice(0, 5);
  const container = document.getElementById('recentOrdersTable');
  if (!recent.length) { container.innerHTML = '<p class="table-empty">No orders yet.</p>'; return; }
  container.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Order ID</th><th>Product</th><th>Name</th><th>Phone</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${recent.map(o => `
            <tr>
              <td><strong>${escHtml(o.orderId)}</strong></td>
              <td><span class="product-slug-badge">${escHtml(o.productSlug || '—')}</span></td>
              <td>${escHtml(o.name)}</td><td>${escHtml(o.phone)}</td>
              <td>৳ ${Number(o.total || 0).toLocaleString()}</td>
              <td>${statusBadge(o.status)}</td>
              <td>${formatDate(o.createdAt)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCTS LIST
═══════════════════════════════════════════════════════════════ */
async function loadProductsList() {
  let products;
  try { products = await api('GET', '/api/products') || []; }
  catch { toast('Failed to load products', 'error'); return; }

  const container = document.getElementById('productsList');
  if (!products.length) {
    container.innerHTML = '<p class="table-empty">No products yet. Create your first one below.</p>';
    document.getElementById('addProductCard').style.display = '';
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="product-list-item">
      <span class="product-slug-badge">${escHtml(p.slug)}</span>
      <div>
        <p class="product-list-name">${escHtml(p.name)}</p>
        <p class="product-list-url">yoursite.com/${escHtml(p.slug)}</p>
      </div>
      <div class="product-list-actions">
        <a href="/${escHtml(p.slug)}" target="_blank" class="btn-secondary btn-sm">Preview ↗</a>
        <button class="btn-primary btn-sm" onclick="selectProduct('${escHtml(p.slug)}','${escHtml(p.name)}')">Manage</button>
        <button class="btn-danger btn-sm" onclick="deleteProduct('${escHtml(p.slug)}','${escHtml(p.name)}')">Delete</button>
      </div>
    </div>`).join('');
}

function selectProduct(slug, name) {
  setCurrentProduct(slug, name);
  navigate('product');
  toast(`Now editing: ${slug}`);
}

async function deleteProduct(slug, name) {
  if (!confirm(`Delete product "${name}" (/${slug})?\n\nThis will permanently remove all its data and uploads.`)) return;
  try {
    await api('DELETE', `/api/products/${slug}`);
    if (currentProductSlug === slug) setCurrentProduct('', '');
    toast('Product deleted.');
    await loadProductsList();
  } catch (err) {
    toast(err.message || 'Delete failed', 'error');
  }
}

// Add product form
document.getElementById('showAddProductBtn').addEventListener('click', () => {
  const card = document.getElementById('addProductCard');
  card.style.display = card.style.display === 'none' ? '' : 'none';
});
document.getElementById('cancelAddProductBtn').addEventListener('click', () => {
  document.getElementById('addProductCard').style.display = 'none';
});
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const slug = document.getElementById('newSlug').value.trim().toLowerCase();
  const name = document.getElementById('newProductName').value.trim();
  const errEl = document.getElementById('addProductErr');
  errEl.textContent = '';
  const btn = e.submitter;
  btn.disabled = true;
  try {
    await api('POST', '/api/products', { slug, productName: name || slug });
    toast(`Product "${slug}" created!`);
    e.target.reset();
    document.getElementById('addProductCard').style.display = 'none';
    await loadProductsList();
  } catch (err) {
    errEl.textContent = err.message || 'Create failed.';
  } finally {
    btn.disabled = false;
  }
});

/* ═══════════════════════════════════════════════════════════════
   PRODUCT DETAILS
═══════════════════════════════════════════════════════════════ */
async function loadProduct() {
  if (!requireProduct()) return;
  let product;
  try { product = await api('GET', `/api/products/${currentProductSlug}/product`); }
  catch { toast('Failed to load product', 'error'); return; }

  document.getElementById('pName').value        = product.productName || '';
  document.getElementById('pPrice').value       = product.originalPrice || '';
  document.getElementById('pDiscount').value    = product.discountPct || '';
  document.getElementById('pDeliveryIn').value  = product.deliveryInside || '';
  document.getElementById('pDeliveryOut').value = product.deliveryOutside || '';
  document.getElementById('pWhatsapp').value    = product.whatsapp || '';
  document.getElementById('pWebsite').value     = product.website || '';
  updatePricePreview();
  renderSpecEditor(product.specs || []);
}

function updatePricePreview() {
  const price = parseFloat(document.getElementById('pPrice').value) || 0;
  const disc  = parseFloat(document.getElementById('pDiscount').value) || 0;
  const inside = parseFloat(document.getElementById('pDeliveryIn').value) || 0;
  const prev = document.getElementById('pricePreview');
  if (!price) { prev.classList.remove('visible'); return; }
  const discAmt = Math.round(price * disc / 100);
  prev.classList.add('visible');
  prev.innerHTML = `Price: ৳${price.toLocaleString()} → after ${disc}% discount: <strong>৳${(price - discAmt).toLocaleString()}</strong> · Total COD (Inside Dhaka): <strong>৳${(price - discAmt + inside).toLocaleString()}</strong>`;
}
['pPrice', 'pDiscount', 'pDeliveryIn', 'pDeliveryOut'].forEach(id =>
  document.getElementById(id)?.addEventListener('input', updatePricePreview));

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!requireProduct()) return;
  const btn = e.submitter; btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await api('PUT', `/api/products/${currentProductSlug}/product`, {
      productName:     document.getElementById('pName').value.trim(),
      originalPrice:   parseFloat(document.getElementById('pPrice').value),
      discountPct:     parseFloat(document.getElementById('pDiscount').value),
      deliveryInside:  parseFloat(document.getElementById('pDeliveryIn').value),
      deliveryOutside: parseFloat(document.getElementById('pDeliveryOut').value),
      whatsapp:        document.getElementById('pWhatsapp').value.trim(),
      website:         document.getElementById('pWebsite').value.trim(),
    });
    toast('Product details saved!');
  } catch (err) { toast(err.message || 'Save failed', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Save Product Details'; }
});

/* ── Spec Editor ─────────────────────────────────────── */
function renderSpecEditor(specs) {
  document.getElementById('specEditor').innerHTML = `<div class="spec-table" id="specRows">
    ${specs.map((s, i) => `<div class="spec-row" data-idx="${i}">
      <input type="text" placeholder="e.g. Lens Type" value="${escHtml(s.key)}" class="spec-key-input" />
      <input type="text" placeholder="e.g. Polarized CR-39" value="${escHtml(s.val)}" class="spec-val-input" />
      <button type="button" class="btn-danger" onclick="this.closest('.spec-row').remove()">✕</button>
    </div>`).join('')}
  </div>`;
}
document.getElementById('addSpecBtn').addEventListener('click', () => {
  const row = document.createElement('div');
  row.className = 'spec-row';
  row.innerHTML = `
    <input type="text" placeholder="e.g. Lens Type" class="spec-key-input" />
    <input type="text" placeholder="e.g. Polarized CR-39" class="spec-val-input" />
    <button type="button" class="btn-danger" onclick="this.closest('.spec-row').remove()">✕</button>`;
  document.getElementById('specRows').appendChild(row);
  row.querySelector('input').focus();
});
document.getElementById('saveSpecsBtn').addEventListener('click', async () => {
  if (!requireProduct()) return;
  const btn = document.getElementById('saveSpecsBtn');
  const specs = [];
  document.querySelectorAll('.spec-row').forEach(row => {
    const key = row.querySelector('.spec-key-input').value.trim();
    const val = row.querySelector('.spec-val-input').value.trim();
    if (key) specs.push({ key, val });
  });
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const product = await api('GET', `/api/products/${currentProductSlug}/product`);
    await api('PUT', `/api/products/${currentProductSlug}/product`, { ...product, specs });
    toast('Specifications saved!');
  } catch (err) { toast(err.message || 'Save failed', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Save Specifications'; }
});

/* ═══════════════════════════════════════════════════════════════
   MEDIA
═══════════════════════════════════════════════════════════════ */
async function loadMedia() {
  if (!requireProduct()) return;
  let media;
  try { media = await api('GET', `/api/products/${currentProductSlug}/media`) || []; }
  catch { toast('Failed to load media', 'error'); return; }
  renderMediaGrid(media);
}

function renderMediaGrid(media) {
  const grid = document.getElementById('mediaGrid');
  if (!media.length) { grid.innerHTML = '<p class="media-empty">No media items. Upload one below.</p>'; return; }
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
    await api('DELETE', `/api/products/${currentProductSlug}/media/${id}`);
    document.getElementById(`mi-${id}`)?.remove();
    toast('Media deleted.');
    if (!document.querySelector('.media-item'))
      document.getElementById('mediaGrid').innerHTML = '<p class="media-empty">No media items. Upload one below.</p>';
  } catch (err) { toast(err.message || 'Delete failed', 'error'); }
}

document.getElementById('mediaUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!requireProduct()) return;
  const label = document.getElementById('mLabel').value.trim();
  if (!label) { toast('Please enter a label', 'error'); return; }
  const btn = document.getElementById('uploadMediaBtn');
  btn.disabled = true; btn.textContent = 'Uploading…';
  const fd = new FormData();
  fd.append('label',        label);
  fd.append('type',         document.getElementById('mType').value);
  fd.append('gradient',     document.getElementById('mGradient').value.trim() || 'linear-gradient(148deg, #1a1a1a 0%, #3a3a3a 100%)');
  fd.append('isBestseller', document.getElementById('mBestseller').value);
  const file = document.getElementById('mFile').files[0];
  if (file) fd.append('file', file);
  try {
    await api('POST', `/api/products/${currentProductSlug}/media`, fd);
    toast('Media uploaded!');
    e.target.reset();
    await loadMedia();
  } catch (err) { toast(err.message || 'Upload failed', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Upload & Add'; }
});

/* ═══════════════════════════════════════════════════════════════
   ORDERS
═══════════════════════════════════════════════════════════════ */
async function loadOrders(filter = '') {
  try { allOrders = await api('GET', '/api/orders') || []; }
  catch { toast('Failed to load orders', 'error'); return; }
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
        (o.orderId || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.productSlug || '').toLowerCase().includes(search.toLowerCase()))
    : allOrders;

  const container = document.getElementById('ordersTable');
  if (!filtered.length) { container.innerHTML = `<p class="table-empty">${search ? 'No matching orders.' : 'No orders yet.'}</p>`; return; }

  container.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Order ID</th><th>Product</th><th>Name</th><th>Phone</th><th>Address</th>
          <th>Delivery</th><th>Total</th><th>Status</th><th>Date</th><th></th>
        </tr></thead>
        <tbody>
          ${filtered.map(o => `
            <tr id="or-${o.orderId}">
              <td><strong>${escHtml(o.orderId)}</strong></td>
              <td><span class="product-slug-badge">${escHtml(o.productSlug || '—')}</span></td>
              <td>${escHtml(o.name)}</td>
              <td>${escHtml(o.phone)}</td>
              <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(o.address)}">${escHtml(o.address)}</td>
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
  selectEl.className = `status-select status-${newStatus}`;
  try {
    await api('PUT', `/api/orders/${orderId}`, { status: newStatus });
    allOrders = allOrders.map(o => o.orderId === orderId ? { ...o, status: newStatus } : o);
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const badge = document.getElementById('pendingBadge');
    if (pending > 0) { badge.textContent = pending; badge.style.display = ''; }
    else badge.style.display = 'none';
    toast('Status updated.');
  } catch (err) { toast(err.message || 'Update failed', 'error'); }
}

async function deleteOrder(orderId) {
  if (!confirm(`Delete order ${orderId}?`)) return;
  try {
    await api('DELETE', `/api/orders/${orderId}`);
    document.getElementById(`or-${orderId}`)?.remove();
    allOrders = allOrders.filter(o => o.orderId !== orderId);
    toast('Order deleted.');
    if (!document.querySelector('#ordersTable tr[id^="or-"]'))
      document.getElementById('ordersTable').innerHTML = '<p class="table-empty">No orders yet.</p>';
  } catch (err) { toast(err.message || 'Delete failed', 'error'); }
}

document.getElementById('orderSearch')?.addEventListener('input', (e) => renderOrdersTable(e.target.value));

/* ═══════════════════════════════════════════════════════════════
   RECOMMENDATIONS
═══════════════════════════════════════════════════════════════ */
async function loadRecs() {
  if (!requireProduct()) return;
  let recs;
  try { recs = await api('GET', `/api/products/${currentProductSlug}/recommendations`) || []; }
  catch { toast('Failed to load recommendations', 'error'); return; }
  renderRecList(recs);
}

function renderRecList(recs) {
  const container = document.getElementById('recList');
  if (!recs.length) { container.innerHTML = '<p class="table-empty">No recommendations yet.</p>'; return; }
  container.innerHTML = `
    <div class="table-wrap">
      <table class="rec-list-table">
        <thead><tr>
          <th>Image</th><th>Name</th><th>Color</th><th>Price</th><th>Original</th><th>Badge</th><th>Link</th><th></th>
        </tr></thead>
        <tbody>
          ${recs.map(r => `
            <tr id="rec-${r.id}">
              <td>
                ${r.imageSrc
                  ? `<img src="${escHtml(r.imageSrc)}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e8e8e4;" />`
                  : `<span class="rec-gradient-dot" style="background:${r.gradient};"></span>`}
              </td>
              <td><strong>${escHtml(r.name)}</strong></td>
              <td><span class="rec-color-dot" style="background:${r.colorHex};"></span>${escHtml(r.color)}</td>
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
  removeRecImage = false;
  document.getElementById('recFormTitle').textContent  = 'Add Product';
  document.getElementById('recSubmitBtn').textContent  = 'Add Product';
  document.getElementById('recForm').reset();
  document.getElementById('recId').value = '';
  document.getElementById('rImagePreviewWrap').style.display = 'none';
  document.getElementById('recFormCard').style.display = '';
  document.getElementById('recFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('cancelRecBtn').addEventListener('click', () => {
  document.getElementById('recFormCard').style.display = 'none';
  editingRecId = null;
});

async function openRecForm(id) {
  if (!requireProduct()) return;
  let recs;
  try { recs = await api('GET', `/api/products/${currentProductSlug}/recommendations`) || []; }
  catch { toast('Failed to load data', 'error'); return; }
  const rec = recs.find(r => r.id === id);
  if (!rec) return;

  editingRecId = id;
  removeRecImage = false;
  document.getElementById('recFormTitle').textContent = 'Edit Product';
  document.getElementById('recSubmitBtn').textContent = 'Save Changes';
  document.getElementById('recId').value          = rec.id;
  document.getElementById('rName').value           = rec.name || '';
  document.getElementById('rColor').value          = rec.color || '';
  document.getElementById('rColorHex').value       = rec.colorHex || '#1a1a1a';
  document.getElementById('rColorHexPicker').value = rec.colorHex || '#1a1a1a';
  document.getElementById('rLink').value           = rec.link || '';
  document.getElementById('rPrice').value          = rec.price || '';
  document.getElementById('rOriginal').value       = rec.original || '';
  document.getElementById('rBadge').value          = rec.badge || '';
  document.getElementById('rBadgeColor').value     = rec.badgeColor || '#ff8401';
  document.getElementById('rBadgeColorPicker').value = rec.badgeColor || '#ff8401';
  document.getElementById('rGradient').value       = rec.gradient || '';

  // Show existing image preview
  const previewWrap = document.getElementById('rImagePreviewWrap');
  const preview     = document.getElementById('rImagePreview');
  if (rec.imageSrc) {
    preview.src = rec.imageSrc;
    previewWrap.style.display = '';
  } else {
    previewWrap.style.display = 'none';
  }

  document.getElementById('recFormCard').style.display = '';
  document.getElementById('recFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('removeRecImageBtn')?.addEventListener('click', () => {
  removeRecImage = true;
  document.getElementById('rImagePreviewWrap').style.display = 'none';
});

document.getElementById('recForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!requireProduct()) return;
  const btn = document.getElementById('recSubmitBtn');
  btn.disabled = true;

  const fd = new FormData();
  fd.append('name',       document.getElementById('rName').value.trim());
  fd.append('color',      document.getElementById('rColor').value.trim());
  fd.append('colorHex',   document.getElementById('rColorHex').value.trim());
  fd.append('link',       document.getElementById('rLink').value.trim());
  fd.append('price',      document.getElementById('rPrice').value);
  fd.append('original',   document.getElementById('rOriginal').value);
  fd.append('badge',      document.getElementById('rBadge').value.trim());
  fd.append('badgeColor', document.getElementById('rBadgeColor').value.trim());
  fd.append('gradient',   document.getElementById('rGradient').value.trim() || 'linear-gradient(148deg, #232526 0%, #414345 100%)');
  if (removeRecImage) fd.append('removeImage', 'true');

  const imageFile = document.getElementById('rImage').files[0];
  if (imageFile) fd.append('imageSrc', imageFile);

  try {
    if (editingRecId) {
      // Handle removeImage on server side — send as PUT with FormData
      if (removeRecImage && !imageFile) {
        // No new file, just patch imageSrc to null via JSON
        const jsonPayload = {};
        fd.forEach((v, k) => { if (k !== 'removeImage') jsonPayload[k] = v; });
        jsonPayload.imageSrc = null;
        await api('PUT', `/api/products/${currentProductSlug}/recommendations/${editingRecId}`, jsonPayload);
      } else {
        await api('PUT', `/api/products/${currentProductSlug}/recommendations/${editingRecId}`, fd);
      }
      toast('Product updated!');
    } else {
      await api('POST', `/api/products/${currentProductSlug}/recommendations`, fd);
      toast('Product added!');
    }
    document.getElementById('recFormCard').style.display = 'none';
    editingRecId = null;
    removeRecImage = false;
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
    await api('DELETE', `/api/products/${currentProductSlug}/recommendations/${id}`);
    document.getElementById(`rec-${id}`)?.remove();
    toast('Deleted.');
  } catch (err) { toast(err.message || 'Delete failed', 'error'); }
}

// Color picker sync
function syncColorPicker(pickerId, textId) {
  const picker = document.getElementById(pickerId);
  const text   = document.getElementById(textId);
  picker?.addEventListener('input', () => { text.value = picker.value; });
  text?.addEventListener('input',   () => { if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value; });
}
syncColorPicker('rColorHexPicker',   'rColorHex');
syncColorPicker('rBadgeColorPicker', 'rBadgeColor');

/* ═══════════════════════════════════════════════════════════════
   USERS (superuser only)
═══════════════════════════════════════════════════════════════ */
async function loadUsersPage() {
  const list = await api('GET', '/api/users').catch(() => null);
  if (list === null) return;

  const container = document.getElementById('usersList');
  if (!list.length) {
    container.innerHTML = '<p class="table-empty">No admin users yet. Click "+ Add Admin" to create one.</p>';
  } else {
    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Email</th><th>Role</th><th style="width:120px"></th></tr></thead>
          <tbody>
            ${list.map(u => `
              <tr id="user-row-${escHtml(u.id)}">
                <td>${escHtml(u.email)}</td>
                <td><span class="role-badge">${escHtml(u.role)}</span></td>
                <td>
                  <button class="btn-ghost btn-sm" onclick="openEditUser('${escHtml(u.id)}','${escHtml(u.email)}')">Edit</button>
                  <button class="btn-danger btn-sm" onclick="deleteUser('${escHtml(u.id)}')">Delete</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // Reset form to "add" state
  openAddUser();
  document.getElementById('userFormCard').style.display = 'none';
}

function openAddUser() {
  editingUserId = null;
  document.getElementById('userFormTitle').textContent = 'Add Admin User';
  document.getElementById('userSubmitBtn').textContent  = 'Create Admin';
  document.getElementById('userId').value   = '';
  document.getElementById('uEmail').value   = '';
  document.getElementById('uPassword').value = '';
  document.getElementById('uPasswordLabel').textContent = 'Password';
  document.getElementById('uPasswordHint').style.display = 'none';
  document.getElementById('uPassword').required = true;
  document.getElementById('userFormErr').textContent = '';
}

function openEditUser(id, email) {
  editingUserId = id;
  document.getElementById('userFormTitle').textContent = 'Edit Admin User';
  document.getElementById('userSubmitBtn').textContent  = 'Save Changes';
  document.getElementById('userId').value   = id;
  document.getElementById('uEmail').value   = email;
  document.getElementById('uPassword').value = '';
  document.getElementById('uPasswordLabel').textContent = 'New Password';
  document.getElementById('uPasswordHint').style.display = '';
  document.getElementById('uPassword').required = false;
  document.getElementById('userFormErr').textContent = '';
  document.getElementById('userFormCard').style.display = '';
  document.getElementById('uEmail').focus();
}

document.getElementById('showAddUserBtn').addEventListener('click', () => {
  openAddUser();
  document.getElementById('userFormCard').style.display = '';
  document.getElementById('uEmail').focus();
});
document.getElementById('cancelUserBtn').addEventListener('click', () => {
  document.getElementById('userFormCard').style.display = 'none';
});

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('uEmail').value.trim();
  const password = document.getElementById('uPassword').value;
  const errEl    = document.getElementById('userFormErr');
  const btn      = document.getElementById('userSubmitBtn');
  errEl.textContent = '';

  const body = {};
  if (email)    body.email    = email;
  if (password) body.password = password;

  btn.disabled = true;
  try {
    if (editingUserId) {
      await api('PUT', `/api/users/${editingUserId}`, body);
      toast('User updated.');
    } else {
      await api('POST', '/api/users', body);
      toast('Admin user created.');
    }
    document.getElementById('userFormCard').style.display = 'none';
    await loadUsersPage();
  } catch (err) {
    errEl.textContent = err.message || 'Failed.';
  } finally { btn.disabled = false; }
});

async function deleteUser(id) {
  if (!confirm('Delete this admin user? They will be logged out immediately.')) return;
  try {
    await api('DELETE', `/api/users/${id}`);
    document.getElementById(`user-row-${id}`)?.remove();
    toast('User deleted.');
    await loadUsersPage();
  } catch (err) { toast(err.message || 'Delete failed', 'error'); }
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════════ */
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const current = document.getElementById('currentPassword').value;
  const next    = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  const errEl   = document.getElementById('passwordErr');
  errEl.textContent = '';
  if (next !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
  if (next.length < 6)  { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  const btn = e.submitter; btn.disabled = true;
  try {
    await api('PUT', '/api/settings/password', { currentPassword: current, newPassword: next });
    toast('Password updated! Logging out…');
    e.target.reset();
    setTimeout(forceLogout, 2000);
  } catch (err) {
    errEl.textContent = err.message || 'Update failed.';
  } finally { btn.disabled = false; }
});

/* ═══════════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function statusBadge(status) {
  const labels = { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' };
  return `<span class="status-select status-${status}" style="pointer-events:none;font-size:11px;">${labels[status] || status}</span>`;
}
function glassesThumbSVG() {
  return `<svg width="64" height="35" viewBox="0 0 180 100" fill="none">
    <path d="M4 50 Q20 20 38 36" stroke="rgba(255,255,255,.3)" stroke-width="3" stroke-linecap="round"/>
    <path d="M142 36 Q160 20 176 50" stroke="rgba(255,255,255,.3)" stroke-width="3" stroke-linecap="round"/>
    <rect x="18" y="30" width="58" height="42" rx="18" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" stroke-width="3"/>
    <rect x="104" y="30" width="58" height="42" rx="18" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" stroke-width="3"/>
    <path d="M76 51 Q90 43 104 51" stroke="rgba(255,255,255,.25)" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

/* ─── BOOT ───────────────────────────────────────────────────── */
// Restore current product from localStorage
setCurrentProduct(currentProductSlug, '');
checkAuth();
