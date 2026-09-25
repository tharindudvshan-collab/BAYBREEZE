import { $, esc, money, fmtDate, toast } from '../core/ui.js';
import { buildListView, crudForm, crudDelete } from '../core/crud.js';
import { cache, byId } from '../core/cache.js';

export async function render(page) {
  await Promise.all(['wastage', 'products', 'production'].map((t) => cache(t).ready));
  const fields = () => [
    { key: 'product_id', label: 'Product', type: 'select', options: () => cache('products').rows().map((p) => [p.id, p.name]), required: true },
    { key: 'production_id', label: 'Related batch (optional)', type: 'select', options: () => cache('production').rows().map((b) => [b.id, b.batch_no]), blank: 'None' },
    { key: 'qty', label: 'Quantity wasted', type: 'number', required: true, min: 0.1 },
    { key: 'reason', label: 'Reason', type: 'textarea', span: 2, required: true },
    { key: 'date', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10), required: true },
  ];
  return buildListView(page, {
    id: 'wastage', table: 'wastage', sub: 'Finished goods lost to breakage, spoilage or accidents — this reduces stock on hand.', listTitle: 'Wastage',
    actions: '<button class="btn pri" data-add>Log wastage</button>', searchPlaceholder: 'Search wastage…', searchText: (r) => r.reason + (byId('products', r.product_id)?.name || ''),
    columns: [
      { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
      { key: 'product', label: 'Product', sort: false, render: (r) => esc(byId('products', r.product_id)?.name || '') },
      { key: 'qty', label: 'Qty', cls: 'r' },
      { key: 'cost', label: 'Cost', cls: 'r', render: (r) => money(r.cost) },
      { key: 'reason', label: 'Reason' },
    ],
    detail: (r) => `<div class="dh"><h2>Wastage</h2><button class="x" data-close>✕</button></div>
     <dl class="dl"><dt>Date</dt><dd>${fmtDate(r.date)}</dd><dt>Product</dt><dd>${esc(byId('products', r.product_id)?.name || '')}</dd><dt>Batch</dt><dd>${esc(byId('production', r.production_id)?.batch_no || '—')}</dd><dt>Quantity</dt><dd>${r.qty}</dd><dt>Cost</dt><dd>${money(r.cost)}</dd><dt>Reason</dt><dd>${esc(r.reason)}</dd></dl>
     <div class="acts"><button class="btn dng" data-del>Delete</button></div>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-del]', el).onclick = async () => { if (await crudDelete('wastage', row, 'this entry')) redraw(); };
    },
    onMount: (root) => {
      $('[data-add]', root).onclick = () => crudForm({
        table: 'wastage', title: 'wastage entry', fields: fields(),
        extra: {
          onSubmit: async (v, m) => {
            const p = byId('products', v.product_id);
            if (v.qty > p.stock) throw new Error(`Only ${p.stock} of ${p.name} in stock.`);
            const cost = Math.round(v.qty * p.cost);
            await cache('wastage').api.insert({ ...v, cost });
            await cache('products').api.update(p.id, { stock: p.stock - v.qty });
            toast('Wastage logged — stock reduced.'); m.close();
          },
        },
      });
    },
  });
}
