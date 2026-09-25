import { $, $$, esc, head, money, toast, confirmBox, download, printHTML } from '../core/ui.js';
import { cache, byId } from '../core/cache.js';
import { PROFILE } from '../app.js';

export async function render(page) {
  await Promise.all(['products', 'sales', 'customers'].map((t) => cache(t).ready));
  let cat = 'All', cart = [], pay = 'Cash', q = '';
  const off = cache('products').onChange(drawTiles);

  page.innerHTML = `
  ${head('pos', 'Retail shop. Ring up a sale and take payment.')}
  <div class="pos">
   <div>
    <input class="search" id="psearch" type="search" placeholder="Search a product…" style="max-width:none" aria-label="Search products">
    <div class="cats" id="cats"></div>
    <div class="tiles" id="tiles"></div>
   </div>
   <div class="wcard cart">
    <h2>Current sale</h2>
    <div id="cart"></div>
    <div class="tot"><span>Subtotal</span><span id="sub">Rs. 0</span></div>
    <div class="tot big"><span>Total</span><span id="tot">Rs. 0</span></div>
    <div class="pay" id="pay"></div>
    <div id="warn"></div>
    <button class="cta" id="checkout" disabled>Take payment</button>
    <div class="mini"><button data-hold>Hold</button><button data-resume>Resume</button><button data-cancel>Cancel</button></div>
   </div>
  </div>`;

  const cats = ['All', ...new Set(cache('products').rows().map((p) => p.category))];
  $('#cats').innerHTML = cats.map((c) => `<button class="${c === cat ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  $$('#cats button').forEach((b) => (b.onclick = () => { cat = b.dataset.c; $$('#cats button').forEach((x) => x.classList.toggle('on', x === b)); drawTiles(); }));
  $('#psearch').oninput = (e) => { q = e.target.value.toLowerCase(); drawTiles(); };
  const payMethods = ['Cash', 'Bank', 'Card', 'Credit'];
  $('#pay').innerHTML = payMethods.map((m) => `<button class="${m === pay ? 'on' : ''}" data-p="${m}">${m}</button>`).join('');
  $$('#pay button').forEach((b) => (b.onclick = () => { pay = b.dataset.p; $$('#pay button').forEach((x) => x.classList.toggle('on', x === b)); }));

  function drawTiles() {
    const rows = cache('products').rows().filter((p) => p.active !== false && (cat === 'All' || p.category === cat) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)));
    $('#tiles').innerHTML = rows.length ? rows.map((p) => `<button class="tile" data-i="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}><small>${esc(p.sku)}</small><b>${esc(p.name)}</b><small>${p.stock} in stock</small><span class="p">${money(p.price)}</span></button>`).join('') : '<div class="empty">No products match.</div>';
  }
  $('#tiles').onclick = (e) => {
    const t = e.target.closest('.tile'); if (!t || t.disabled) return;
    const i = t.dataset.i, f = cart.find((c) => c.id === i);
    const p = byId('products', i);
    const already = f ? f.qty : 0;
    if (already + 1 > p.stock) { toast(`Only ${p.stock} of ${p.name} in stock.`, 'err'); return; }
    f ? f.qty++ : cart.push({ id: i, qty: 1, price: p.price });
    drawCart();
  };
  function drawCart() {
    let sub = 0, over = false;
    $('#cart').innerHTML = cart.map((c, k) => {
      const p = byId('products', c.id); sub += p.price * c.qty;
      if (c.qty > p.stock) over = true;
      return `<div class="line"><div><b>${esc(p.name)}</b><br><small>${money(p.price)}</small></div><div class="qty"><button data-k="${k}" data-d="-1" aria-label="Decrease">−</button><b>${c.qty}</b><button data-k="${k}" data-d="1" aria-label="Increase">+</button></div></div>`;
    }).join('') || '<p style="color:#6B6F85;padding:14px 0">Tap a product to start a sale.</p>';
    $('#sub').textContent = $('#tot').textContent = money(sub);
    $('#warn').innerHTML = over ? '<div class="warn">A quantity in the cart exceeds available stock.</div>' : '';
    $('#checkout').disabled = !cart.length || over;
  }
  $('#cart').onclick = (e) => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const c = cart[+b.dataset.k]; const p = byId('products', c.id); const d = +b.dataset.d;
    if (d > 0 && c.qty + 1 > p.stock) { toast(`Only ${p.stock} in stock.`, 'err'); return; }
    c.qty += d; if (c.qty < 1) cart.splice(+b.dataset.k, 1); drawCart();
  };
  $('[data-hold]').onclick = () => { if (!cart.length) return; localStorage.setItem('bb_pos_hold', JSON.stringify(cart)); cart = []; drawCart(); toast('Sale held.'); };
  $('[data-resume]').onclick = () => { const h = localStorage.getItem('bb_pos_hold'); if (!h) { toast('No held sale.', 'err'); return; } cart = JSON.parse(h); localStorage.removeItem('bb_pos_hold'); drawCart(); };
  $('[data-cancel]').onclick = async () => { if (!cart.length) return; if (await confirmBox('Clear the current sale?', { yes: 'Clear', danger: true })) { cart = []; drawCart(); } };

  $('#checkout').onclick = async () => {
    const btn = $('#checkout'); btn.disabled = true;
    try {
      for (const c of cart) { const p = byId('products', c.id); if (c.qty > p.stock) throw new Error(`${p.name} no longer has enough stock.`); }
      const subtotal = cart.reduce((s, c) => s + byId('products', c.id).price * c.qty, 0);
      const items = cart.map((c) => ({ product_id: c.id, qty: c.qty, price: byId('products', c.id).price }));
      const sale = await cache('sales').api.insert({ channel: 'Retail shop', items, subtotal, discount: 0, total: subtotal, payment_method: pay, customer_id: null, cashier_id: PROFILE?.id || null, status: 'Paid' });
      for (const c of cart) { const p = byId('products', c.id); await cache('products').api.update(p.id, { stock: p.stock - c.qty }); }
      toast('Sale completed — ' + money(subtotal));
      receipt(sale); cart = []; drawCart();
    } catch (e) { toast(e.message, 'err'); } finally { btn.disabled = false; }
  };
  function receipt(sale) {
    const rows = sale.items.map((i) => { const p = byId('products', i.product_id); return `<tr><td>${esc(p?.name || '')}</td><td class="r">${i.qty}</td><td class="r">${money(i.price * i.qty)}</td></tr>`; }).join('');
    printHTML('Receipt', `<h1 style="font-size:18px">BAYBREEZE</h1><p>${new Date(sale.created_at).toLocaleString()}</p><hr><table>${rows}</table><hr><table><tr><td>Total</td><td class="r"><b>${money(sale.total)}</b></td></tr><tr><td>Paid via</td><td class="r">${esc(sale.payment_method)}</td></tr></table><p class="c" style="margin-top:12px">Thank you!</p>`);
  }
  drawTiles(); drawCart();
  return { destroy: off };
}
