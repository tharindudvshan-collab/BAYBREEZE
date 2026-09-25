// Navigation map: [id, icon, English label, Sinhala label]
export const GROUPS = [
  ['Overview', 'දළ විශ්ලේෂණය', [['dash', '◧', 'Dashboard', 'උපකරණ පුවරුව'], ['pos', '▣', 'POS / Sales', 'විකුණුම් (POS)']]],
  ['Make', 'නිෂ්පාදනය', [['products', '◫', 'Products', 'නිෂ්පාදන'], ['recipes', '☰', 'Recipes / BOM', 'වට්ටෝරු'], ['production', '⚙', 'Production', 'නිෂ්පාදන කණ්ඩායම්']]],
  ['Stock', 'තොග', [['inventory', '▤', 'Inventory', 'තොග'], ['rawmaterials', '◍', 'Raw Materials', 'අමු ද්‍රව්‍ය'], ['packaging', '▢', 'Packaging', 'ඇසුරුම්'], ['purchases', '⇩', 'Purchases', 'මිලදී ගැනීම්'], ['suppliers', '◈', 'Suppliers', 'සැපයුම්කරුවන්']]],
  ['Sell', 'විකිණීම', [['customers', '☺', 'Customers', 'ගනුදෙනුකරුවන්'], ['wholesale', '▦', 'Wholesale', 'තොග වෙළඳාම'], ['returns', '↺', 'Returns', 'ආපසු ලබා දීම්'], ['wastage', '✕', 'Wastage', 'අපතේ යාම']]],
  ['Money', 'මුදල්', [['expenses', '₨', 'Expenses', 'වියදම්'], ['payments', '◔', 'Payments', 'ගෙවීම්'], ['reports', '▥', 'Reports', 'වාර්තා'], ['profit', '△', 'Profit Analytics', 'ලාභ විශ්ලේෂණය'], ['bi', '◉', 'Business Intelligence', 'ව්‍යාපාර බුද්ධිය'], ['ai', '✦', 'AI Assistant', 'AI සහායක']]],
  ['Admin', 'පරිපාලනය', [['staff', '♙', 'Staff', 'කාර්ය මණ්ඩලය'], ['settings', '⚒', 'Settings', 'සැකසුම්'], ['backup', '⛨', 'Backup & Audit', 'උපස්ථ සහ විගණන']]],
];
export const lang = () => localStorage.getItem('bb_lang') || 'en';
export const label = (id) => {
  for (const g of GROUPS) for (const r of g[2]) if (r[0] === id) return lang() === 'si' ? r[3] : r[2];
  return id;
};
export const groupLabel = (g) => (lang() === 'si' ? g[1] : g[0]);
export const ALL = GROUPS.flatMap((g) => g[2]);
// Lazy loaders: each module file is only downloaded when its tab is opened.
export const LOADERS = {
  dash: () => import('../modules/dashboard.js'),
  pos: () => import('../modules/pos.js'),
  products: () => import('../modules/products.js'),
  recipes: () => import('../modules/recipes.js'),
  production: () => import('../modules/production.js'),
  inventory: () => import('../modules/inventory.js'),
  rawmaterials: () => import('../modules/rawmaterials.js'),
  packaging: () => import('../modules/packaging.js'),
  purchases: () => import('../modules/purchases.js'),
  suppliers: () => import('../modules/suppliers.js'),
  customers: () => import('../modules/customers.js'),
  wholesale: () => import('../modules/wholesale.js'),
  returns: () => import('../modules/returns.js'),
  wastage: () => import('../modules/wastage.js'),
  expenses: () => import('../modules/expenses.js'),
  payments: () => import('../modules/payments.js'),
  reports: () => import('../modules/reports.js'),
  profit: () => import('../modules/profit.js'),
  bi: () => import('../modules/bi.js'),
  ai: () => import('../modules/ai.js'),
  staff: () => import('../modules/staff.js'),
  settings: () => import('../modules/settings.js'),
  backup: () => import('../modules/backup.js'),
};
