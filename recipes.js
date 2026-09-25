import { $, $$, esc, money, uid, toast, modal, confirmBox } from '../core/ui.js';
import { buildListView } from '../core/crud.js';
import { cache, byId } from '../core/cache.js';

const matOptions = () => [...cache('raw_materials').rows().map((r) => ['raw:' + r.id, r.name + ' (raw)']), ...cache('packaging').rows().map((r) => ['pack:' + r.id, r.name + ' (packaging)'])];
const matLabel = (t, id) => byId(t === 'raw' ? 'raw_materials' : 'packaging', id)?.name || '—';
const matUnit = (t, id) => byId(t === 'raw' ? 'raw_materials' : 'packaging', id)?.unit || '';
const matCost = (t, id) => byId(t === 'raw' ? 'raw_materials' : 'packaging', id)?.cost_per_unit || 0;

function rowHtml(it, i) {
  const val = it ? `${it.type}:${it.ref_id}` : '';
  return `<div class="rowline" style="grid-template-columns:1fr 90px auto" data-row="${i}">
    <select data-k="ref">${'<option value="">Choose ingredient…</option>' + matOptions().map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
    <input data-k="qty" type="number" min="0" step="any" placeholder="Qty" value="${it ? it.qty : ''}">
    <button type="button" class="btn dng sm" data-rm>Remove</button>
  </div>`;
}
function costOf(items, yieldQty) {
  const c = items.reduce((s, it) => s + matCost(it.type, it.ref_id) * (+it.qty || 0), 0);
  return yieldQty ? c / yieldQty : 0;
}
function openForm(row) {
  let items = row ? row.items.map((i) => ({ ...i })) : [{ type: 'raw', ref_id: '', qty: '' }];
  const body = `<form class="frm" novalidate>
   <div class="fg">
    <label class="f s2">Recipe name<input name="name" required value="${row ? esc(row.name) : ''}"></label>
    <label class="f">Product it makes<select name="product_id" required>${cache('products').rows().map((p) => `<option value="${p.id}" ${row?.product_id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    <label class="f">Yield (units per batch)<input name="yield_qty" type="number" min="1" required value="${row ? row.yield_qty : ''}"></label>
   </div>
   <h3>Ingredients</h3>
   <div class="rows" id="rows"></div>
   <button type="button" class="btn sm" id="addRow" style="margin-top:10px">+ Add ingredient</button>
   <div class="ovr" id="costPreview"></div>
   <p class="ferr" role="alert"></p>
  </form>`;
  const m = modal({ title: (row ? 'Edit' : 'New') + ' recipe', wide: true, body, foot: `<button type="button" class="btn" data-c>Cancel</button><button type="button" class="btn pri" data-s>${row ? 'Save changes' : 'Create recipe'}</button>` });
  const form = $('form', m.el), rowsEl = $('#rows', form), err = $('.ferr', form), prev = $('#costPreview', form);
  function drawRows() { rowsEl.innerHTML = items.map(rowHtml).join(''); }
  function recalc() {
    const y = +form.yield_qty.value || 0;
    prev.textContent = `Estimated cost per unit: ${money(costOf(items, y))} (batch total ${money(costOf(items, y) * y)})`;
  }
  drawRows(); recalc();
  rowsEl.addEventListener('input', (e) => {
    const r = e.target.closest('[data-row]'); if (!r) return;
    const i = +r.dataset.row, k = e.target.dataset.k;
    if (k === 'ref') { const [type, ref_id] = e.target.value.split(':'); items[i].type = type; items[i].ref_id = ref_id; } else items[i].qty = e.target.value;
    recalc();
  });
  form.yield_qty.addEventListener('input', recalc);
  rowsEl.addEventListener('click', (e) => { if (e.target.dataset.rm !== undefined) { items.splice(+e.target.closest('[data-row]').dataset.row, 1); drawRows(); recalc(); } });
  $('#addRow', form).onclick = () => { items.push({ type: 'raw', ref_id: '', qty: '' }); drawRows(); recalc(); };
  $('[data-c]', m.el).onclick = m.close;
  $('[data-s]', m.el).onclick = async () => {
    err.textContent = '';
    const name = form.name.value.trim(), product_id = form.product_id.value, yield_qty = +form.yield_qty.value;
    const clean = items.filter((i) => i.ref_id && +i.qty > 0).map((i) => ({ type: i.type, ref_id: i.ref_id, qty: +i.qty }));
    if (!name || !yield_qty) { err.textContent = 'Fill in the recipe name and yield.'; return; }
    if (!clean.length) { err.textContent = 'Add at least one ingredient with a quantity.'; return; }
    const payload = { name, product_id, yield_qty, items: clean };
    try { row ? await cache('recipes').api.update(row.id, payload) : await cache('recipes').api.insert(payload); toast(row ? 'Recipe saved.' : 'Recipe created.'); m.close(); }
    catch (e) { err.textContent = e.message; }
  };
}

export async function render(page) {
  await Promise.all(['recipes', 'products', 'raw_materials', 'packaging'].map((t) => cache(t).ready));
  return buildListView(page, {
    id: 'recipes', table: 'recipes', sub: 'The bill of materials for each product — what a batch consumes, and its cost.', listTitle: 'Recipes',
    actions: '<button class="btn pri" data-add>New recipe</button>', searchPlaceholder: 'Search recipes…', searchText: (r) => r.name,
    columns: [
      { key: 'name', label: 'Recipe', render: (r) => `<b>${esc(r.name)}</b><small>${esc(byId('products', r.product_id)?.name || '')}</small>` },
      { key: 'yield_qty', label: 'Yield', cls: 'r' },
      { key: 'cost', label: 'Cost / unit', cls: 'r', sort: false, render: (r) => money(costOf(r.items, r.yield_qty)) },
      { key: 'items', label: 'Ingredients', cls: 'r', sort: false, render: (r) => r.items.length },
    ],
    detail: (r) => `<div class="dh"><h2>${esc(r.name)}</h2><button class="x" data-close>✕</button></div>
     <p class="sub" style="margin:0 0 10px">Makes ${esc(byId('products', r.product_id)?.name || '')} · yield ${r.yield_qty} units</p>
     <div class="rows">${r.items.map((i) => `<div class="line"><span>${esc(matLabel(i.type, i.ref_id))}</span><b>${i.qty} ${esc(matUnit(i.type, i.ref_id))}</b></div>`).join('')}</div>
     <p class="note" style="margin-top:10px">Estimated cost per unit: <b style="color:var(--ink)">${money(costOf(r.items, r.yield_qty))}</b></p>
     <div class="acts"><button class="btn" data-edit>Edit</button><button class="btn dng" data-del>Delete</button></div>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-edit]', el).onclick = () => openForm(row);
      $('[data-del]', el).onclick = async () => { if (await confirmBox(`Delete recipe "${esc(row.name)}"?`, { yes: 'Delete', danger: true })) { await cache('recipes').api.remove(row.id); toast('Deleted.'); redraw(); } };
    },
    onMount: (root) => { $('[data-add]', root).onclick = () => openForm(); },
  });
}
