import { $, esc, money, tag, toast } from '../core/ui.js';
import { buildListView, crudForm, crudDelete } from '../core/crud.js';
import { cache } from '../core/cache.js';

const CATS = ['Fish', 'Seafood', 'Premium', 'Gift packs'];
const fields = (row) => [
  { key: 'name', label: 'Product name', required: true },
  { key: 'sku', label: 'SKU', required: true },
  { key: 'category', label: 'Category', type: 'select', options: CATS, required: true },
  { key: 'unit', label: 'Unit', type: 'select', options: ['bottle', 'jar', 'pack', 'pcs'], required: true },
  { key: 'price', label: 'Retail price (Rs.)', type: 'number', required: true },
  { key: 'wholesale_price', label: 'Wholesale price (Rs.)', type: 'number', required: true },
  { key: 'min_price', label: 'Minimum approved price (Rs.)', type: 'number', hint: 'Selling below this needs manager approval.' },
  { key: 'cost', label: 'Cost per unit (Rs.)', type: 'number', required: true },
  { key: 'stock', label: 'Stock on hand', type: 'number', required: true },
  { key: 'min_stock', label: 'Reorder point', type: 'number', required: true },
  { key: 'active', label: 'Active (sold in POS)', type: 'checkbox', default: true },
];

export async function render(page) {
  await cache('products').ready;
  return buildListView(page, {
    id: 'products', table: 'products', sub: 'Every item you make and sell, with cost, price and stock.', listTitle: 'Products',
    actions: '<button class="btn pri" data-add>Add product</button>',
    searchPlaceholder: 'Search products…', searchText: (r) => `${r.name} ${r.sku}`,
    filters: [{ key: 'category', label: 'Category', options: () => CATS, match: (r, v) => r.category === v }],
    columns: [
      { key: 'name', label: 'Product', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.sku)} · ${esc(r.category)}</small>` },
      { key: 'price', label: 'Price', cls: 'r', render: (r) => money(r.price) },
      { key: 'cost', label: 'Cost', cls: 'r', render: (r) => money(r.cost) },
      { key: 'margin', label: 'Margin', cls: 'r', sort: false, render: (r) => tag(Math.round(r.price ? ((r.price - r.cost) / r.price) * 100 : 0) + '%', r.price && (r.price - r.cost) / r.price >= 0.35 ? 'g' : 'a') },
      { key: 'stock', label: 'Stock', cls: 'r', render: (r) => (r.stock <= r.min_stock ? tag(r.stock, 'r') : r.stock) },
      { key: 'active', label: 'Status', sort: false, render: (r) => (r.active === false ? tag('Inactive', 'n') : tag('Active', 'g')) },
    ],
    detail: (r) => `
     <div class="dh"><div><h2>${esc(r.name)}</h2><p class="sub" style="margin:0">${esc(r.sku)} · ${esc(r.category)}</p></div><button class="x" data-close aria-label="Close">✕</button></div>
     <dl class="dl">
      <dt>Retail price</dt><dd>${money(r.price)}</dd>
      <dt>Wholesale price</dt><dd>${money(r.wholesale_price)}</dd>
      <dt>Cost</dt><dd>${money(r.cost)}</dd>
      <dt>Margin</dt><dd>${Math.round(r.price ? ((r.price - r.cost) / r.price) * 100 : 0)}%</dd>
      <dt>Stock on hand</dt><dd>${r.stock} ${esc(r.unit)}s</dd>
      <dt>Reorder point</dt><dd>${r.min_stock}</dd>
      <dt>Status</dt><dd>${r.active === false ? 'Inactive' : 'Active'}</dd>
     </dl>
     <div class="acts"><button class="btn" data-edit>Edit</button><button class="btn dng" data-del>Delete</button></div>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-edit]', el).onclick = () => crudForm({ table: 'products', title: 'product', fields: fields(row), row });
      $('[data-del]', el).onclick = async () => { if (await crudDelete('products', row, row.name)) redraw(); };
    },
    onMount: (root) => { $('[data-add]', root).onclick = () => crudForm({ table: 'products', title: 'product', fields: fields() }); },
  });
}
