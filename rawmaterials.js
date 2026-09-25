import { $, esc, money, tag } from '../core/ui.js';
import { buildListView, crudForm, crudDelete } from '../core/crud.js';
import { cache, byId } from '../core/cache.js';

const fields = () => [
  { key: 'name', label: 'Material name', required: true, span: 2 },
  { key: 'unit', label: 'Unit', type: 'select', options: ['kg', 'l', 'pcs'], required: true },
  { key: 'cost_per_unit', label: 'Cost per unit (Rs.)', type: 'number', required: true },
  { key: 'stock', label: 'Stock on hand', type: 'number', required: true },
  { key: 'min_stock', label: 'Reorder point', type: 'number', required: true },
  { key: 'supplier_id', label: 'Preferred supplier', type: 'select', options: () => cache('suppliers').rows().map((s) => [s.id, s.name]), blank: 'None' },
];
export async function render(page) {
  await Promise.all(['raw_materials', 'suppliers'].map((t) => cache(t).ready));
  return buildListView(page, {
    id: 'rawmaterials', table: 'raw_materials', sub: 'Dried fish, oil, spices and everything else that goes into a batch.', listTitle: 'Raw materials',
    actions: '<button class="btn pri" data-add>Add material</button>', searchPlaceholder: 'Search raw materials…', searchText: (r) => r.name,
    columns: [
      { key: 'name', label: 'Material', render: (r) => `<b>${esc(r.name)}</b><small>${esc(byId('suppliers', r.supplier_id)?.name || 'No supplier set')}</small>` },
      { key: 'stock', label: 'Stock', cls: 'r', render: (r) => `${r.stock <= r.min_stock ? tag(r.stock, 'r') : r.stock} ${esc(r.unit)}` },
      { key: 'min_stock', label: 'Reorder at', cls: 'r' },
      { key: 'cost_per_unit', label: 'Cost / unit', cls: 'r', render: (r) => money(r.cost_per_unit) },
      { key: 'value', label: 'Stock value', cls: 'r', sort: false, render: (r) => money(r.stock * r.cost_per_unit) },
    ],
    detail: (r) => `<div class="dh"><h2>${esc(r.name)}</h2><button class="x" data-close>✕</button></div>
     <dl class="dl"><dt>Supplier</dt><dd>${esc(byId('suppliers', r.supplier_id)?.name || '—')}</dd><dt>Stock</dt><dd>${r.stock} ${esc(r.unit)}</dd><dt>Reorder point</dt><dd>${r.min_stock} ${esc(r.unit)}</dd><dt>Cost / unit</dt><dd>${money(r.cost_per_unit)}</dd><dt>Stock value</dt><dd>${money(r.stock * r.cost_per_unit)}</dd></dl>
     <div class="acts"><button class="btn" data-edit>Edit</button><button class="btn dng" data-del>Delete</button></div>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-edit]', el).onclick = () => crudForm({ table: 'raw_materials', title: 'raw material', fields: fields(), row });
      $('[data-del]', el).onclick = async () => { if (await crudDelete('raw_materials', row, row.name)) redraw(); };
    },
    onMount: (root) => { $('[data-add]', root).onclick = () => crudForm({ table: 'raw_materials', title: 'raw material', fields: fields() }); },
  });
}
