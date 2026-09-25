import { $, esc, money, tag, fmtDate } from '../core/ui.js';
import { buildListView, crudForm, crudDelete } from '../core/crud.js';
import { cache } from '../core/cache.js';

const CATS = ['Dried fish', 'Packaging', 'Spices & oil', 'Other'];
const fields = () => [
  { key: 'name', label: 'Supplier name', required: true, span: 2 },
  { key: 'category', label: 'Supplies', type: 'select', options: CATS, required: true },
  { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Address', type: 'textarea', span: 2 },
];
export async function render(page) {
  await Promise.all(['suppliers', 'purchases'].map((t) => cache(t).ready));
  return buildListView(page, {
    id: 'suppliers', table: 'suppliers', sub: 'Who you buy raw materials and packaging from, and what you owe them.', listTitle: 'Suppliers',
    actions: '<button class="btn pri" data-add>Add supplier</button>', searchPlaceholder: 'Search suppliers…', searchText: (r) => r.name,
    filters: [{ key: 'category', label: 'Supplies', options: () => CATS, match: (r, v) => r.category === v }],
    columns: [
      { key: 'name', label: 'Supplier', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.category)}</small>` },
      { key: 'phone', label: 'Phone' },
      { key: 'balance', label: 'You owe', cls: 'r', render: (r) => (r.balance > 0 ? tag(money(r.balance), 'a') : money(0)) },
    ],
    detail: (r) => {
      const pos = cache('purchases').rows().filter((p) => p.supplier_id === r.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
      return `<div class="dh"><h2>${esc(r.name)}</h2><button class="x" data-close>✕</button></div>
      <dl class="dl"><dt>Category</dt><dd>${esc(r.category)}</dd><dt>Phone</dt><dd>${esc(r.phone || '—')}</dd><dt>Email</dt><dd>${esc(r.email || '—')}</dd><dt>Address</dt><dd>${esc(r.address || '—')}</dd><dt>You owe</dt><dd>${money(r.balance)}</dd></dl>
      <h3>Recent purchases</h3>${pos.length ? pos.map((p) => `<div class="line"><span>${esc(p.invoice_no)} · ${fmtDate(p.date)}</span><b>${money(p.total)}</b></div>`).join('') : '<p class="note">No purchases yet.</p>'}
      <div class="acts"><button class="btn" data-edit>Edit</button><button class="btn dng" data-del>Delete</button></div>`;
    },
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-edit]', el).onclick = () => crudForm({ table: 'suppliers', title: 'supplier', fields: fields(), row });
      $('[data-del]', el).onclick = async () => { if (await crudDelete('suppliers', row, row.name)) redraw(); };
    },
    onMount: (root) => { $('[data-add]', root).onclick = () => crudForm({ table: 'suppliers', title: 'supplier', fields: fields() }); },
  });
}
