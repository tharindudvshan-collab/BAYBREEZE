import { $, esc, money, tag, fmtDate, modal, toast } from '../core/ui.js';
import { buildListView, crudForm, crudDelete } from '../core/crud.js';
import { cache } from '../core/cache.js';

const TYPES = ['Retail', 'Wholesale', 'Hotel'];
const fields = () => [
  { key: 'name', label: 'Customer name', required: true, span: 2 },
  { key: 'type', label: 'Type', type: 'select', options: TYPES, required: true },
  { key: 'phone', label: 'Phone' }, { key: 'credit_limit', label: 'Credit limit (Rs.)', type: 'number' },
  { key: 'address', label: 'Address', type: 'textarea', span: 2 },
];
function recordPayment(customer) {
  crudForm({
    table: 'payments', title: 'payment', row: null,
    fields: [
      { key: 'amount', label: 'Amount received (Rs.)', type: 'number', required: true },
      { key: 'method', label: 'Method', type: 'select', options: ['Cash', 'Bank transfer', 'Card'], required: true },
      { key: 'date', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10), required: true },
      { key: 'note', label: 'Note', type: 'textarea', span: 2 },
    ],
    extra: {
      transform: (v) => ({ ...v, direction: 'in', customer_id: customer.id, supplier_id: null }),
      onSubmit: async (v, m) => {
        await cache('payments').api.insert({ ...v, direction: 'in', customer_id: customer.id, supplier_id: null });
        await cache('customers').api.update(customer.id, { balance: Math.max(0, customer.balance - v.amount) });
        toast('Payment recorded.'); m.close();
      },
    },
  });
}
export async function render(page) {
  await Promise.all(['customers', 'sales', 'wholesale_orders', 'payments'].map((t) => cache(t).ready));
  return buildListView(page, {
    id: 'customers', table: 'customers', sub: 'Retail regulars, wholesale accounts and hotels you supply.', listTitle: 'Customers',
    actions: '<button class="btn pri" data-add>Add customer</button>', searchPlaceholder: 'Search customers…', searchText: (r) => r.name,
    filters: [{ key: 'type', label: 'Type', options: () => TYPES, match: (r, v) => r.type === v }],
    columns: [
      { key: 'name', label: 'Customer', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.type)}</small>` },
      { key: 'phone', label: 'Phone' },
      { key: 'balance', label: 'Owes you', cls: 'r', render: (r) => (r.balance > 0 ? tag(money(r.balance), r.credit_limit && r.balance >= r.credit_limit * 0.8 ? 'r' : 'a') : money(0)) },
    ],
    detail: (r) => {
      const orders = cache('wholesale_orders').rows().filter((o) => o.customer_id === r.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
      return `<div class="dh"><h2>${esc(r.name)}</h2><button class="x" data-close>✕</button></div>
      <dl class="dl"><dt>Type</dt><dd>${esc(r.type)}</dd><dt>Phone</dt><dd>${esc(r.phone || '—')}</dd><dt>Address</dt><dd>${esc(r.address || '—')}</dd><dt>Credit limit</dt><dd>${r.credit_limit ? money(r.credit_limit) : '—'}</dd><dt>Owes you</dt><dd>${money(r.balance)}</dd></dl>
      <h3>Recent orders</h3>${orders.length ? orders.map((o) => `<div class="line"><span>${fmtDate(o.date)} · ${esc(o.status)}</span><b>${money(o.total)}</b></div>`).join('') : '<p class="note">No wholesale orders yet.</p>'}
      <div class="acts"><button class="btn pri" data-pay ${r.balance > 0 ? '' : 'disabled'}>Record payment</button><button class="btn" data-edit>Edit</button><button class="btn dng" data-del>Delete</button></div>`;
    },
    wireDetail: (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-pay]', el).onclick = () => recordPayment(row);
      $('[data-edit]', el).onclick = () => crudForm({ table: 'customers', title: 'customer', fields: fields(), row });
      $('[data-del]', el).onclick = async () => { if (await crudDelete('customers', row, row.name)) redraw(); };
    },
    onMount: (root) => { $('[data-add]', root).onclick = () => crudForm({ table: 'customers', title: 'customer', fields: [...fields(), { key: 'balance', label: 'Opening balance (Rs.)', type: 'number', default: 0 }] }); },
  });
}
