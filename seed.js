import { uid } from './ui.js';
const iso = (daysAgo = 0, h = 9) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const id = () => uid();

export function seed() {
  const sup1 = id(), sup2 = id(), sup3 = id();
  const suppliers = [
    { id: sup1, name: 'Negombo Fish Suppliers', phone: '077 210 4433', email: 'orders@negombofish.lk', address: 'Negombo Fish Market, Negombo', category: 'Dried fish', balance: 0, created_at: iso(80) },
    { id: sup2, name: 'Ceylon Bottle & Can Co.', phone: '011 288 7712', email: 'sales@ceylonbottle.lk', address: 'Wattala Industrial Zone', category: 'Packaging', balance: 46500, created_at: iso(70) },
    { id: sup3, name: 'Spice Garden Traders', phone: '031 222 9981', email: '', address: 'Chilaw', category: 'Spices & oil', balance: 12800, created_at: iso(60) },
  ];
  const rm1 = id(), rm2 = id(), rm3 = id(), rm4 = id(), rm5 = id();
  const raw_materials = [
    { id: rm1, name: 'Dried fish (Karawala)', unit: 'kg', stock: 86, min_stock: 40, cost_per_unit: 1290, supplier_id: sup1, created_at: iso(85) },
    { id: rm2, name: 'Mixed seafood (Kunissa/Cuttlefish)', unit: 'kg', stock: 34, min_stock: 25, cost_per_unit: 1850, supplier_id: sup1, created_at: iso(85) },
    { id: rm3, name: 'Coconut oil', unit: 'l', stock: 58, min_stock: 20, cost_per_unit: 780, supplier_id: sup3, created_at: iso(85) },
    { id: rm4, name: 'Chilli & spice mix', unit: 'kg', stock: 19, min_stock: 15, cost_per_unit: 1120, supplier_id: sup3, created_at: iso(85) },
    { id: rm5, name: 'Salt', unit: 'kg', stock: 64, min_stock: 20, cost_per_unit: 95, supplier_id: sup3, created_at: iso(85) },
  ];
  const pk1 = id(), pk2 = id(), pk3 = id();
  const packaging = [
    { id: pk1, name: 'Bottle 250ml', unit: 'pcs', stock: 140, min_stock: 300, cost_per_unit: 62, created_at: iso(85) },
    { id: pk2, name: 'Bottle 500ml', unit: 'pcs', stock: 410, min_stock: 200, cost_per_unit: 98, created_at: iso(85) },
    { id: pk3, name: 'Jar 1kg + label', unit: 'pcs', stock: 260, min_stock: 100, cost_per_unit: 175, created_at: iso(85) },
  ];
  const p1 = id(), p2 = id(), p3 = id(), p4 = id();
  const products = [
    { id: p1, sku: 'FJ-250', name: 'Fish Jaadi 250g', category: 'Fish', unit: 'bottle', price: 950, wholesale_price: 800, min_price: 800, cost: 608, stock: 42, min_stock: 60, active: true, created_at: iso(85) },
    { id: p2, sku: 'MS-500', name: 'Mixed Seafood Jaadi 500g', category: 'Seafood', unit: 'bottle', price: 1850, wholesale_price: 1600, min_price: 1550, cost: 1060, stock: 18, min_stock: 30, active: true, created_at: iso(85) },
    { id: p3, sku: 'PF-1000', name: 'Premium Fish Jaadi 1kg', category: 'Premium', unit: 'jar', price: 3400, wholesale_price: 3050, min_price: 3000, cost: 2020, stock: 9, min_stock: 20, active: true, created_at: iso(85) },
    { id: p4, sku: 'GP-3', name: 'Gift Pack (3 bottles)', category: 'Gift packs', unit: 'pack', price: 2700, wholesale_price: 2400, min_price: 2300, cost: 1824, stock: 14, min_stock: 15, active: true, created_at: iso(85) },
  ];
  const recipes = [
    { id: id(), product_id: p1, name: 'Fish Jaadi 250g — standard batch', yield_qty: 100, items: [{ type: 'raw', ref_id: rm1, qty: 22 }, { type: 'raw', ref_id: rm3, qty: 6 }, { type: 'raw', ref_id: rm4, qty: 3.5 }, { type: 'raw', ref_id: rm5, qty: 1.2 }, { type: 'pack', ref_id: pk1, qty: 100 }], created_at: iso(80) },
    { id: id(), product_id: p2, name: 'Mixed Seafood 500g — standard batch', yield_qty: 60, items: [{ type: 'raw', ref_id: rm2, qty: 24 }, { type: 'raw', ref_id: rm3, qty: 5 }, { type: 'raw', ref_id: rm4, qty: 2.8 }, { type: 'pack', ref_id: pk2, qty: 60 }], created_at: iso(80) },
    { id: id(), product_id: p3, name: 'Premium Fish 1kg — standard batch', yield_qty: 30, items: [{ type: 'raw', ref_id: rm1, qty: 20 }, { type: 'raw', ref_id: rm3, qty: 4 }, { type: 'raw', ref_id: rm4, qty: 2 }, { type: 'pack', ref_id: pk3, qty: 30 }], created_at: iso(80) },
  ];
  const production = [
    { id: id(), batch_no: 'BJ-2026-0923-001', product_id: p1, planned_qty: 100, actual_qty: 96, status: 'Completed', cost_per_unit: 608, started_at: iso(2), completed_at: iso(2, 16), notes: '', created_at: iso(2) },
    { id: id(), batch_no: 'BJ-2026-0921-001', product_id: p2, planned_qty: 60, actual_qty: 56, status: 'Completed', cost_per_unit: 1060, started_at: iso(4), completed_at: iso(4, 16), notes: 'Yield below norm, see wastage log.', created_at: iso(4) },
    { id: id(), batch_no: 'BJ-2026-0919-002', product_id: p3, planned_qty: 30, actual_qty: 29, status: 'Completed', cost_per_unit: 2020, started_at: iso(6), completed_at: iso(6, 16), notes: '', created_at: iso(6) },
    { id: id(), batch_no: 'BJ-2026-0925-001', product_id: p1, planned_qty: 100, actual_qty: 0, status: 'Planned', cost_per_unit: 0, started_at: iso(0), completed_at: null, notes: 'Scheduled for this afternoon.', created_at: iso(0) },
  ];
  const purchases = [
    { id: id(), supplier_id: sup1, invoice_no: 'SUP-2291', items: [{ item_type: 'raw', ref_id: rm1, qty: 60, unit_cost: 1290 }], total: 77400, status: 'Received', date: iso(9), created_at: iso(9) },
    { id: id(), supplier_id: sup2, invoice_no: 'CB-5510', items: [{ item_type: 'pack', ref_id: pk1, qty: 1000, unit_cost: 62 }], total: 62000, status: 'Pending', date: iso(1), created_at: iso(1) },
    { id: id(), supplier_id: sup3, invoice_no: 'SGT-118', items: [{ item_type: 'raw', ref_id: rm4, qty: 25, unit_cost: 1120 }, { item_type: 'raw', ref_id: rm3, qty: 30, unit_cost: 780 }], total: 51400, status: 'Received', date: iso(14), created_at: iso(14) },
  ];
  const c1 = id(), c2 = id(), c3 = id();
  const customers = [
    { id: c1, name: 'Ocean View Hotel', phone: '031 222 4410', address: 'Beach Road, Negombo', type: 'Hotel', credit_limit: 100000, balance: 46500, created_at: iso(200) },
    { id: c2, name: 'Silver Sands Supermarket', phone: '077 887 2231', address: 'Colombo Road, Negombo', type: 'Wholesale', credit_limit: 150000, balance: 18200, created_at: iso(180) },
    { id: c3, name: 'Walk-in customers', phone: '', address: '', type: 'Retail', credit_limit: 0, balance: 0, created_at: iso(300) },
  ];
  const sales = [
    { id: id(), channel: 'Retail shop', items: [{ product_id: p1, qty: 2, price: 950 }], subtotal: 1900, discount: 0, total: 1900, payment_method: 'Cash', customer_id: c3, status: 'Paid', created_at: iso(0, 10) },
    { id: id(), channel: 'Retail shop', items: [{ product_id: p2, qty: 1, price: 1850 }, { product_id: p4, qty: 1, price: 2700 }], subtotal: 4550, discount: 100, total: 4450, payment_method: 'Card', customer_id: c3, status: 'Paid', created_at: iso(0, 12) },
    { id: id(), channel: 'Wholesale', items: [{ product_id: p1, qty: 40, price: 800 }], subtotal: 32000, discount: 0, total: 32000, payment_method: 'Credit', customer_id: c2, status: 'Paid', created_at: iso(3) },
  ];
  const wholesale_orders = [
    { id: id(), customer_id: c1, items: [{ product_id: p3, qty: 12, price: 3050 }], total: 36600, status: 'Invoiced', date: iso(12), created_at: iso(12) },
    { id: id(), customer_id: c2, items: [{ product_id: p1, qty: 60, price: 800 }], total: 48000, status: 'Delivered', date: iso(2), created_at: iso(2) },
  ];
  const returns = [
    { id: id(), sale_id: null, customer_id: c2, items: [{ product_id: p2, qty: 2, price: 1600 }], reason: 'Damaged bottle caps', amount: 3200, date: iso(5), created_at: iso(5) },
  ];
  const wastage = [
    { id: id(), production_id: production[1].id, product_id: p2, qty: 4, cost: 4240, reason: 'Boil-over during cooking', date: iso(4), created_at: iso(4) },
    { id: id(), production_id: production[0].id, product_id: p1, qty: 2, cost: 1216, reason: 'Bottle cracked in transit', date: iso(2), created_at: iso(2) },
  ];
  const expenses = [
    { id: id(), category: 'Utilities', description: 'Electricity — factory', amount: 18400, date: iso(6), method: 'Bank', created_at: iso(6) },
    { id: id(), category: 'Transport', description: 'Fuel for deliveries', amount: 9800, date: iso(0), method: 'Cash', created_at: iso(0) },
    { id: id(), category: 'Salaries', description: 'Production staff — weekly', amount: 64000, date: iso(1), method: 'Bank', created_at: iso(1) },
  ];
  const payments = [
    { id: id(), direction: 'in', customer_id: c1, amount: 20000, method: 'Bank transfer', note: 'Part payment', date: iso(3), created_at: iso(3) },
    { id: id(), direction: 'out', customer_id: null, supplier_id: sup2, amount: 15500, method: 'Cash', note: 'Bottle order part-payment', date: iso(1), created_at: iso(1) },
  ];
  const owner_id = id();
  const staff = [
    { id: owner_id, name: 'Nimal Perera', email: 'owner@baybreeze.lk', password: 'baybreeze123', role: 'Owner', active: true, created_at: iso(300) },
    { id: id(), name: 'Kasun Silva', email: 'cashier@baybreeze.lk', password: 'baybreeze123', role: 'Cashier', active: true, created_at: iso(120) },
  ];
  const inventory_adjustments = [];
  return { products, raw_materials, packaging, recipes, production, suppliers, purchases, customers, sales, wholesale_orders, returns, wastage, expenses, payments, staff, inventory_adjustments };
}
