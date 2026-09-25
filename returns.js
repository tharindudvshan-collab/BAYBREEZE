import { $, esc, money, fmtDate, toast } from '../core/ui.js';
import { buildListView, crudForm, crudDelete } from '../core/crud.js';
import { cache, byId } from '../core/cache.js';

export async function render(page) {
  await Promise.all(['returns', 'customers', 'products'].map((t) => cache(t).ready));
  const fields = () => [
    { key: 'customer_id', label: 'Customer', type: 'select', options: () => cache('customers').rows().map((c) => [c.id, c.name]), blank: 'Walk-in / none' },
    { key: 'product_id', label: 'Product returned', type: 'select', options: () => cache('products').rows().map((p) => [p.id, p.name]), required: true },
    { key: 'qty', label: 'Quantity', type: 'number', required: true, min: 1 },
    { key: 'price', label: 'Refund price per unit (Rs.)', type: 'number', required: true },
    { key: 'reason', label: 'Reason', type: 'textarea', span: 2, required: true },
    { key: 'date', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10), required: true },
  ];
  return buildListView(page, {
    id: 'returns', table: 'returns', sub: 'Items customers have sent back, and why.', listTitle: 'Returns',
    actions: '<button class="btn pri" data-add>Log a return</button>', searchPlaceholder: 'Search returns…', searchText: (r) => r.reason + (byId('customers', r.customer_id)?.name || ''),
    columns: [
      { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
      { key: 'items', label: 'Item(s)', sort: false, render: (r) => (r.items || []).map((i) => `${byId('products', i.product_id)?.name || ''} × ${i.qty}`).join(', ') },
      { key: 'reason', label: 'Reason' },
      { key: 'amount', label: 'Amount', cls: 'r', render: (r) => money(r.amount) },
    ],
    detail: (r) => `<div class="dh"><h2>Return</h2><button class="x" data-close>✕</button></div>
     <dl class="dl"><dt>Date</dt><dd>${fmtDate(r.date)}</dd><dt>Customer</dt><dd>${esc(byId('customers', r.customer_id)?.name || '—')}</dd><dt>Items</dt><dd>${(r.items || []).map((i) => `${esc(byId('products', i.product_id)?.name || '')} × ${i.qty}`).join(', ')}</dd><dt>Reason</dt><dd>${esc(r.reason)}</dd><dt>Amount</dt><dd>${money(r.amount)}</dd></dl>
     <div class="acts"><button class="btn dng" data-del>Delete</button></div>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-del]', el).onclick = async () => { if (await crudDelete('returns', row, 'this return')) redraw(); };
    },
    onMount: (root) => {
      $('[data-add]', root).onclick = () => crudForm({
        table: 'returns', title: 'return', fields: fields(),
        extra: {
          onSubmit: async (v, m) => {
            const amount = v.qty * v.price;
            await cache('returns').api.insert({ customer_id: v.customer_id, items: [{ product_id: v.product_id, qty: v.qty, price: v.price }], reason: v.reason, amount, date: v.date });
            const p = byId('products', v.product_id); await cache('products').api.update(p.id, { stock: p.stock + v.qty });
            if (v.customer_id) { const c = byId('customers', v.customer_id); await cache('customers').api.update(c.id, { balance: Math.max(0, c.balance - amount) }); }
            toast('Return logged — stock restored.'); m.close();
          },
        },
      });
    },
  });
}
