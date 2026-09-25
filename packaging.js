import { $, esc, money, tag } from '../core/ui.js';
import { buildListView, crudForm, crudDelete } from '../core/crud.js';
import { cache } from '../core/cache.js';

const fields = () => [
  { key: 'name', label: 'Packaging item', required: true, span: 2 },
  { key: 'unit', label: 'Unit', type: 'select', options: ['pcs'], default: 'pcs', required: true },
  { key: 'cost_per_unit', label: 'Cost per unit (Rs.)', type: 'number', required: true },
  { key: 'stock', label: 'Stock on hand', type: 'number', required: true },
  { key: 'min_stock', label: 'Reorder point', type: 'number', required: true },
];
export async function render(page) {
  await cache('packaging').ready;
  return buildListView(page, {
    id: 'packaging', table: 'packaging', sub: 'Bottles, jars and labels used to pack finished products.', listTitle: 'Packaging',
    actions: '<button class="btn pri" data-add>Add item</button>', searchPlaceholder: 'Search packaging…', searchText: (r) => r.name,
    columns: [
      { key: 'name', label: 'Item', render: (r) => `<b>${esc(r.name)}</b>` },
      { key: 'stock', label: 'Stock', cls: 'r', render: (r) => (r.stock <= r.min_stock ? tag(r.stock, 'r') : r.stock) },
      { key: 'min_stock', label: 'Reorder at', cls: 'r' },
      { key: 'cost_per_unit', label: 'Cost / unit', cls: 'r', render: (r) => money(r.cost_per_unit) },
      { key: 'value', label: 'Stock value', cls: 'r', sort: false, render: (r) => money(r.stock * r.cost_per_unit) },
    ],
    detail: (r) => `<div class="dh"><h2>${esc(r.name)}</h2><button class="x" data-close>✕</button></div>
     <dl class="dl"><dt>Stock</dt><dd>${r.stock} ${esc(r.unit)}</dd><dt>Reorder point</dt><dd>${r.min_stock}</dd><dt>Cost / unit</dt><dd>${money(r.cost_per_unit)}</dd><dt>Stock value</dt><dd>${money(r.stock * r.cost_per_unit)}</dd></dl>
     <div class="acts"><button class="btn" data-edit>Edit</button><button class="btn dng" data-del>Delete</button></div>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-edit]', el).onclick = () => crudForm({ table: 'packaging', title: 'packaging item', fields: fields(), row });
      $('[data-del]', el).onclick = async () => { if (await crudDelete('packaging', row, row.name)) redraw(); };
    },
    onMount: (root) => { $('[data-add]', root).onclick = () => crudForm({ table: 'packaging', title: 'packaging item', fields: fields() }); },
  });
}
