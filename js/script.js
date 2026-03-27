/* ═══════════════════════════════════════════════════════════════
   PRISMOR — Landing Page Script
   Vanilla JS · Mobile-First
═══════════════════════════════════════════════════════════════ */

/* ─── CONFIG ──────────────────────────────────────────────────── */
const CONFIG = {
  productName: 'Eclipse Pro · Polarized UV400',
  originalPrice: 3500,
  discountPct: 20,
  deliveryInside: 70,
  deliveryOutside: 120,
  whatsapp: '8801700000000',
  website: 'https://prismorglasses.com',
};

/* ─── PRODUCT MEDIA ───────────────────────────────────────────── */
const productMedia = [
  { id: 'pm1', label: 'Classic Matte Black', type: 'image',
    gradient: 'linear-gradient(148deg, #1a1a2e 0%, #16213e 45%, #0a0a14 100%)', isBestseller: true },
  { id: 'pm2', label: 'Amber Tortoise', type: 'image',
    gradient: 'linear-gradient(148deg, #3d1f0a 0%, #7a3a12 45%, #c07030 100%)' },
  { id: 'pm3', label: 'Ocean Blue Polarized', type: 'image',
    gradient: 'linear-gradient(148deg, #0f2027 0%, #1e4d6b 50%, #2c5364 100%)' },
  { id: 'pm4', label: 'Desert Gold', type: 'image',
    gradient: 'linear-gradient(148deg, #4a3200 0%, #9a7020 45%, #c9a030 100%)' },
  { id: 'pm5', label: 'Smoke Mirror', type: 'image',
    gradient: 'linear-gradient(148deg, #252525 0%, #484848 50%, #1a1a1a 100%)' },
  { id: 'pm6', label: 'Forest Tint', type: 'image',
    gradient: 'linear-gradient(148deg, #0d2e1a 0%, #1a5c38 50%, #0a2014 100%)' },
  { id: 'pm7', label: 'Lifestyle Film', type: 'video',
    gradient: 'linear-gradient(148deg, #1e1e2e 0%, #2d2d44 50%, #12121e 100%)' },
  { id: 'pm8', label: 'Campaign Story', type: 'video',
    gradient: 'linear-gradient(148deg, #1a0a0a 0%, #3a1818 50%, #1a0a0a 100%)' },
];

/* ─── RECOMMENDATION PRODUCTS ────────────────────────────────── */
const recommendations = [
  { id: 'r1', name: 'Horizon Classic', color: 'Matte Black', colorHex: '#1a1a1a',
    price: 2800, original: 3500, badge: 'Popular', badgeColor: '#ff8401',
    gradient: 'linear-gradient(148deg, #232526 0%, #414345 100%)' },
  { id: 'r2', name: 'Soleil Slim', color: 'Crystal Silver', colorHex: '#b0b8c1',
    price: 2400, original: 3000,
    gradient: 'linear-gradient(148deg, #8e9eab 0%, #ccd6dd 100%)' },
  { id: 'r3', name: 'Terra Pro', color: 'Amber Brown', colorHex: '#a0522d',
    price: 3200, original: 4000, badge: 'New', badgeColor: '#2e9e4f',
    gradient: 'linear-gradient(148deg, #6b3a1a 0%, #c07832 100%)' },
  { id: 'r4', name: 'Arctic Shield', color: 'Ice Blue', colorHex: '#7ec8e3',
    price: 2600, original: 3200,
    gradient: 'linear-gradient(148deg, #3a7bd5 0%, #3a9fd5 100%)' },
  { id: 'r5', name: 'Apex Wraparound', color: 'Gunmetal', colorHex: '#4a4e58',
    price: 3500, original: 4500, badge: 'Sport', badgeColor: '#1a6bff',
    gradient: 'linear-gradient(148deg, #1c2130 0%, #3a4464 100%)' },
  { id: 'r6', name: 'Porto Aviator', color: 'Rose Gold', colorHex: '#c6846a',
    price: 2200, original: 2800,
    gradient: 'linear-gradient(148deg, #c94b4b 0%, #4b134f 100%)' },
  { id: 'r7', name: 'Zenith Round', color: 'Havana Tortoise', colorHex: '#8B5E3C',
    price: 2000, original: 2500,
    gradient: 'linear-gradient(148deg, #4e2a0a 0%, #8a5228 100%)' },
  { id: 'r8', name: 'Cascade Sport', color: 'Electric Blue', colorHex: '#0066ff',
    price: 2900, original: 3800, badge: 'Sport', badgeColor: '#1a6bff',
    gradient: 'linear-gradient(148deg, #0050c8 0%, #0090e0 100%)' },
  { id: 'r9', name: 'Milano Square', color: 'Olive Green', colorHex: '#6b7c3a',
    price: 3100, original: 4000,
    gradient: 'linear-gradient(148deg, #2c4a1a 0%, #5a8030 100%)' },
  { id: 'r10', name: 'Luxe Oversized', color: 'Jet Black', colorHex: '#0a0a0a',
    price: 4500, original: 6000, badge: 'Premium', badgeColor: '#ff8401',
    gradient: 'linear-gradient(148deg, #0a0a0a 0%, #2a2a2a 100%)' },
];

/* ─── HELPERS ─────────────────────────────────────────────────── */
function glassesSVG(size, alpha = 0.15, strokeAlpha = 0.3) {
  const c = `rgba(255,255,255,${alpha})`;
  const s = `rgba(255,255,255,${strokeAlpha})`;
  const h = Math.round(size * 0.55);
  return `<svg width="${size}" height="${h}" viewBox="0 0 180 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 50 Q20 20 38 36" stroke="${s}" stroke-width="3" stroke-linecap="round"/>
    <path d="M142 36 Q160 20 176 50" stroke="${s}" stroke-width="3" stroke-linecap="round"/>
    <rect x="18" y="30" width="58" height="42" rx="18" fill="${c}" stroke="${s}" stroke-width="3"/>
    <rect x="104" y="30" width="58" height="42" rx="18" fill="${c}" stroke="${s}" stroke-width="3"/>
    <path d="M76 51 Q90 43 104 51" stroke="${s}" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

function formatBDT(n) {
  return '৳ ' + n.toLocaleString('en-BD');
}

function calcPrices() {
  const discount = Math.round(CONFIG.originalPrice * CONFIG.discountPct / 100);
  const afterDiscount = CONFIG.originalPrice - discount;
  return { discount, afterDiscount };
}

const { discount, afterDiscount } = calcPrices();

/* ═══════════════════════════════════════════════════════════════
   1. PRODUCT SHOWCASE
═══════════════════════════════════════════════════════════════ */
let currentMediaIndex = 0;

function buildThumbItem(media, idx, railEl) {
  const item = document.createElement('div');
  item.className = 'thumb-item' + (idx === 0 ? ' active' : '');
  item.setAttribute('role', 'listitem');
  item.setAttribute('aria-label', media.label);

  const bg = document.createElement('div');
  bg.className = 'thumb-bg';
  bg.style.background = media.gradient;
  bg.innerHTML = glassesSVG(48);

  if (media.type === 'video') {
    bg.insertAdjacentHTML('beforeend', `<div class="thumb-play-icon">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M5 3l14 9-14 9V3z"/></svg>
    </div>`);
  }

  item.appendChild(bg);
  item.addEventListener('click', () => setActiveMedia(idx));
  railEl.appendChild(item);
}

function buildThumbnailRails() {
  const railDesktop = document.getElementById('thumbnailRail');
  const railMobile = document.getElementById('thumbnailRailMobile');
  if (!railDesktop || !railMobile) return;

  productMedia.forEach((media, idx) => {
    buildThumbItem(media, idx, railDesktop);
    buildThumbItem(media, idx, railMobile);
  });
}

function setActiveMedia(idx) {
  currentMediaIndex = idx;
  document.querySelectorAll('.thumb-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  renderMainViewer(productMedia[idx]);
}

function renderMainViewer(media) {
  const wrap = document.getElementById('mainMediaWrap');
  if (!wrap) return;
  const isVideo = media.type === 'video';

  wrap.innerHTML = `
    <div class="main-media-bg" style="background:${media.gradient};">
      ${media.isBestseller ? '<span class="badge-bestseller">Bestseller</span>' : ''}
      ${glassesSVG(220, 0.07, 0.18)}
      <span class="media-label-chip">${media.label}</span>
      ${isVideo ? `<div class="play-overlay"><div class="play-btn-main">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
      </div></div>` : ''}
    </div>`;
}

function initShowcase() {
  buildThumbnailRails();
  renderMainViewer(productMedia[0]);

  const expandBtn = document.getElementById('expandBtn');
  const mainViewer = document.getElementById('mainViewer');

  expandBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openLightbox(currentMediaIndex);
  });
  mainViewer?.addEventListener('click', () => openLightbox(currentMediaIndex));
}

/* ═══════════════════════════════════════════════════════════════
   2. LIGHTBOX
═══════════════════════════════════════════════════════════════ */
function openLightbox(idx) {
  const media = productMedia[idx];
  const lb = document.getElementById('lightbox');
  const inner = document.getElementById('lightboxInner');
  if (!lb || !inner) return;

  inner.innerHTML = `
    <div class="lightbox-media-bg" style="background:${media.gradient};">
      ${glassesSVG(340, 0.08, 0.16)}
      <span class="media-label-chip" style="font-size:12px;padding:6px 16px;">${media.label}</span>
      ${media.type === 'video' ? `<div class="play-overlay"><div class="play-btn-main" style="width:76px;height:76px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
      </div></div>` : ''}
    </div>`;

  lb.setAttribute('aria-hidden', 'false');
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initLightbox() {
  document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox')?.addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeLightbox(); closeInvoice(); }
    if (document.getElementById('lightbox')?.classList.contains('open')) {
      if (e.key === 'ArrowLeft') setActiveMedia((currentMediaIndex - 1 + productMedia.length) % productMedia.length);
      if (e.key === 'ArrowRight') setActiveMedia((currentMediaIndex + 1) % productMedia.length);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   3. DESCRIPTION + SPECS — unified collapse
═══════════════════════════════════════════════════════════════ */
function initDescription() {
  const btn = document.getElementById('seeMoreBtn');
  const specEl = document.getElementById('specCollapsible');
  if (!btn || !specEl) return;

  let expanded = false;

  btn.addEventListener('click', () => {
    expanded = !expanded;
    specEl.classList.toggle('expanded', expanded);
    btn.classList.toggle('open', expanded);
    btn.setAttribute('aria-expanded', String(expanded));
    btn.querySelector('span').textContent = expanded ? 'See less' : 'See more';
    if (!expanded) specEl.scrollTop = 0;
  });
}

/* ═══════════════════════════════════════════════════════════════
   4. DELIVERY SELECTION + PRICE UPDATE
═══════════════════════════════════════════════════════════════ */
function initDeliveryOptions() {
  const radios = document.querySelectorAll('input[name="delivery"]');
  const cardInside = document.getElementById('cardInside');
  const cardOutside = document.getElementById('cardOutside');
  const deliveryEl = document.getElementById('deliveryCharge');
  const totalEl = document.getElementById('totalPrice');

  function updateDelivery() {
    const val = document.querySelector('input[name="delivery"]:checked')?.value;
    const charge = val === 'outside' ? CONFIG.deliveryOutside : CONFIG.deliveryInside;
    cardInside?.classList.toggle('selected', val !== 'outside');
    cardOutside?.classList.toggle('selected', val === 'outside');
    if (deliveryEl) deliveryEl.textContent = formatBDT(charge);
    if (totalEl) {
      totalEl.textContent = formatBDT(afterDiscount + charge);
      totalEl.style.transform = 'scale(1.05)';
      setTimeout(() => { totalEl.style.transform = ''; }, 200);
    }
  }

  cardInside?.classList.add('selected');
  radios.forEach(r => r.addEventListener('change', updateDelivery));

  document.querySelectorAll('.delivery-card').forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio && !radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   5. FORM VALIDATION
═══════════════════════════════════════════════════════════════ */
function showErr(groupId, errId, msg) {
  document.getElementById(groupId)?.classList.add('has-error');
  const el = document.getElementById(errId);
  if (el) el.textContent = msg;
}
function clearErr(groupId, errId) {
  document.getElementById(groupId)?.classList.remove('has-error');
  const el = document.getElementById(errId);
  if (el) el.textContent = '';
}

function validateForm() {
  let ok = true;
  const name = document.getElementById('custName')?.value.trim();
  const phone = document.getElementById('custPhone')?.value.trim();
  const address = document.getElementById('custAddress')?.value.trim();

  clearErr('fgName', 'nameErr');
  if (!name || name.length < 2) {
    showErr('fgName', 'nameErr', name ? 'Name must be at least 2 characters.' : 'Please enter your full name.');
    ok = false;
  }

  clearErr('fgPhone', 'phoneErr');
  if (!phone) {
    showErr('fgPhone', 'phoneErr', 'Please enter your phone number.');
    ok = false;
  } else if (!/^01[3-9]\d{8}$/.test(phone)) {
    showErr('fgPhone', 'phoneErr', 'Enter a valid BD number (01XXXXXXXXX).');
    ok = false;
  }

  clearErr('fgAddress', 'addressErr');
  if (!address || address.length < 10) {
    showErr('fgAddress', 'addressErr', address ? 'Please provide a complete address.' : 'Please enter your delivery address.');
    ok = false;
  }

  return ok;
}

function initRealTimeValidation() {
  document.getElementById('custName')?.addEventListener('input', () => clearErr('fgName', 'nameErr'));
  document.getElementById('custPhone')?.addEventListener('input', () => clearErr('fgPhone', 'phoneErr'));
  document.getElementById('custAddress')?.addEventListener('input', () => clearErr('fgAddress', 'addressErr'));
}

/* ═══════════════════════════════════════════════════════════════
   6. ORDER ID
═══════════════════════════════════════════════════════════════ */
function generateOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'PM';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/* ═══════════════════════════════════════════════════════════════
   7. INVOICE MODAL
═══════════════════════════════════════════════════════════════ */
let currentOrderData = null;

function buildInvoiceHTML(order) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const deliveryCharge = order.delivery === 'outside' ? CONFIG.deliveryOutside : CONFIG.deliveryInside;
  const total = afterDiscount + deliveryCharge;
  const deliveryArea = order.delivery === 'outside' ? 'Outside Dhaka' : 'Inside Dhaka';

  return `
    <div class="inv-header">
      <div>
        <img src="logo.png" alt="PRISMOR" class="inv-logo"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
        <span class="inv-logo-text" style="display:none">PRISMOR</span>
      </div>
      <div class="inv-title-block">
        <h2>INVOICE</h2>
        <p>Order #${order.orderId}</p>
        <p>${today}</p>
      </div>
    </div>

    <div class="inv-divider"></div>

    <span class="inv-section-label">Billed To</span>
    <div class="inv-customer">
      <p><strong>${order.name}</strong></p>
      <p>+88 ${order.phone}</p>
      <p>${order.address}</p>
      <p>Delivery: ${deliveryArea}</p>
    </div>

    <div class="inv-divider"></div>

    <span class="inv-section-label">Product</span>
    <div class="inv-pricing" style="margin-bottom:4px;">
      <div class="inv-product-row">
        <span>Product</span>
        <span>${CONFIG.productName}</span>
      </div>
      <div class="inv-product-row">
        <span>Color / Variant</span>
        <span>${order.mediaLabel}</span>
      </div>
      <div class="inv-product-row">
        <span>Payment Method</span>
        <span>Cash on Delivery</span>
      </div>
    </div>

    <div class="inv-divider"></div>

    <span class="inv-section-label">Pricing</span>
    <div class="inv-pricing">
      <div class="inv-price-row">
        <span>Product Price</span>
        <span>${formatBDT(CONFIG.originalPrice)}</span>
      </div>
      <div class="inv-price-row">
        <span>Discount (${CONFIG.discountPct}%)</span>
        <span class="inv-discount">− ${formatBDT(discount)}</span>
      </div>
      <div class="inv-price-row">
        <span>After Discount</span>
        <span>${formatBDT(afterDiscount)}</span>
      </div>
      <div class="inv-price-row">
        <span>Delivery (${deliveryArea})</span>
        <span>${formatBDT(deliveryCharge)}</span>
      </div>
    </div>

    <div class="inv-total">
      <span>Total COD Amount</span>
      <span class="inv-total-amount">${formatBDT(total)}</span>
    </div>

    <div class="inv-footer">
      <p>Thank you for choosing <strong>PRISMOR</strong>.</p>
      <p>Our team will contact you to confirm delivery.</p>
      <p style="margin-top:6px; color:#aaa; font-size:11px;">prismorglasses.com</p>
    </div>`;
}

function openInvoice(orderData) {
  currentOrderData = orderData;
  const modal = document.getElementById('invoiceModal');
  const content = document.getElementById('invoiceContent');
  if (!modal || !content) return;

  content.innerHTML = buildInvoiceHTML(orderData);
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeInvoice() {
  const modal = document.getElementById('invoiceModal');
  if (!modal || !modal.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // Reset form after closing invoice
  document.getElementById('orderForm')?.reset();
  document.querySelector('input[name="delivery"][value="inside"]').checked = true;
  document.getElementById('cardInside')?.classList.add('selected');
  document.getElementById('cardOutside')?.classList.remove('selected');
  document.getElementById('deliveryCharge').textContent = formatBDT(CONFIG.deliveryInside);
  document.getElementById('totalPrice').textContent = formatBDT(afterDiscount + CONFIG.deliveryInside);
}

/* ─── PDF Download via print-to-PDF ─────────────────────────── */
function downloadInvoicePDF(order) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const deliveryCharge = order.delivery === 'outside' ? CONFIG.deliveryOutside : CONFIG.deliveryInside;
  const total = afterDiscount + deliveryCharge;
  const deliveryArea = order.delivery === 'outside' ? 'Outside Dhaka' : 'Inside Dhaka';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>PRISMOR Invoice ${order.orderId}</title>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Manrope', Arial, sans-serif;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 580px;
      margin: 0 auto;
      font-size: 14px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .inv-logo { height: 36px; width: auto; object-fit: contain; }
    .inv-logo-text { font-size: 22px; font-weight: 800; letter-spacing: .14em; }
    .inv-title-block { text-align: right; }
    .inv-title-block h2 { font-size: 28px; font-weight: 800; color: #ff8401; letter-spacing: .06em; margin-bottom: 4px; }
    .inv-title-block p { font-size: 12px; color: #888; line-height: 1.7; }
    .inv-divider { height: 1px; background: #e4e4e0; margin: 18px 0; }
    .inv-section-label { display: block; font-size: 9px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #ff8401; margin-bottom: 10px; }
    .inv-customer p { font-size: 13.5px; line-height: 1.7; }
    .inv-customer strong { font-weight: 700; }
    .inv-product-row { display: flex; justify-content: space-between; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #f3f3f1; }
    .inv-product-row span:first-child { color: #888; font-weight: 500; }
    .inv-product-row span:last-child { font-weight: 600; }
    .inv-price-row { display: flex; justify-content: space-between; font-size: 13px; padding: 9px 0; border-bottom: 1px solid #f3f3f1; }
    .inv-price-row:last-child { border-bottom: none; }
    .inv-price-row span:first-child { color: #888; font-weight: 500; }
    .inv-price-row span:last-child { font-weight: 600; }
    .inv-discount { color: #2e9e4f !important; }
    .inv-total {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 16px; padding: 16px 18px;
      background: #fff3e4; border-radius: 8px; border: 2px solid rgba(255,132,1,.25);
    }
    .inv-total span:first-child { font-size: 14px; font-weight: 700; }
    .inv-total-amount { font-size: 26px; font-weight: 800; color: #ff8401; }
    .inv-footer { margin-top: 24px; padding-top: 18px; border-top: 1px solid #e4e4e0; text-align: center; }
    .inv-footer p { font-size: 12px; color: #888; line-height: 1.8; }
    .inv-footer strong { color: #1a1a1a; font-weight: 700; }
    @page { margin: 15mm; size: A4; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="inv-header">
    <div>
      <img src="${window.location.origin}/logo.png" alt="PRISMOR" class="inv-logo"
        onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
      <span class="inv-logo-text" style="display:none">PRISMOR</span>
    </div>
    <div class="inv-title-block">
      <h2>INVOICE</h2>
      <p>Order #${order.orderId}</p>
      <p>${today}</p>
    </div>
  </div>

  <div class="inv-divider"></div>

  <span class="inv-section-label">Billed To</span>
  <div class="inv-customer">
    <p><strong>${order.name}</strong></p>
    <p>+88 ${order.phone}</p>
    <p>${order.address}</p>
    <p>Delivery Area: ${deliveryArea}</p>
  </div>

  <div class="inv-divider"></div>

  <span class="inv-section-label">Product Details</span>
  <div>
    <div class="inv-product-row"><span>Product</span><span>${CONFIG.productName}</span></div>
    <div class="inv-product-row"><span>Color / Variant</span><span>${order.mediaLabel}</span></div>
    <div class="inv-product-row"><span>Payment Method</span><span>Cash on Delivery</span></div>
  </div>

  <div class="inv-divider"></div>

  <span class="inv-section-label">Pricing Breakdown</span>
  <div>
    <div class="inv-price-row"><span>Product Price</span><span>${formatBDT(CONFIG.originalPrice)}</span></div>
    <div class="inv-price-row"><span>Discount (${CONFIG.discountPct}%)</span><span class="inv-discount">− ${formatBDT(discount)}</span></div>
    <div class="inv-price-row"><span>Price After Discount</span><span>${formatBDT(afterDiscount)}</span></div>
    <div class="inv-price-row"><span>Delivery Charge (${deliveryArea})</span><span>${formatBDT(deliveryCharge)}</span></div>
  </div>

  <div class="inv-total">
    <span>Total COD Amount</span>
    <span class="inv-total-amount">${formatBDT(total)}</span>
  </div>

  <div class="inv-footer">
    <p>Thank you for choosing <strong>PRISMOR</strong>.</p>
    <p>Our team will contact you shortly to confirm your delivery.</p>
    <p style="margin-top:8px; color:#ccc; font-size:10px; letter-spacing:.06em;">PRISMORGLASSES.COM</p>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 600);
    });
  <\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('afterprint', () => URL.revokeObjectURL(url));
  } else {
    // Fallback if popup blocked
    const a = document.createElement('a');
    a.href = url;
    a.download = `PRISMOR-Invoice-${order.orderId}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function initInvoiceModal() {
  document.getElementById('invoiceClose')?.addEventListener('click', closeInvoice);
  document.getElementById('invoiceBackdrop')?.addEventListener('click', closeInvoice);
  document.getElementById('downloadPdfBtn')?.addEventListener('click', () => {
    if (currentOrderData) downloadInvoicePDF(currentOrderData);
  });
}

/* ═══════════════════════════════════════════════════════════════
   8. ORDER CONFIRM
═══════════════════════════════════════════════════════════════ */
function initOrderConfirm() {
  const btn = document.getElementById('confirmBtn');
  btn?.addEventListener('click', () => {
    if (!validateForm()) {
      document.querySelector('.form-group.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const orderId = generateOrderId();
    const orderData = {
      orderId,
      name: document.getElementById('custName').value.trim(),
      phone: document.getElementById('custPhone').value.trim(),
      address: document.getElementById('custAddress').value.trim(),
      delivery: document.querySelector('input[name="delivery"]:checked').value,
      mediaLabel: productMedia[currentMediaIndex].label,
    };

    // Brief button feedback
    btn.style.opacity = '.75';
    btn.style.transform = 'scale(.97)';
    setTimeout(() => { btn.style.opacity = ''; btn.style.transform = ''; }, 280);

    setTimeout(() => openInvoice(orderData), 200);
  });
}

/* ═══════════════════════════════════════════════════════════════
   9. RECOMMENDATION GRID
═══════════════════════════════════════════════════════════════ */
function buildRecGrid() {
  const grid = document.getElementById('recGrid');
  if (!grid) return;

  recommendations.forEach((item) => {
    const pct = Math.round((1 - item.price / item.original) * 100);
    const card = document.createElement('article');
    card.className = 'rec-card fade-in';
    card.setAttribute('aria-label', item.name);

    card.innerHTML = `
      <div class="rec-card-img" style="background:${item.gradient};">
        ${item.badge ? `<span class="rec-badge" style="background:${item.badgeColor};">${item.badge}</span>` : ''}
        ${glassesSVG(140)}
      </div>
      <div class="rec-card-body">
        <p class="rec-color-name">
          <span class="rec-color-dot" style="background:${item.colorHex};"></span>${item.color}
        </p>
        <h3 class="rec-name">${item.name}</h3>
        <div class="rec-pricing">
          <div>
            <span class="rec-price-now">${formatBDT(item.price)}</span>
            <span class="rec-price-orig">${formatBDT(item.original)}</span>
          </div>
          <span class="rec-discount-tag">−${pct}%</span>
        </div>
      </div>`;

    card.addEventListener('click', () => {
      document.getElementById('order-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    grid.appendChild(card);
  });
}

/* ═══════════════════════════════════════════════════════════════
   10. SCROLL ANIMATIONS
═══════════════════════════════════════════════════════════════ */
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    }),
    { threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
  );
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

function addFadeInClasses() {
  [
    '#product-meta .product-title-col',
    '#product-meta .contact-col',
    '#product-description .desc-col',
    '#order-section .order-section-head',
    '#order-section .order-form-col',
    '#order-section .price-col',
    '#order-section .confirm-wrap',
    '#recommendations .rec-head',
    '#visit-website .visit-inner',
  ].forEach(sel => document.querySelectorAll(sel).forEach(el => el.classList.add('fade-in')));
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initShowcase();
  initLightbox();
  initDescription();
  initDeliveryOptions();
  initRealTimeValidation();
  initOrderConfirm();
  initInvoiceModal();
  buildRecGrid();
  addFadeInClasses();
  requestAnimationFrame(() => initScrollAnimations());
});
