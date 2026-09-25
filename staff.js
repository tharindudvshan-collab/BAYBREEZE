import { $, esc, tag, fmtDate, toast, confirmBox } from '../core/ui.js';
import { buildListView, crudForm } from '../core/crud.js';
import { cache } from '../core/cache.js';
import { PROFILE, can } from '../app.js';

const ROLES = ['Owner', 'Manager', 'Cashier', 'Production'];
export async function render(page) {
  await cache('staff').ready;
  const owner = can(['Owner']);
  return buildListView(page, {
    id: 'staff', table: 'staff', sub: 'Everyone with a login, and what they are allowed to do.', listTitle: 'Staff',
    actions: owner ? '<button class="btn pri" data-add>Invite / add staff</button>' : '',
    searchPlaceholder: 'Search staff…', searchText: (r) => `${r.name} ${r.email}`,
    filters: [{ key: 'role', label: 'Role', options: () => ROLES, match: (r, v) => r.role === v }],
    columns: [
      { key: 'name', label: 'Name', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.email)}</small>` },
      { key: 'role', label: 'Role', render: (r) => tag(r.role, r.role === 'Owner' ? 'a' : 'n') },
      { key: 'active', label: 'Status', render: (r) => (r.active === false ? tag('Inactive', 'r') : tag('Active', 'g')) },
      { key: 'created_at', label: 'Joined', render: (r) => fmtDate(r.created_at) },
    ],
    detail: owner ? (r) => `<div class="dh"><h2>${esc(r.name)}</h2><button class="x" data-close>✕</button></div>
     <dl class="dl"><dt>Email</dt><dd>${esc(r.email)}</dd><dt>Role</dt><dd>${esc(r.role)}</dd><dt>Status</dt><dd>${r.active === false ? 'Inactive' : 'Active'}</dd><dt>Joined</dt><dd>${fmtDate(r.created_at)}</dd></dl>
     ${r.id === PROFILE.id ? '<p class="note">This is your own account.</p>' : `<div class="acts"><button class="btn" data-role>Change role</button><button class="btn dng" data-tog>${r.active === false ? 'Reactivate' : 'Deactivate'}</button></div>`}` : undefined,
    wireDetail: owner ? (el, row, redraw) => {
      $('[data-close]', el).onclick = redraw;
      $('[data-role]', el)?.addEventListener('click', () => crudForm({ table: 'staff', title: 'staff role', row, fields: [{ key: 'role', label: 'Role', type: 'select', options: ROLES, required: true }] }));
      $('[data-tog]', el)?.addEventListener('click', async () => { await cache('staff').api.update(row.id, { active: row.active === false }); toast('Updated.'); redraw(); });
    } : undefined,
    onMount: (root) => { $('[data-add]', root)?.addEventListener('click', () => crudForm({
      table: 'staff', title: 'staff member',
      fields: [{ key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'role', label: 'Role', type: 'select', options: ROLES, default: 'Cashier', required: true }],
      extra: { note: 'Ask them to sign up with this exact email on the sign-in screen — their account links to this row automatically.', transform: (v) => ({ ...v, active: true }) },
    })); },
  });
}
