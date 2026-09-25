import { $, esc, money, fmtDate, toast } from '../core/ui.js';
import { buildListView, crudDelete } from '../core/crud.js';
import { cache, byId } from '../core/cache.js';
import { formModal } from '../core/ui.js';

function openForm() {
  const body = `<form class="frm" novalidate><div class="fg">
   <label class="f">Direction<select name="direction" required><option value="in">Money in (from customer)</option><option value="out">Money out (to supplier)</option></select></label>
   <label class="f">Amount (Rs.)<input name="amount" type="number" required></label>
   <label class="f s2" data-party-c>Customer<select name="customer_id"></select></label>
   <label class="f s2" data-party-s hidden>Supplier<select name="supplier_id"></select></label>
   <label class="f">Method<select name="method"><option>Cash</option><option>Bank transfer</option><option>Card</option></select></label>
   <label class="f">Date<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label>
   <label class="f s2">Note<textarea name="note" rows="2"></textarea></label>
  </div><p class="ferr" role="alert"></p></form>`;
  const m = (function () { const el = document.createElement('div'); return el; })();
  import('../core/ui.js').then(({ modal }) => {
    const mm = modal({ title: 'Record payment', wide: true, body, foot: `<button type="button" class="btn" data-c>Cancel</button><button type="button" class="btn pri" data-s>Save</button>` });
    const form = mm.form || mm.el.querySelector('form'), err = mm.el.querySelector('.ferr');
    form.customer_id.innerHTML = cache('customers').rows().map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    form.supplier_id.innerHTML = cache('suppliers').rows().map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
    const toggle = () => { const isIn = form.direction.value === 'in'; mm.el.querySelector('[data-party-c]').hidden = !isIn; mm.el.querySelector('[data-party-s]').hidden = isIn; };
    form.direction.onchange = toggle; toggle();
    mm.el.querySelector('[data-c]').onclick = mm.close;
    mm.el.querySelector('[data-s]').onclick = async () => {
      const amount = +form.amount.value; if (!amount) { err.textContent = 'Enter an amount.'; return; }
      const dir = form.direction.value;
      const payload = { direction: dir, amount, method: form.method.value, date: form.date.value, note: form.note.value.trim(), customer_id: dir === 'in' ? form.customer_id.value : null, supplier_id: dir === 'out' ? form.supplier_id.value : null };
      await cache('payments').api.insert(payload);
      if (dir === 'in') { const c = byId('customers', payload.customer_id); if (c) await cache('customers').api.update(c.id, { balance: Math.max(0, c.balance - amount) }); }
      else { const s = byId('suppliers', payload.supplier_id); if (s) await cache('suppliers').api.update(s.id, { balance: Math.max(0, s.balance - amount) }); }
      toast('Payment recorded.'); mm.close();
    };
  });
}
export async function render(page) {
  await Promise.all(['payments', 'customers', 'suppliers'].map((t) => cache(t).ready));
  return buildListView(page, {
    id: 'payments', table: 'payments', sub: 'Money received from customers and money paid to suppliers.', listTitle: 'Payments',
    actions: '<button class="btn pri" data-add>Record payment</button>', searchPlaceholder: 'Search payments…', searchText: (r) => r.note || '',
    filters: [{ key: 'direction', label: 'Direction', options: () => ['in', 'out'], match: (r, v) => r.direction === v }],
    columns: [
      { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
      { key: 'direction', label: 'Type', render: (r) => (r.direction === 'in' ? '<span class="up">▲ In</span>' : '<span class="dn">▼ Out</span>') },
      { key: 'party', label: 'Party', sort: false, render: (r) => esc(r.direction === 'in' ? byId('customers', r.customer_id)?.name : byId('suppliers', r.supplier_id)?.name) || '—' },
      { key: 'method', label: 'Method' },
      { key: 'amount', label: 'Amount', cls: 'r', render: (r) => money(r.amount) },
    ],
    detail: (r) => `<div class="dh"><h2>${r.direction === 'in' ? 'Payment received' : 'Payment made'}</h2><button class="x" data-close>✕</button></div>
     <dl class="dl"><dt>Date</dt><dd>${fmtDate(r.date)}</dd><dt>Party</dt><dd>${esc((r.direction === 'in' ? byId('customers', r.customer_id)?.name : byId('suppliers', r.supplier_id)?.name) || '—')}</dd><dt>Method</dt><dd>${esc(r.method)}</dd><dt>Amount</dt><dd>${money(r.amount)}</dd><dt>Note</dt><dd>${esc(r.note || '—')}</dd></dl>
     <div class="acts"><button class="btn dng" data-del>Delete</button></div>`,
    wireDetail: (el, row, redraw) => { $('[data-close]', el).onclick = redraw; $('[data-del]', el).onclick = async () => { if (await crudDelete('payments', row, 'this payment')) redraw(); }; },
    onMount: (root) => { $('[data-add]', root).onclick = openForm; },
  });
}
