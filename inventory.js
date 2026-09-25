import { $, $$, esc, head, money, tag, toast, modal } from '../core/ui.js';
import { cache, byId } from '../core/cache.js';

const SRC = [['products', 'Finished goods'], ['raw_materials', 'Raw materials'], ['packaging', 'Packaging']];
function allItems() {
  return SRC.flatMap(([t, label]) => cache(t).rows().map((r) => ({ ...r, _type: t, _type_label: label, _cost: t === 'products' ? r.cost : r.cost_per_unit })));
}
function openAdjust(item) {
  const body = `<form class="frm" novalidate><div class="fg">
   <label class="f s2">Item<input value="${esc(item.name)}" disabled></label>
   <label class="f">Current stock<input value="${item.stock} ${esc(item.unit)}" disabled></label>
   <label class="f">Adjustment (+/-)<input name="delta" type="number" step="any" required placeholder="e.g. -5 or 10"></label>
   <label class="f s2">Reason<textarea name="reason" rows="2" required placeholder="Stock take correction, damage, etc."></textarea></label>
  </div><p class="ferr" role="alert"></p></form>`;
  const m = modal({ title: 'Adjust stock', body, foot: `<button type="button" class="btn" data-c>Cancel</button><button type="button" class="btn pri" data-s>Apply</button>` });
  const form = $('form', m.el), err = $('.ferr', form);
  $('[data-c]', m.el).onclick = m.close;
  $('[data-s]', m.el).onclick = async () => {
    const delta = +form.delta.value, reason = form.reason.value.trim();
    if (!delta || !reason) { err.textContent = 'Enter an adjustment amount and a reason.'; return; }
    if (item.stock + delta < 0) { err.textContent = 'Stock cannot go below zero.'; return; }
    await cache(item._type).api.update(item.id, { stock: +(item.stock + delta).toFixed(3) });
    await cache('inventory_adjustments').api.insert({ item_type: item._type, ref_id: item.id, qty_delta: delta, reason, date: new Date().toISOString().slice(0, 10) });
    toast('Stock adjusted.'); m.close();
  };
}
export async function render(page) {
  await Promise.all([...SRC.map(([t]) => cache(t).ready), cache('inventory_adjustments').ready]);
  let type = 'all', q = '';
  const el = document.createElement('div'); page.append(el);
  function draw() {
    let rows = allItems();
    if (type !== 'all') rows = rows.filter((r) => r._type === type);
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    const value = rows.reduce((s, r) => s + r.stock * r._cost, 0);
    const low = rows.filter((r) => r.stock <= r.min_stock).length;
    el.innerHTML = `
    ${head('inventory', 'Everything you hold in stock: finished goods, raw materials and packaging, in one place.')}
    <div class="grid g3 mt" style="margin-bottom:8px">
     <div class="card kpi"><div class="ring">▤</div><small>Items tracked</small><span class="v">${rows.length}</span></div>
     <div class="card kpi"><div class="ring">₨</div><small>Stock value</small><span class="v">${money(value)}</span></div>
     <div class="card kpi"><div class="ring">!</div><small>Below reorder point</small><span class="v" style="${low ? 'color:var(--red)' : ''}">${low}</span></div>
    </div>
    <div class="toolbar"><input class="grow" type="search" placeholder="Search stock…" id="q"><div class="seg" id="seg">${['all', ...SRC.map((s) => s[0])].map((t) => `<button class="${t === type ? 'on' : ''}" data-t="${t}">${t === 'all' ? 'All' : SRC.find((s) => s[0] === t)[1]}</button>`).join('')}</div></div>
    <div class="card scroll"><table><tr><th>Item</th><th>Type</th><th class="r">Stock</th><th class="r">Reorder at</th><th class="r">Value</th><th></th></tr>
     ${rows.map((r) => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r._type_label)}</td><td class="r">${r.stock <= r.min_stock ? tag(`${r.stock} ${esc(r.unit)}`, 'r') : `${r.stock} ${esc(r.unit)}`}</td><td class="r">${r.min_stock}</td><td class="r">${money(r.stock * r._cost)}</td><td class="r"><button class="btn sm" data-adj="${r.id}" data-t2="${r._type}">Adjust</button></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">No items.</div></td></tr>'}
    </table></div>`;
    $('#q', el).oninput = (e) => { q = e.target.value.toLowerCase(); draw(); };
    $$('#seg button', el).forEach((b) => (b.onclick = () => { type = b.dataset.t; draw(); }));
    $$('[data-adj]', el).forEach((b) => (b.onclick = () => openAdjust(allItems().find((r) => r.id === b.dataset.adj && r._type === b.dataset.t2))));
  }
  const offs = SRC.map(([t]) => cache(t).onChange(draw));
  draw();
  return { destroy: () => offs.forEach((f) => f()) };
}
