import { $, esc, head, money, pct, barRows, sum, today, addDays, dayOf, diffDays } from '../core/ui.js';
import { cache, byId } from '../core/cache.js';

export async function render(page) {
  await Promise.all(['sales', 'products', 'customers', 'wholesale_orders', 'purchases', 'suppliers'].map((t) => cache(t).ready));
  const el = document.createElement('div'); page.append(el);
  function draw() {
    const sales = cache('sales').rows(), t0 = today();
    const last30 = sales.filter((s) => diffDays(t0, dayOf(s)) <= 29);
    const byProduct = {};
    last30.forEach((s) => s.items.forEach((i) => { byProduct[i.product_id] = (byProduct[i.product_id] || 0) + i.price * i.qty; }));
    const topProducts = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => ({ label: byId('products', id)?.name || '—', value: v }));
    const byChannel = {}; last30.forEach((s) => (byChannel[s.channel] = (byChannel[s.channel] || 0) + s.total));
    const channelItems = Object.entries(byChannel).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ label: n, value: v }));
    const customers = cache('customers').rows().filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 8);
    const bySupplier = {}; cache('purchases').rows().forEach((p) => (bySupplier[p.supplier_id] = (bySupplier[p.supplier_id] || 0) + p.total));
    const topSuppliers = Object.entries(bySupplier).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => ({ label: byId('suppliers', id)?.name || '—', value: v }));

    el.innerHTML = `
    ${head('bi', 'Where revenue, spend and risk are concentrated — last 30 days unless noted.')}
    <div class="grid g2">
     <div class="card"><h2>Top products by revenue</h2>${barRows(topProducts)}</div>
     <div class="card"><h2>Revenue by channel</h2>${barRows(channelItems)}</div>
    </div>
    <div class="grid g2 mt">
     <div class="card"><h2>Top suppliers by spend (all time)</h2>${barRows(topSuppliers, { cls: 'red' })}</div>
     <div class="wcard">
      <h2>Customers with the largest balances</h2>
      ${customers.length ? customers.map((c) => `<div class="line"><div><b>${esc(c.name)}</b><br><small>${esc(c.type)}</small></div><div style="text-align:right"><b>${money(c.balance)}</b>${c.credit_limit ? `<br><small>${pct((c.balance / c.credit_limit) * 100, 0)} of limit</small>` : ''}</div></div>`).join('') : '<p style="color:#6B6F85">No outstanding balances.</p>'}
     </div>
    </div>`;
  }
  draw();
  return {};
}
