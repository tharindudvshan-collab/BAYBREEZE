// Generic list-and-detail module builder: search + filter + sort + optional split detail pane,
// used by most business modules so every tab gets the same realtime, professional behaviour.
import { cache } from './cache.js';
import { $, $$, esc, head, tableHtml, toast, confirmBox, formModal, debounce, download, toCSV } from './ui.js';

export function buildListView(page, cfg) {
  const c = cache(cfg.table);
  let sortKey = cfg.sortKey || 'created_at', dir = -1, q = '', filters = {}, selId = null;
  const root = document.createElement('div');
  root.innerHTML = head(cfg.id, cfg.sub, cfg.actions || '');
  const toolbar = document.createElement('div'); toolbar.className = 'toolbar';
  toolbar.innerHTML = `<input class="grow" type="search" placeholder="${cfg.searchPlaceholder || 'Search…'}" aria-label="Search">${(cfg.filters || []).map((f) => `<select data-f="${f.key}" aria-label="${esc(f.label)}"><option value="">${esc(f.label)}: All</option>${f.options().map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`).join('')}<span class="sp"></span><button class="btn sm" data-export>Export CSV</button>`;
  root.append(toolbar);
  const wrap = document.createElement('div'); wrap.className = 'split' + (cfg.detail ? '' : '');
  const listCard = document.createElement('div'); listCard.className = 'card scroll';
  const detailCard = document.createElement('div'); detailCard.className = 'card detail'; detailCard.hidden = true;
  wrap.append(listCard); if (cfg.detail) wrap.append(detailCard);
  root.append(wrap); page.append(root);

  function filtered() {
    let rows = c.rows();
    if (cfg.baseFilter) rows = rows.filter(cfg.baseFilter);
    if (q) { const qq = q.toLowerCase(); rows = rows.filter((r) => cfg.searchText(r).toLowerCase().includes(qq)); }
    for (const k in filters) if (filters[k]) rows = rows.filter((r) => cfg.filters.find((f) => f.key === k).match(r, filters[k]));
    rows = [...rows].sort((a, b) => dir * (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0));
    return rows;
  }
  function renderDetail(row) {
    if (!cfg.detail) return;
    if (!row) { detailCard.hidden = true; wrap.classList.remove('open'); return; }
    detailCard.hidden = false; wrap.classList.add('open'); detailCard.innerHTML = cfg.detail(row);
    cfg.wireDetail?.(detailCard, row, redraw);
  }
  function redraw() {
    const rows = filtered();
    listCard.innerHTML = `<h2>${cfg.listTitle || ''}<span style="color:var(--mute);font-weight:400"> · ${rows.length}</span></h2>${tableHtml(cfg.columns, rows, { empty: cfg.empty, sortKey, dir })}`;
    if (selId) { const row = rows.find((r) => r.id === selId); renderDetail(row); if (!row) selId = null; }
  }
  toolbar.querySelector('input').oninput = debounce((e) => { q = e.target.value; redraw(); }, 150);
  $$('select[data-f]', toolbar).forEach((s) => (s.onchange = () => { filters[s.dataset.f] = s.value; redraw(); }));
  $('[data-export]', toolbar).onclick = () => download(`${cfg.table}.csv`, toCSV([cfg.columns.map((c2) => c2.label.replace(/<[^>]+>/g, '')), ...filtered().map((r) => cfg.columns.map((c2) => (c2.csv ? c2.csv(r) : r[c2.key])))]), 'text/csv');
  listCard.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const row = c.rows().find((r) => r.id === tr.dataset.id); if (!row) return;
    if (cfg.detail) { selId = selId === row.id ? null : row.id; redraw(); } else cfg.onRowClick?.(row);
  });
  const off = c.onChange(redraw);
  c.ready.then(redraw); redraw();
  cfg.onMount?.(root, { redraw, getSel: () => selId });
  return { root, redraw, destroy: off };
}

export function crudForm({ table: t, title, fields, row, extra }) {
  const c = cache(t);
  return formModal({
    title: (row ? 'Edit ' : 'Add ') + title, fields, values: row || {}, submit: row ? 'Save changes' : 'Add',
    ...extra,
    onSubmit: async (v, m) => {
      const clean = extra?.transform ? extra.transform(v, row) : v;
      if (row) await c.api.update(row.id, clean); else await c.api.insert(clean);
      toast(row ? 'Saved.' : `${title} added.`); m.close();
    },
  });
}
export async function crudDelete(t, row, label) {
  const ok = await confirmBox(`Delete ${esc(label)}? This cannot be undone.`, { yes: 'Delete', danger: true });
  if (!ok) return false;
  await cache(t).api.remove(row.id); toast('Deleted.'); return true;
}
