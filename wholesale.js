import { $, esc, money, tag, fmtDate, modal, toast, confirmBox } from '../core/ui.js';
import { buildListView } from '../core/crud.js';
import { cache, byId } from '../core/cache.js';

function rowHtml(it, i) {
  return `<div class="rowline" style="grid-template-columns:1.3fr 80px 100px auto" data-row="${i}">
   <select data-k="pid">${'<option value="">Product…</option>' + cache('products').rows().map((p) => `<option value="${p.id}" ${p.id === it.product_id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
   <input data-k="qty" type="number" min="0" step="1" placeholder="Qty" value="${it.qty ?? ''}">
   <input data-k="price" type="number" min="0" step="any" placeholder="Price" value="${it.price ?? ''}">
   <button type="button" class="btn dng sm" data-rm>✕</button></div>`;
}
function openForm() {
  let rows = [{ product_id: '', qty: '', price: '' }];
  const body = `<form class="frm" novalidate><div class="fg">
   <label class="f s2">Customer<select name="customer_id" required>${cache('customers').rows().filter((c) => c.type !== 'Retail').map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
   <label class="f">Date<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label>
  </div><h3>Items</h3><div class="rows" id="rows"></div><button type="button" class="btn sm" id="addRow" style="margin-top:10px">+ Add item</button>
  <div class="ovr" id="tot"></div><p class="ferr" role="alert"></p></form>`;
  const m = modal({ title: 'New wholesale order', wide: true, body, foot: `<button type="button" class="btn" data-c>Cancel</button><button type="button" class="btn pri" data-s>Create order</button>` });
  const form = $('form', m.el), rowsEl = $('#rows', form), err = $('.ferr', form), tot = $('#tot', form);
  const draw = () => rowsEl.innerHTML = rows.map(rowHtml).join('');
  const recalc = () => tot.textContent = 'Total: ' + money(rows.reduce((s, r) => s + (+r.qty || 0) * (+r.price || 0), 0));
  draw(); recalc();
  rowsEl.addEventListener('input', (e) => {
    const r = e.target.closest('[data-row]'); if (!r) return; const i = +r.dataset.row, k = e.target.dataset.k;
    if (k === 'pid') { rows[i].product_id = e.target.value; const p = byId('products', e.target.value); if (p && !rows[i].price) rows[i].price = p.wholesale_price; draw(); }
    else rows[i][k] = e.target.value;
    recalc();
  });
  rowsEl.addEventListener('click', (e) => { if (e.target.dataset.rm !== undefined) { rows.splice(+e.target.closest('[data-row]').dataset.row, 1); draw(); recalc(); } });
  $('#addRow', form).onclick = () => { rows.push({ product_id: '', qty: '', price: '' }); draw(); recalc(); };
  $('[data-c]', m.el).onclick = m.close;
  $('[data-s]', m.el).onclick = async () => {
    const clean = rows.filter((r) => r.product_id && +r.qty > 0).map((r) => ({ product_id: r.product_id, qty: +r.qty, price: +r.price || 0 }));
    if (!clean.length) { err.textContent = 'Add at least one item.'; return; }
    for (const it of clean) { const p = byId('products', it.product_id); if (it.qty > p.stock) { err.textContent = `Not enough ${p.name} in stock (have ${p.stock}).`; return; } }
    const total = clean.reduce((s, r) => s + r.qty * r.price, 0);
    await cache('wholesale_orders').api.insert({ customer_id: form.customer_id.value, items: clean, total, status: 'Pending', date: form.date.value });
    for (const it of clean) { const p = byId('products', it.product_id); await cache('products').api.update(p.id, { stock: p.stock - it.qty }); }
    const c = byId('customers', form.customer_id.value); await cache('customers').api.update(c.id, { balance: c.balance + total });
    toast('Wholesale order created.'); m.close();
  };
}
export async function render(page) {
  await Promise.all(['wholesale_orders', 'customers', 'products'].map((t) => cache(t).ready));
  const STATUSES = ['Pending', 'Delivered', 'Invoiced', 'Paid'];
  const cls = { Pending: 'a', Delivered: 'b', Invoiced: 'n', Paid: 'g' };
  return buildListView(page, {
    id: 'wholesale', table: 'wholesale_orders', sub: 'Bulk orders for hotels, shops and other wholesale accounts.', listTitle: 'Wholesale orders',
    actions: '<button class="btn pri" data-add>New order</button>', searchPlaceholder: 'Search by customer…', searchText: (r) => byId('customers', r.customer_id)?.name || '',
    filters: [{ key: 'status', label: 'Status', options: () => STATUSES, match: (r, v) => r.status === v }],
    columns: [
      { key: 'customer', label: 'Customer', sort: false, render: (r) => `<b>${esc(byId('customers', r.customer_id)?.name || '')}</b><small>${fmtDate(r.date)}</small>` },
      { key: 'total', label: 'Total', cls: 'r', render: (r) => money(r.total) },
      { key: 'status', label: 'Status', render: (r) => tag(r.status, cls[r.status]) },
    ],
    detail: (r) => `<div class="dh"><h2>${esc(byId('customers', r.customer_id)?.name || '')}</h2><button class="x" data-close>✕</button></div>
     <p class="sub" style="margin:0 0 10px">${fmtDate(r.date)}</p>
     <div class="rows">${r.items.map((it) => `<div class="line"><span>${esc(byId('products', it.product_id)?.name || '')} × ${it.qty}</span><b>${money(it.qty * it.price)}</b></div>`).join('')}</div>
     <p class="note" style="margin-top:10px">Total: <b style="color:var(--ink)">${money(r.total)}</b></p>
     <label class="f" style="margin-top:10px">Status<select data-status>${STATUSES.map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-status]', el).onchange = async (e) => { await cache('wholesale_orders').api.update(row.id, { status: e.target.value }); toast('Status updated.'); redraw(); };
    },
    onMount: (root) => { $('[data-add]', root).onclick = openForm; },
  });
}
