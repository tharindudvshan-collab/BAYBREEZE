import { $, esc, money, fmtDate, sum } from '../core/ui.js';
import { buildListView, crudForm, crudDelete } from '../core/crud.js';
import { cache } from '../core/cache.js';

const CATS = ['Utilities', 'Transport', 'Salaries', 'Rent', 'Maintenance', 'Marketing', 'Other'];
const fields = () => [
  { key: 'category', label: 'Category', type: 'select', options: CATS, required: true },
  { key: 'amount', label: 'Amount (Rs.)', type: 'number', required: true },
  { key: 'method', label: 'Paid via', type: 'select', options: ['Cash', 'Bank'], required: true },
  { key: 'date', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10), required: true },
  { key: 'description', label: 'Description', type: 'textarea', span: 2, required: true },
];
export async function render(page) {
  await cache('expenses').ready;
  return buildListView(page, {
    id: 'expenses', table: 'expenses', sub: 'Everything spent running the business, outside of raw materials.', listTitle: 'Expenses',
    actions: '<button class="btn pri" data-add>Add expense</button>', searchPlaceholder: 'Search expenses…', searchText: (r) => `${r.category} ${r.description}`,
    filters: [{ key: 'category', label: 'Category', options: () => CATS, match: (r, v) => r.category === v }],
    columns: [
      { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount', cls: 'r', render: (r) => money(r.amount) },
    ],
    detail: (r) => `<div class="dh"><h2>${esc(r.category)}</h2><button class="x" data-close>✕</button></div>
     <dl class="dl"><dt>Date</dt><dd>${fmtDate(r.date)}</dd><dt>Method</dt><dd>${esc(r.method)}</dd><dt>Amount</dt><dd>${money(r.amount)}</dd><dt>Description</dt><dd>${esc(r.description)}</dd></dl>
     <div class="acts"><button class="btn" data-edit>Edit</button><button class="btn dng" data-del>Delete</button></div>`,
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-edit]', el).onclick = () => crudForm({ table: 'expenses', title: 'expense', fields: fields(), row });
      $('[data-del]', el).onclick = async () => { if (await crudDelete('expenses', row, row.category)) redraw(); };
    },
    onMount: (root) => { $('[data-add]', root).onclick = () => crudForm({ table: 'expenses', title: 'expense', fields: fields() }); },
  });
}
