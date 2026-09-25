import { $, esc, money, tag, fmtDate, modal, toast, confirmBox } from '../core/ui.js';
import { buildListView } from '../core/crud.js';
import { cache, byId } from '../core/cache.js';

const items2 = () => [...cache('raw_materials').rows().map((r) => ['raw:' + r.id, r.name]), ...cache('packaging').rows().map((r) => ['pack:' + r.id, r.name])];
const itemLabel = (it) => byId(it.item_type === 'raw' ? 'raw_materials' : 'packaging', it.ref_id)?.name || '—';

function rowHtml(it, i) {
  const val = it.item_type ? `${it.item_type}:${it.ref_id}` : '';
  return `<div class="rowline" style="grid-template-columns:1.3fr 80px 100px auto" data-row="${i}">
   <select data-k="ref">${'<option value="">Item…</option>' + items2().map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
   <input data-k="qty" type="number" min="0" step="any" placeholder="Qty" value="${it.qty ?? ''}">
   <input data-k="cost" type="number" min="0" step="any" placeholder="Unit cost" value="${it.unit_cost ?? ''}">
   <button type="button" class="btn dng sm" data-rm>✕</button></div>`;
}
function openForm() {
  let rows = [{ item_type: '', ref_id: '', qty: '', unit_cost: '' }];
  const body = `<form class="frm" novalidate><div class="fg">
   <label class="f">Supplier<select name="supplier_id" required>${cache('suppliers').rows().map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
   <label class="f">Invoice number<input name="invoice_no" required></label>
   <label class="f">Date<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label>
   <label class="f">Status<select name="status"><option>Pending</option><option>Received</option></select></label>
  </div><h3>Items</h3><div class="rows" id="rows"></div><button type="button" class="btn sm" id="addRow" style="margin-top:10px">+ Add item</button>
  <div class="ovr" id="tot"></div><p class="ferr" role="alert"></p></form>`;
  const m = modal({ title: 'New purchase order', wide: true, body, foot: `<button type="button" class="btn" data-c>Cancel</button><button type="button" class="btn pri" data-s>Create</button>` });
  const form = $('form', m.el), rowsEl = $('#rows', form), err = $('.ferr', form), tot = $('#tot', form);
  const draw = () => rowsEl.innerHTML = rows.map(rowHtml).join('');
  const recalc = () => tot.textContent = 'Total: ' + money(rows.reduce((s, r) => s + (+r.qty || 0) * (+r.unit_cost || 0), 0));
  draw(); recalc();
  rowsEl.addEventListener('input', (e) => {
    const r = e.target.closest('[data-row]'); if (!r) return; const i = +r.dataset.row, k = e.target.dataset.k;
    if (k === 'ref') { const [t, id] = e.target.value.split(':'); rows[i].item_type = t; rows[i].ref_id = id; } else rows[i][k === 'qty' ? 'qty' : 'unit_cost'] = e.target.value;
    recalc();
  });
  rowsEl.addEventListener('click', (e) => { if (e.target.dataset.rm !== undefined) { rows.splice(+e.target.closest('[data-row]').dataset.row, 1); draw(); recalc(); } });
  $('#addRow', form).onclick = () => { rows.push({ item_type: '', ref_id: '', qty: '', unit_cost: '' }); draw(); recalc(); };
  $('[data-c]', m.el).onclick = m.close;
  $('[data-s]', m.el).onclick = async () => {
    const clean = rows.filter((r) => r.ref_id && +r.qty > 0).map((r) => ({ item_type: r.item_type, ref_id: r.ref_id, qty: +r.qty, unit_cost: +r.unit_cost || 0 }));
    if (!form.invoice_no.value.trim() || !clean.length) { err.textContent = 'Enter an invoice number and at least one item.'; return; }
    const total = clean.reduce((s, r) => s + r.qty * r.unit_cost, 0);
    const status = form.status.value;
    const po = await cache('purchases').api.insert({ supplier_id: form.supplier_id.value, invoice_no: form.invoice_no.value.trim(), items: clean, total, status, date: form.date.value });
    if (status === 'Received') await receive(po);
    const s = byId('suppliers', po.supplier_id); await cache('suppliers').api.update(s.id, { balance: s.balance + total });
    toast('Purchase order created.'); m.close();
  };
}
async function receive(po) {
  for (const it of po.items) {
    const t = it.item_type === 'raw' ? 'raw_materials' : 'packaging'; const m = byId(t, it.ref_id);
    await cache(t).api.update(m.id, { stock: m.stock + it.qty, cost_per_unit: it.unit_cost || m.cost_per_unit });
  }
}
export async function render(page) {
  await Promise.all(['purchases', 'suppliers', 'raw_materials', 'packaging'].map((t) => cache(t).ready));
  const cls = { Pending: 'a', Received: 'g' };
  return buildListView(page, {
    id: 'purchases', table: 'purchases', sub: 'Orders placed with suppliers, and what has been received into stock.', listTitle: 'Purchases',
    actions: '<button class="btn pri" data-add>New purchase</button>', searchPlaceholder: 'Search invoice number…', searchText: (r) => r.invoice_no,
    filters: [{ key: 'status', label: 'Status', options: () => Object.keys(cls), match: (r, v) => r.status === v }],
    columns: [
      { key: 'invoice_no', label: 'Invoice', render: (r) => `<b>${esc(r.invoice_no)}</b><small>${esc(byId('suppliers', r.supplier_id)?.name || '')}</small>` },
      { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
      { key: 'total', label: 'Total', cls: 'r', render: (r) => money(r.total) },
      { key: 'status', label: 'Status', render: (r) => tag(r.status, cls[r.status]) },
    ],
    detail: (r) => `<div class="dh"><h2>${esc(r.invoice_no)}</h2><button class="x" data-close>✕</button></div>
     <p class="sub" style="margin:0 0 10px">${esc(byId('suppliers', r.supplier_id)?.name || '')} · ${fmtDate(r.date)}</p>
     <div class="rows">${r.items.map((it) => `<div class="line"><span>${esc(itemLabel(it))} × ${it.qty}</span><b>${money(it.qty * it.unit_cost)}</b></div>`).join('')}</div>
     <p class="note" style="margin-top:10px">Total: <b style="color:var(--ink)">${money(r.total)}</b> · ${tag(r.status, cls[r.status])}</p>
     <div class="acts">${r.status === 'Pending' ? '<button class="btn pri" data-recv>Mark received</button>' : ''}</div>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-recv]', el)?.addEventListener('click', async () => { if (await confirmBox('Add these items to stock now?', { yes: 'Receive' })) { await receive(row); await cache('purchases').api.update(row.id, { status: 'Received' }); toast('Stock updated.'); redraw(); } });
    },
    onMount: (root) => { $('[data-add]', root).onclick = openForm; },
  });
}
