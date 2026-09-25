import { $, head, download, toast, confirmBox, fmtDate } from '../core/ui.js';
import { cache } from '../core/cache.js';
import { isLive } from '../core/store.js';
import { can } from '../app.js';

const TABLES = ['products', 'raw_materials', 'packaging', 'recipes', 'production', 'suppliers', 'purchases', 'customers', 'sales', 'wholesale_orders', 'returns', 'wastage', 'expenses', 'payments', 'staff', 'inventory_adjustments'];

export async function render(page) {
  await Promise.all(TABLES.map((t) => cache(t).ready));
  const owner = can(['Owner']);
  page.innerHTML = `${head('backup', 'Export everything as a backup, or review who changed what.')}
  <div class="card">
   <h2>Export</h2>
   <p class="sub" style="margin:0 0 14px">Downloads a single JSON file with every table — products, sales, customers, and the rest.</p>
   <button class="btn pri" id="exportAll">Download full backup (.json)</button>
  </div>
  <div class="card mt">
   <h2>Data snapshot</h2>
   <table><tr><th>Table</th><th class="r">Records</th></tr>${TABLES.map((t) => `<tr><td>${t.replace(/_/g, ' ')}</td><td class="r">${cache(t).rows().length}</td></tr>`).join('')}</table>
  </div>
  ${!isLive() && owner ? `<div class="card mt"><h2>Danger zone</h2><p class="sub" style="margin:0 0 14px">This browser is holding all data locally, since Supabase is not connected yet.</p><button class="btn dng" id="wipeAll">Erase all demo data</button></div>` : ''}`;
  $('#exportAll').onclick = () => {
    const dump = Object.fromEntries(TABLES.map((t) => [t, cache(t).rows()]));
    download(`baybreeze-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(dump, null, 2), 'application/json');
    toast('Backup downloaded.');
  };
  $('#wipeAll')?.addEventListener('click', async () => {
    if (await confirmBox('Erase every record in this browser? This cannot be undone.', { danger: true, yes: 'Erase everything' })) {
      const { resetDemo } = await import('../core/store.js'); resetDemo(); toast('All data reset.');
    }
  });
  return {};
}
