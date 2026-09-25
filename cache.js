// Shared in-memory cache per table, kept live by Supabase/demo realtime subscriptions.
// Modules call cache(name).rows() for instant data and cache(name).onChange(fn) to redraw on updates.
import { table } from './store.js';

const registry = {};
function make(name) {
  const t = table(name);
  const st = { rows: [], ready: false, listeners: new Set(), loading: null };
  st.loading = t.list().then((rows) => { st.rows = rows; st.ready = true; return rows; });
  t.subscribe(({ eventType, new: n, old }) => {
    if (eventType === 'INSERT') st.rows = [n, ...st.rows];
    else if (eventType === 'UPDATE') st.rows = st.rows.map((r) => (r.id === n.id ? n : r));
    else if (eventType === 'DELETE') st.rows = st.rows.filter((r) => r.id !== old.id);
    else if (eventType === 'reset') { st.loading = t.list().then((rows) => { st.rows = rows; return rows; }); }
    st.listeners.forEach((fn) => fn(st.rows, eventType));
  });
  return st;
}
export function cache(name) {
  const st = (registry[name] ??= make(name));
  return {
    rows: () => st.rows,
    ready: st.loading,
    onChange(fn) { st.listeners.add(fn); return () => st.listeners.delete(fn); },
    api: table(name),
  };
}
export function byId(name, id) { return cache(name).rows().find((r) => r.id === id); }
export function resetAllCaches() { Object.keys(registry).forEach((k) => delete registry[k]); }
