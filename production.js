import { $, $$, esc, money, pct, tag, toast, modal, confirmBox, fmtDate, uid } from '../core/ui.js';
import { buildListView } from '../core/crud.js';
import { cache, byId } from '../core/cache.js';

function nextBatchNo() {
  const d = new Date(), pad = (n) => String(n).padStart(2, '0');
  const stamp = `BJ-${d.getFullYear()}-${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const n = cache('production').rows().filter((b) => b.batch_no.startsWith(stamp)).length + 1;
  return `${stamp}-${String(n).padStart(3, '0')}`;
}
function recipeCost(items) { return items.reduce((s, it) => s + (byId(it.type === 'raw' ? 'raw_materials' : 'packaging', it.ref_id)?.cost_per_unit || 0) * it.qty, 0); }

function openStart() {
  const recipes = cache('recipes').rows();
  if (!recipes.length) { toast('Add a recipe first, under Recipes / BOM.', 'err'); return; }
  const body = `<form class="frm" novalidate><div class="fg">
    <label class="f s2">Recipe<select name="recipe_id" required>${recipes.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label>
    <label class="f">Planned quantity (units)<input name="planned_qty" type="number" min="1" required></label>
    <label class="f s2">Notes<textarea name="notes" rows="2"></textarea></label>
  </div><div id="need" class="ovr"></div><p class="ferr" role="alert"></p></form>`;
  const m = modal({ title: 'Start a production batch', body, foot: `<button type="button" class="btn" data-c>Cancel</button><button type="button" class="btn pri" data-s>Start batch</button>` });
  const form = $('form', m.el), need = $('#need', form), err = $('.ferr', form);
  const recalc = () => {
    const r = recipes.find((x) => x.id === form.recipe_id.value); const qty = +form.planned_qty.value || 0;
    if (!r || !qty) { need.innerHTML = ''; return; }
    const scale = qty / r.yield_qty;
    need.innerHTML = 'Needs: ' + r.items.map((it) => { const m2 = byId(it.type === 'raw' ? 'raw_materials' : 'packaging', it.ref_id); const req = it.qty * scale; const short = req > (m2?.stock || 0); return `<span class="${short ? 'bad' : ''}">${esc(m2?.name)} ${req.toFixed(1)}${esc(m2?.unit)}${short ? ' (short)' : ''}</span>`; }).join(', ');
  };
  form.recipe_id.oninput = form.planned_qty.oninput = recalc; recalc();
  $('[data-c]', m.el).onclick = m.close;
  $('[data-s]', m.el).onclick = async () => {
    err.textContent = '';
    const r = recipes.find((x) => x.id === form.recipe_id.value); const qty = +form.planned_qty.value;
    if (!r || !qty) { err.textContent = 'Choose a recipe and quantity.'; return; }
    const scale = qty / r.yield_qty;
    for (const it of r.items) {
      const t = it.type === 'raw' ? 'raw_materials' : 'packaging'; const m2 = byId(t, it.ref_id); const req = it.qty * scale;
      if (req > (m2?.stock || 0)) { err.textContent = `Not enough ${m2?.name} in stock (need ${req.toFixed(1)}, have ${m2?.stock}).`; return; }
    }
    for (const it of r.items) {
      const t = it.type === 'raw' ? 'raw_materials' : 'packaging'; const m2 = byId(t, it.ref_id);
      await cache(t).api.update(m2.id, { stock: +(m2.stock - it.qty * scale).toFixed(3) });
    }
    await cache('production').api.insert({ batch_no: nextBatchNo(), product_id: r.product_id, recipe_id: r.id, planned_qty: qty, actual_qty: 0, status: 'In progress', cost_per_unit: 0, started_at: new Date().toISOString(), completed_at: null, notes: form.notes.value.trim() });
    toast('Batch started — materials deducted from stock.'); m.close();
  };
}
function openComplete(b) {
  const recipe = byId('recipes', b.recipe_id);
  const totalCost = recipe ? recipeCost(recipe.items) * (b.planned_qty / recipe.yield_qty) : 0;
  const body = `<form class="frm" novalidate><div class="fg">
   <label class="f">Planned</label><label class="f">${b.planned_qty} units</label>
   <label class="f">Actual quantity produced<input name="actual_qty" type="number" min="0" max="${b.planned_qty}" required value="${b.planned_qty}"></label>
   <label class="f">Materials cost used<input name="cost" type="number" value="${Math.round(totalCost)}" disabled></label>
  </div><p class="note">Any shortfall between planned and actual can be logged as wastage afterwards.</p><p class="ferr" role="alert"></p></form>`;
  const m = modal({ title: `Complete ${b.batch_no}`, body, foot: `<button type="button" class="btn" data-c>Cancel</button><button type="button" class="btn pri" data-s>Complete batch</button>` });
  const form = $('form', m.el), err = $('.ferr', form);
  $('[data-c]', m.el).onclick = m.close;
  $('[data-s]', m.el).onclick = async () => {
    const actual = +form.actual_qty.value;
    if (!actual || actual < 0 || actual > b.planned_qty) { err.textContent = 'Enter a valid actual quantity.'; return; }
    const cpu = actual ? totalCost / actual : 0;
    await cache('production').api.update(b.id, { actual_qty: actual, cost_per_unit: Math.round(cpu), status: 'Completed', completed_at: new Date().toISOString() });
    const p = byId('products', b.product_id);
    await cache('products').api.update(p.id, { stock: p.stock + actual, cost: Math.round(cpu) });
    toast(`Batch completed — ${actual} units added to stock.`); m.close();
  };
}
async function cancelBatch(b) {
  if (b.status !== 'Planned' && b.status !== 'In progress') return;
  const ok = await confirmBox(`Cancel batch ${esc(b.batch_no)}? Materials already deducted will not be restored automatically.`, { yes: 'Cancel batch', danger: true });
  if (ok) { await cache('production').api.update(b.id, { status: 'Cancelled' }); toast('Batch cancelled.'); }
}

export async function render(page) {
  await Promise.all(['production', 'recipes', 'products', 'raw_materials', 'packaging'].map((t) => cache(t).ready));
  const cls = { Planned: 'n', 'In progress': 'a', Completed: 'g', Cancelled: 'r' };
  return buildListView(page, {
    id: 'production', table: 'production', sub: 'Batches: what you planned to make, what you actually made, and at what cost.', listTitle: 'Batches',
    actions: '<button class="btn pri" data-add>Start batch</button>', searchPlaceholder: 'Search batch number…', searchText: (r) => r.batch_no,
    filters: [{ key: 'status', label: 'Status', options: () => Object.keys(cls), match: (r, v) => r.status === v }],
    columns: [
      { key: 'batch_no', label: 'Batch', render: (r) => `<b>${esc(r.batch_no)}</b><small>${esc(byId('products', r.product_id)?.name || '')}</small>` },
      { key: 'planned_qty', label: 'Planned', cls: 'r' },
      { key: 'actual_qty', label: 'Actual', cls: 'r' },
      { key: 'yield', label: 'Yield', cls: 'r', sort: false, render: (r) => (r.status === 'Completed' ? pct((r.actual_qty / r.planned_qty) * 100, 1) : '—') },
      { key: 'status', label: 'Status', render: (r) => tag(r.status, cls[r.status]) },
    ],
    detail: (r) => `<div class="dh"><h2>${esc(r.batch_no)}</h2><button class="x" data-close>✕</button></div>
     <dl class="dl">
      <dt>Product</dt><dd>${esc(byId('products', r.product_id)?.name || '')}</dd>
      <dt>Status</dt><dd>${tag(r.status, cls[r.status])}</dd>
      <dt>Planned</dt><dd>${r.planned_qty}</dd>
      <dt>Actual</dt><dd>${r.actual_qty || '—'}</dd>
      <dt>Cost / unit</dt><dd>${r.cost_per_unit ? money(r.cost_per_unit) : '—'}</dd>
      <dt>Started</dt><dd>${fmtDate(r.started_at)}</dd>
      <dt>Completed</dt><dd>${r.completed_at ? fmtDate(r.completed_at) : '—'}</dd>
     </dl>
     ${r.notes ? `<p class="note" style="margin-top:10px">${esc(r.notes)}</p>` : ''}
     <div class="acts">${r.status === 'In progress' || r.status === 'Planned' ? '<button class="btn pri" data-complete>Complete batch</button><button class="btn dng" data-cancel>Cancel</button>' : ''}</div>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-complete]', el)?.addEventListener('click', () => openComplete(row));
      $('[data-cancel]', el)?.addEventListener('click', async () => { await cancelBatch(row); redraw(); });
    },
    onMount: (root) => { $('[data-add]', root).onclick = openStart; },
  });
}
