/* BAYBREEZE Business OS — app.js
   Guards the page behind real Supabase auth, registers the offline service worker,
   then runs the dashboard/POS logic. */

let CURRENT_USER = null;

async function authGuard(){
  const {data} = await sb.auth.getSession();
  if(!data.session){ location.replace('login.html'); return false; }
  CURRENT_USER = data.session.user;
  return true;
}
sb.auth.onAuthStateChange((_event, session)=>{
  if(!session) location.replace('login.html');
});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

document.getElementById('logoutBtn')?.addEventListener('click', async ()=>{
  await sb.auth.signOut();
  location.replace('login.html');
});

/* ---------------- original dashboard / POS logic, now gated ---------------- */
(async function boot(){
  const ok = await authGuard();
  if(!ok) return;
  initApp();
})();

function initApp(){
const groups=[
 ["Overview",[["dash","◧","Dashboard"],["pos","▣","POS / Sales"]]],
 ["Make",[["products","◫","Products"],["x","☰","Recipes / BOM"],["x","⚙","Production"]]],
 ["Stock",[["inventory","▤","Inventory"],["x","◍","Raw Materials"],["x","▢","Packaging"],["purchases","⇩","Purchases"],["x","◈","Suppliers"]]],
 ["Sell",[["x","☺","Customers"],["x","▦","Wholesale"],["x","↺","Returns"],["x","✕","Wastage"]]],
 ["Money",[["x","₨","Expenses"],["x","◔","Payments"],["x","▥","Reports"],["x","△","Profit Analytics"],["x","◉","Business Intelligence"],["x","✦","AI Assistant"]]],
 ["Admin",[["x","♙","Staff"],["x","⚒","Settings"],["x","⛨","Backup & Audit"]]]
];
const nav=document.getElementById('nav');
groups.forEach(([g,items])=>{nav.insertAdjacentHTML('beforeend',`<h4>${g}</h4>`);
 items.forEach(([id,ic,name])=>nav.insertAdjacentHTML('beforeend',`<button data-v="${id}" data-n="${name}"><i>${ic}</i>${name}${name==='Dashboard'?'<em>5</em>':''}</button>`))});
const mob=[["dash","◧","Home"],["pos","▣","POS"],["inventory","▤","Stock"],["products","⚙","Make"],["x","☰","More"]];
document.getElementById('bnav').innerHTML=mob.map(([v,i,n])=>`<button data-v="${v}" data-n="${n}"><i>${i}</i>${n}</button>`).join('');
const VIEW_IDS={dash:'v-dash',pos:'v-pos',products:'v-products',inventory:'v-inventory',purchases:'v-purchases'};
const VIEW_LOADERS={products:loadProductsFull,inventory:loadInventory,purchases:loadPurchases};
function go(v,n){
 const id=VIEW_IDS[v]||'v-other';
 document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id===id));
 if(id==='v-other')document.getElementById('ot').textContent=n;
 document.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.n===n||(v!=='x'&&b.dataset.v===v)));
 document.querySelector('main').scrollTo(0,0);
 if(VIEW_LOADERS[v]) VIEW_LOADERS[v]();
}
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>go(b.dataset.v,b.dataset.n));
go('dash','Dashboard');

/* ---- Performance chart: revenue/profit & margin, with tabs + hover tooltip ---- */
const dayLbl=['11 Sep','12','13','14','15','16','17','18','19','20','21','22','23','24 Sep'];
const revenue=[58,66,62,78,70,88,64,74,82,95,78,90,84,104];
const profit =[16,19,17,24,20,27,18,22,25,30,23,28,25,33];
const margin = revenue.map((r,i)=>+((profit[i]/r)*100).toFixed(1));
const W=620,H=220,padL=40,padR=10,padT=16,padB=28,iw=W-padL-padR,ih=H-padT-padB;
const xAt=i=>padL+i*(iw/(revenue.length-1));
function smooth(pts){let d=`M${pts[0][0]},${pts[0][1]}`;for(let i=0;i<pts.length-1;i++){const[x0,y0]=pts[i],[x1,y1]=pts[i+1],mx=(x0+x1)/2,my=(y0+y1)/2;d+=` Q${x0},${y0} ${mx},${my}`;}const l=pts[pts.length-1];d+=` T${l[0]},${l[1]}`;return d;}
let curPts=[],curType='rev';
function grid(maxV,fmt){let g='';for(let k=0;k<4;k++){const y=padT+ih-(k/3)*ih;g+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#262A3D"/><text x="4" y="${y+4}">${fmt(maxV*k/3)}</text>`;}return g;}
function renderChart(type){
 curType=type;const svg=document.getElementById('chartSvg');
 if(type==='rev'){
  const maxV=Math.max(...revenue)*1.18;
  const pR=revenue.map((v,i)=>[xAt(i),padT+ih-(v/maxV)*ih]);
  const pP=profit.map((v,i)=>[xAt(i),padT+ih-(v/maxV)*ih]);
  curPts=revenue.map((v,i)=>({x:xAt(i),vals:[["Revenue",v,"var(--amber)"],["Net profit",profit[i],"var(--ink)"]],lbl:dayLbl[i]}));
  svg.innerHTML=`<defs><linearGradient id="fa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB81C" stop-opacity=".38"/><stop offset="1" stop-color="#FFB81C" stop-opacity="0"/></linearGradient></defs>
   <g>${grid(maxV,v=>'Rs. '+Math.round(v)+'k')}</g>
   <path d="${smooth(pR)} L${pR[pR.length-1][0]},${padT+ih} L${pR[0][0]},${padT+ih} Z" fill="url(#fa)"/>
   <path d="${smooth(pR)}" fill="none" stroke="#FFB81C" stroke-width="3.2" stroke-linecap="round"/>
   <path d="${smooth(pP)}" fill="none" stroke="#F4F1E8" stroke-width="2.2" stroke-dasharray="6 5" stroke-linecap="round"/>
   ${pR.map(p=>`<circle class="dotpt" cx="${p[0]}" cy="${p[1]}" r="0" fill="#FFB81C"/>`).join('')}
   <text x="${padL}" y="${H-6}">${dayLbl[0]}</text><text x="${padL+iw/2}" y="${H-6}" text-anchor="middle">${dayLbl[6]}</text><text x="${W-padR}" y="${H-6}" text-anchor="end">${dayLbl[13]}</text>`;
  document.getElementById('chartLegend').innerHTML=`<span style="color:var(--amber)">━</span> Revenue &nbsp; <span style="color:var(--ink)">┅</span> Net profit`;
 }else{
  const maxV=Math.max(...margin)*1.15,minV=Math.min(...margin)*0.9,bw=iw/margin.length*0.55;
  curPts=margin.map((v,i)=>({x:xAt(i),vals:[["Gross margin",v+'%',"var(--amber)"]],lbl:dayLbl[i]}));
  svg.innerHTML=`<g>${grid(maxV,v=>v.toFixed(0)+'%')}</g>
   ${margin.map((v,i)=>{const x=xAt(i)-bw/2,y=padT+ih-((v-0)/maxV)*ih,h=padT+ih-y;return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="url(#gb)"/>`}).join('')}
   <defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD25E"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>
   <text x="${padL}" y="${H-6}">${dayLbl[0]}</text><text x="${padL+iw/2}" y="${H-6}" text-anchor="middle">${dayLbl[6]}</text><text x="${W-padR}" y="${H-6}" text-anchor="end">${dayLbl[13]}</text>`;
  document.getElementById('chartLegend').innerHTML=`<span style="color:var(--amber)">■</span> Gross margin, day over day`;
 }
}
document.getElementById('chartTabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#chartTabs button').forEach(x=>x.classList.toggle('on',x===b));renderChart(b.dataset.c)};
const wrap=document.querySelector('.chart-wrap'),tip=document.getElementById('tip');
wrap.addEventListener('mousemove',e=>{
 if(!curPts.length)return;
 const r=wrap.getBoundingClientRect(),mx=(e.clientX-r.left)/r.width*W;
 let idx=0,best=1e9;curPts.forEach((p,i)=>{const d=Math.abs(p.x-mx);if(d<best){best=d;idx=i}});
 const p=curPts[idx];
 document.querySelectorAll('.dotpt').forEach((d,i)=>d.setAttribute('r',i===idx?5:0));
 tip.innerHTML=`<div class="tt-title">${p.lbl}</div>${p.vals.map(([n,v,c])=>`<div class="tt-row"><span class="sw" style="background:${c}"></span>${n} <b>${typeof v==='number'?'Rs. '+v+'k':v}</b></div>`).join('')}`;
 tip.style.left=(p.x/W*r.width)+'px';tip.style.top=((padT+30)/H*r.height)+'px';tip.classList.add('show');
});
wrap.addEventListener('mouseleave',()=>{tip.classList.remove('show');document.querySelectorAll('.dotpt').forEach(d=>d.setAttribute('r',0))});
renderChart('rev');

/* ---- Profit by sales channel: donut chart ---- */
const ch=[["Retail shop",42,"Rs. 412k"],["Wholesale",27,"Rs. 264k"],["WhatsApp",14,"Rs. 137k"],["Facebook",9,"Rs. 88k"],["Daraz",8,"Rs. 79k"]];
(function renderDonut(){
 const cx=80,cy=80,rad=54,sw=22,circ=2*Math.PI*rad;
 const colors=['#FFB81C','#5FD39B','#7C9BFF','#FF7A66','#C9A0FF'];
 let off=0,segs='';
 ch.forEach(([n,p],i)=>{const len=circ*(p/100);segs+=`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${colors[i%5]}" stroke-width="${sw}" stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})"/>`;off+=len;});
 document.getElementById('donut').innerHTML=`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="#22263A" stroke-width="${sw}"/>${segs}<text x="${cx}" y="${cy-3}" text-anchor="middle" font-size="19" font-weight="600" fill="var(--ink)">Rs. 980k</text><text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="9.5" fill="var(--mute)">total profit</text>`;
 document.getElementById('legend').innerHTML=ch.map(([n,p,v],i)=>`<div class="row"><span class="sw" style="background:${colors[i%5]}"></span>${n} <small>${p}%</small><b>${v}</b></div>`).join('');
})();

let P=[]; // [name, price, sku, stock, min_price, id] — loaded from Supabase
let cart=[];
async function loadProducts(){
 const {data, error} = await sb.from('products').select('id,name,price,sku,stock,min_price,active').eq('active',true).order('name');
 if(error){ document.getElementById('tiles').innerHTML=`<p style="color:var(--mute)">Could not load products: ${error.message}</p>`; return; }
 P = (data||[]).map(p=>[p.name, Number(p.price), p.sku, p.stock, Number(p.min_price ?? p.price), p.id]);
 document.getElementById('tiles').innerHTML=P.map((p,i)=>`<button class="tile" data-i="${i}"><small>${p[2]}</small><b>${p[0]}</b><small>${p[3]} in stock</small><span class="p">Rs. ${p[1].toLocaleString()}</span></button>`).join('');
 draw();
}
function draw(){
 let s=0;
 document.getElementById('cart').innerHTML=cart.map(([i,q],k)=>{s+=P[i][1]*q;return `<div class="line"><div><b>${P[i][0]}</b><br><small>Rs. ${P[i][1].toLocaleString()}</small></div><div class="qty"><button data-k="${k}" data-d="-1" aria-label="Decrease">−</button><b>${q}</b><button data-k="${k}" data-d="1" aria-label="Increase">+</button></div></div>`}).join('')||'<p style="color:#6B6F85;padding:14px 0">Tap a product to start a sale.</p>';
 document.getElementById('sub').textContent=document.getElementById('tot').textContent='Rs. '+s.toLocaleString();
 document.getElementById('warn').innerHTML=cart.some(([i])=>P[i][1]<P[i][4])?'<div class="warn">A price is below the approved minimum. A manager must approve it.</div>':'';
}
document.getElementById('tiles').onclick=e=>{const t=e.target.closest('.tile');if(!t)return;const i=+t.dataset.i,f=cart.find(c=>c[0]===i);f?f[1]++:cart.push([i,1]);draw()};
document.getElementById('cart').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;const c=cart[+b.dataset.k];c[1]+=+b.dataset.d;if(c[1]<1)cart.splice(+b.dataset.k,1);draw()};
loadProducts();

document.getElementById('payBtn')?.addEventListener('click', async ()=>{
 if(!cart.length) return;
 const payBtn=document.getElementById('payBtn');
 const items=cart.map(([i,q])=>({product_id:P[i][5], product_name:P[i][0], unit_price:P[i][1], qty:q, line_total:P[i][1]*q}));
 const total=items.reduce((a,it)=>a+it.line_total,0);
 const method=document.querySelector('.pay .on')?.textContent.trim()||'Cash';
 payBtn.disabled=true; payBtn.textContent='Saving…';
 const {data:sale, error} = await sb.from('sales').insert({cashier_id:CURRENT_USER.id, subtotal:total, discount:0, total, payment_method:method}).select().single();
 if(error){ alert('Could not save sale: '+error.message); payBtn.disabled=false; payBtn.textContent='Take payment'; return; }
 const rows=items.map(it=>({...it, sale_id:sale.id}));
 const {error:itemErr} = await sb.from('sale_items').insert(rows);
 if(itemErr){ alert('Sale saved but items failed: '+itemErr.message); }
 else{ cart=[]; draw(); payBtn.textContent='Saved ✓'; setTimeout(()=>{payBtn.textContent='Take payment';payBtn.disabled=false},1200); }
});
document.querySelectorAll('.pay button').forEach(b=>b.onclick=()=>document.querySelectorAll('.pay button').forEach(x=>x.classList.toggle('on',x===b)));

const A={
 "Why did cost go up?":[["Fact","Dried fish went from Rs. 1,190/kg to Rs. 1,290/kg (+8.4%) on invoice SUP-2291."],["Calculation","That adds about Rs. 38 to each Fish Jaadi 250g unit."],["Possible explanation","Seasonal supply. Nothing in the system confirms it."],["User decision","Change supplier, raise the price, or accept the lower margin."]],
 "Top margin products":[["Fact","Mixed Seafood Jaadi 500g leads at 43%. Premium 1kg follows at 41%."],["Trend","Fish Jaadi 250g fell from 41% to 36% this month."]],
 "Wastage this month":[["Calculation","Wastage cost Rs. 18,420, or 2.9% of production cost."],["Insufficient data","Reasons are missing for 4 of 11 wastage entries."]]
};
const cls={Fact:"t-g",Calculation:"t-b",Trend:"t-a","Possible explanation":"t-a","User decision":"t-r","Insufficient data":"t-r"};
document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{document.getElementById('ans').innerHTML=A[b.textContent].map(([t,x])=>`<p><span class="tag ${cls[t]}">${t}</span> ${x}</p>`).join('')});

/* =====================================================================
   PRODUCTS — full CRUD (products table, extended with category/cost_price/
   unit/reorder_level/active — see supabase_migration_products_inventory_purchases.sql)
   ===================================================================== */
let productsFull=[]; // full row objects {id,name,sku,category,unit,price,cost_price,min_price,stock,reorder_level,active}
let productsFilter={q:'',cat:'all'};

async function loadProductsFull(){
 const body=document.getElementById('productsBody');
 if(!body) return;
 body.innerHTML=`<tr><td colspan="8" style="color:var(--mute);padding:18px 0">Loading products…</td></tr>`;
 const {data,error}=await sb.from('products').select('*').order('name');
 if(error){ body.innerHTML=`<tr><td colspan="8" style="color:var(--red);padding:18px 0">Could not load products: ${error.message}</td></tr>`; return; }
 productsFull=data||[];
 renderProductCategoryFilter();
 renderProductsTable();
}
function renderProductCategoryFilter(){
 const sel=document.getElementById('prodCatFilter'); if(!sel) return;
 const cats=[...new Set(productsFull.map(p=>p.category||'Other'))].sort();
 const cur=sel.value||'all';
 sel.innerHTML=`<option value="all">All categories</option>`+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
 sel.value=cats.includes(cur)?cur:'all';
}
function renderProductsTable(){
 const body=document.getElementById('productsBody'); if(!body) return;
 const q=productsFilter.q.toLowerCase();
 const rows=productsFull.filter(p=>
   (productsFilter.cat==='all'||((p.category||'Other')===productsFilter.cat)) &&
   (!q || p.name.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q))
 );
 document.getElementById('prodCount').textContent=`${rows.length} of ${productsFull.length} products`;
 body.innerHTML = rows.length? rows.map(p=>{
   const low = Number(p.stock)<=Number(p.reorder_level||0);
   const out = Number(p.stock)<=0;
   const statusTag = out?'<span class="tag t-r">Out of stock</span>':low?'<span class="tag t-a">Low stock</span>':'<span class="tag t-g">In stock</span>';
   const activeTag = p.active?'<span class="tag t-g">Active</span>':'<span class="tag t-r">Inactive</span>';
   return `<tr>
     <td><small>${p.sku||'—'}</small></td>
     <td><b>${p.name}</b></td>
     <td>${p.category||'Other'}</td>
     <td class="r">Rs. ${Number(p.cost_price||0).toLocaleString()}</td>
     <td class="r">Rs. ${Number(p.price||0).toLocaleString()}</td>
     <td class="r">${p.stock} ${p.unit||'unit'}</td>
     <td class="r">${statusTag}</td>
     <td class="r">${activeTag} <button class="go" data-edit="${p.id}" style="margin-left:6px">Edit</button> <button class="go" data-del="${p.id}" style="background:#3A1E1A;color:var(--red)">Del</button></td>
   </tr>`;
 }).join('') : `<tr><td colspan="8" style="color:var(--mute);padding:18px 0;text-align:center">No products match.</td></tr>`;
}
function openProductModal(id){
 const p = id ? productsFull.find(x=>x.id===id) : null;
 document.getElementById('pmTitle').textContent = p ? 'Edit product' : 'Add product';
 document.getElementById('pmId').value = p?p.id:'';
 document.getElementById('pmName').value = p?p.name:'';
 document.getElementById('pmSku').value = p?(p.sku||''):'';
 document.getElementById('pmCategory').value = p?(p.category||''):'';
 document.getElementById('pmUnit').value = p?(p.unit||'unit'):'unit';
 document.getElementById('pmCost').value = p?p.cost_price:0;
 document.getElementById('pmPrice').value = p?p.price:0;
 document.getElementById('pmMinPrice').value = p?(p.min_price??p.price??0):0;
 document.getElementById('pmStock').value = p?p.stock:0;
 document.getElementById('pmReorder').value = p?(p.reorder_level||0):0;
 document.getElementById('pmActive').checked = p?!!p.active:true;
 document.getElementById('productModal').classList.add('show');
}
function closeProductModal(){ document.getElementById('productModal').classList.remove('show'); }
async function saveProduct(){
 const id=document.getElementById('pmId').value;
 const payload={
   name:document.getElementById('pmName').value.trim(),
   sku:document.getElementById('pmSku').value.trim(),
   category:document.getElementById('pmCategory').value.trim()||'Other',
   unit:document.getElementById('pmUnit').value.trim()||'unit',
   cost_price:+document.getElementById('pmCost').value||0,
   price:+document.getElementById('pmPrice').value||0,
   min_price:+document.getElementById('pmMinPrice').value||0,
   stock:+document.getElementById('pmStock').value||0,
   reorder_level:+document.getElementById('pmReorder').value||0,
   active:document.getElementById('pmActive').checked,
   updated_at:new Date().toISOString()
 };
 if(!payload.name){ alert('Product name is required.'); return; }
 const btn=document.getElementById('pmSaveBtn'); btn.disabled=true; btn.textContent='Saving…';
 const {error} = id ? await sb.from('products').update(payload).eq('id',id) : await sb.from('products').insert(payload);
 btn.disabled=false; btn.textContent='Save product';
 if(error){ alert('Could not save product: '+error.message); return; }
 closeProductModal();
 loadProductsFull();
}
async function deleteProductRow(id){
 if(!confirm('Delete this product? This cannot be undone.')) return;
 const {error}=await sb.from('products').delete().eq('id',id);
 if(error){ alert('Could not delete: '+error.message); return; }
 loadProductsFull();
}
document.getElementById('addProductBtn')?.addEventListener('click',()=>openProductModal(null));
document.getElementById('pmCancelBtn')?.addEventListener('click',closeProductModal);
document.getElementById('pmSaveBtn')?.addEventListener('click',saveProduct);
document.getElementById('productsBody')?.addEventListener('click',e=>{
 const edit=e.target.closest('[data-edit]'); if(edit){ openProductModal(edit.dataset.edit); return; }
 const del=e.target.closest('[data-del]'); if(del){ deleteProductRow(del.dataset.del); return; }
});
document.getElementById('prodSearch')?.addEventListener('input',e=>{ productsFilter.q=e.target.value; renderProductsTable(); });
document.getElementById('prodCatFilter')?.addEventListener('change',e=>{ productsFilter.cat=e.target.value; renderProductsTable(); });

/* =====================================================================
   INVENTORY — stock levels + adjustments + movement ledger
   ===================================================================== */
async function loadInventory(){
 const body=document.getElementById('invBody'); if(!body) return;
 body.innerHTML=`<tr><td colspan="6" style="color:var(--mute);padding:18px 0">Loading…</td></tr>`;
 const {data,error}=await sb.from('products').select('*').order('name');
 if(error){ body.innerHTML=`<tr><td colspan="6" style="color:var(--red)">Could not load: ${error.message}</td></tr>`; return; }
 productsFull=data||[];
 const low=productsFull.filter(p=>Number(p.stock)<=Number(p.reorder_level||0) && Number(p.stock)>0).length;
 const out=productsFull.filter(p=>Number(p.stock)<=0).length;
 const value=productsFull.reduce((s,p)=>s+Number(p.stock)*Number(p.cost_price||0),0);
 document.getElementById('invStatValue').textContent='Rs. '+Math.round(value).toLocaleString();
 document.getElementById('invStatLow').textContent=low;
 document.getElementById('invStatOut').textContent=out;
 document.getElementById('invStatSkus').textContent=productsFull.length;
 body.innerHTML = productsFull.length? productsFull.map(p=>{
  const s=Number(p.stock), r=Number(p.reorder_level||0);
  const tag = s<=0?'<span class="tag t-r">Out of stock</span>':s<=r?'<span class="tag t-a">Low</span>':'<span class="tag t-g">OK</span>';
  return `<tr>
    <td><b>${p.name}</b><br><small style="color:var(--mute)">${p.sku||''}</small></td>
    <td>${p.category||'Other'}</td>
    <td class="r">${s} ${p.unit||'unit'}</td>
    <td class="r">${r} ${p.unit||'unit'}</td>
    <td class="r">${tag}</td>
    <td class="r"><button class="go" data-adj="${p.id}">Adjust</button></td>
  </tr>`;
 }).join('') : `<tr><td colspan="6" style="color:var(--mute);padding:18px 0;text-align:center">No products yet.</td></tr>`;
 populateStockAdjustProductSelect();
 loadStockMovements();
}
function populateStockAdjustProductSelect(){
 const sel=document.getElementById('saProduct'); if(!sel) return;
 const cur=sel.value;
 sel.innerHTML=productsFull.map(p=>`<option value="${p.id}">${p.name} (${p.stock} ${p.unit||'unit'})</option>`).join('');
 if(cur) sel.value=cur;
}
async function loadStockMovements(){
 const wrap=document.getElementById('movBody'); if(!wrap) return;
 const {data,error}=await sb.from('stock_movements').select('*').order('created_at',{ascending:false}).limit(25);
 if(error){ wrap.innerHTML=`<tr><td colspan="5" style="color:var(--red)">${error.message}</td></tr>`; return; }
 const typeLbl={purchase_in:['Purchase in','t-g'],sale_out:['Sale','t-b'],adjustment:['Adjustment','t-a'],wastage:['Wastage','t-r']};
 wrap.innerHTML=(data&&data.length)? data.map(m=>{
  const [lbl,cls]=typeLbl[m.movement_type]||[m.movement_type,'t-a'];
  const d=new Date(m.created_at);
  return `<tr>
    <td><small>${d.toLocaleDateString()} ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></td>
    <td>${m.product_name}</td>
    <td><span class="tag ${cls}">${lbl}</span></td>
    <td class="r">${m.qty}</td>
    <td>${m.note||''}</td>
  </tr>`;
 }).join('') : `<tr><td colspan="5" style="color:var(--mute);padding:14px 0;text-align:center">No stock movements yet.</td></tr>`;
}
function openStockAdjustModal(productId){
 populateStockAdjustProductSelect();
 if(productId) document.getElementById('saProduct').value=productId;
 document.getElementById('saType').value='adjustment';
 document.getElementById('saQty').value='';
 document.getElementById('saNote').value='';
 document.getElementById('stockAdjustModal').classList.add('show');
}
function closeStockAdjustModal(){ document.getElementById('stockAdjustModal').classList.remove('show'); }
async function saveStockAdjustment(){
 const productId=document.getElementById('saProduct').value;
 const type=document.getElementById('saType').value;
 const qty=+document.getElementById('saQty').value;
 const note=document.getElementById('saNote').value.trim();
 if(!productId||!qty||qty<=0){ alert('Pick a product and enter a quantity greater than 0.'); return; }
 const p=productsFull.find(x=>x.id===productId);
 if(!p){ alert('Product not found.'); return; }
 const delta = (type==='purchase_in') ? qty : -qty; // stock_in adds, everything else (adjustment-out/sale/wastage) subtracts
 const newStock = Number(p.stock)+delta;
 const btn=document.getElementById('saSaveBtn'); btn.disabled=true; btn.textContent='Saving…';
 const {error:updErr}=await sb.from('products').update({stock:newStock,updated_at:new Date().toISOString()}).eq('id',productId);
 if(updErr){ btn.disabled=false; btn.textContent='Save'; alert('Could not update stock: '+updErr.message); return; }
 const {error:movErr}=await sb.from('stock_movements').insert({
   product_id:productId, product_name:p.name, movement_type:type, qty:qty, note:note||null, created_by:CURRENT_USER.id
 });
 btn.disabled=false; btn.textContent='Save';
 if(movErr){ alert('Stock updated but movement log failed: '+movErr.message); }
 closeStockAdjustModal();
 loadInventory();
}
document.getElementById('invBody')?.addEventListener('click',e=>{
 const b=e.target.closest('[data-adj]'); if(b) openStockAdjustModal(b.dataset.adj);
});
document.getElementById('adjustStockBtn')?.addEventListener('click',()=>openStockAdjustModal(null));
document.getElementById('saCancelBtn')?.addEventListener('click',closeStockAdjustModal);
document.getElementById('saSaveBtn')?.addEventListener('click',saveStockAdjustment);
document.getElementById('saType')?.addEventListener('change',e=>{
 document.getElementById('saTypeHint').textContent = e.target.value==='purchase_in'
   ? 'Adds to stock.' : 'Removes from stock.';
});

/* =====================================================================
   PURCHASES — purchase orders with multiple line items, restocks products
   ===================================================================== */
let purchaseItems=[]; // [{product_id,product_name,qty,unit_cost}]
let purchasesCache=[];

async function loadPurchases(){
 const body=document.getElementById('purchBody'); if(!body) return;
 body.innerHTML=`<tr><td colspan="5" style="color:var(--mute);padding:18px 0">Loading…</td></tr>`;
 const {data,error}=await sb.from('purchases').select('*').order('purchase_date',{ascending:false}).order('created_at',{ascending:false}).limit(50);
 if(error){ body.innerHTML=`<tr><td colspan="5" style="color:var(--red)">${error.message}</td></tr>`; return; }
 purchasesCache=data||[];
 const monthTotal=purchasesCache.filter(p=>p.purchase_date && p.purchase_date.slice(0,7)===new Date().toISOString().slice(0,7)).reduce((s,p)=>s+Number(p.total||0),0);
 const statEl=document.getElementById('purchStatMonth'); if(statEl) statEl.textContent='Rs. '+Math.round(monthTotal).toLocaleString();
 const countEl=document.getElementById('purchStatCount'); if(countEl) countEl.textContent=purchasesCache.length;
 body.innerHTML = purchasesCache.length? purchasesCache.map(p=>`<tr>
   <td>${p.purchase_date}</td>
   <td><b>${p.supplier_name}</b></td>
   <td>${p.notes||''}</td>
   <td class="r">Rs. ${Number(p.total).toLocaleString()}</td>
   <td class="r"><button class="go" data-view="${p.id}">View</button> <button class="go" data-delp="${p.id}" style="background:#3A1E1A;color:var(--red)">Del</button></td>
 </tr>`).join('') : `<tr><td colspan="5" style="color:var(--mute);padding:18px 0;text-align:center">No purchases logged yet.</td></tr>`;
}
function openPurchaseModal(){
 purchaseItems=[];
 document.getElementById('pSupplier').value='';
 document.getElementById('pDate').value=new Date().toISOString().slice(0,10);
 document.getElementById('pNotes').value='';
 document.getElementById('pItemProduct').innerHTML=productsFull.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
 document.getElementById('pItemQty').value=1;
 document.getElementById('pItemCost').value=0;
 renderPurchaseItems();
 document.getElementById('purchaseModal').classList.add('show');
}
function closePurchaseModal(){ document.getElementById('purchaseModal').classList.remove('show'); }
function addPurchaseItemRow(){
 const pid=document.getElementById('pItemProduct').value;
 const p=productsFull.find(x=>x.id===pid);
 const qty=+document.getElementById('pItemQty').value;
 const cost=+document.getElementById('pItemCost').value;
 if(!p||!qty||qty<=0){ alert('Pick a product and a quantity greater than 0.'); return; }
 purchaseItems.push({product_id:p.id,product_name:p.name,qty,unit_cost:cost||0});
 document.getElementById('pItemQty').value=1;
 renderPurchaseItems();
}
function removePurchaseItemRow(i){ purchaseItems.splice(i,1); renderPurchaseItems(); }
function renderPurchaseItems(){
 const wrap=document.getElementById('pItemsList');
 let total=0;
 wrap.innerHTML = purchaseItems.length? purchaseItems.map((it,i)=>{
  const lt=it.qty*it.unit_cost; total+=lt;
  return `<div class="line"><div><b>${it.product_name}</b><br><small>${it.qty} × Rs. ${it.unit_cost.toLocaleString()}</small></div><div style="text-align:right"><b>Rs. ${lt.toLocaleString()}</b><br><button class="go" data-rm="${i}" style="background:#3A1E1A;color:var(--red);margin-top:4px">Remove</button></div></div>`;
 }).join('') : '<p style="color:var(--mute);padding:10px 0">No items added yet.</p>';
 document.getElementById('pTotal').textContent='Rs. '+total.toLocaleString();
}
document.getElementById('pItemsList')?.addEventListener('click',e=>{
 const b=e.target.closest('[data-rm]'); if(b) removePurchaseItemRow(+b.dataset.rm);
});
async function savePurchase(){
 const supplier=document.getElementById('pSupplier').value.trim();
 const date=document.getElementById('pDate').value;
 const notes=document.getElementById('pNotes').value.trim();
 if(!supplier){ alert('Supplier name is required.'); return; }
 if(!purchaseItems.length){ alert('Add at least one item.'); return; }
 const total=purchaseItems.reduce((s,it)=>s+it.qty*it.unit_cost,0);
 const btn=document.getElementById('pSaveBtn'); btn.disabled=true; btn.textContent='Saving…';
 const {data:purchase,error}=await sb.from('purchases').insert({supplier_name:supplier,purchase_date:date,notes:notes||null,total,created_by:CURRENT_USER.id}).select().single();
 if(error){ btn.disabled=false; btn.textContent='Save purchase'; alert('Could not save purchase: '+error.message); return; }
 const rows=purchaseItems.map(it=>({purchase_id:purchase.id,product_id:it.product_id,product_name:it.product_name,qty:it.qty,unit_cost:it.unit_cost,line_total:it.qty*it.unit_cost}));
 const {error:itemErr}=await sb.from('purchase_items').insert(rows);
 if(itemErr){ alert('Purchase saved but items failed: '+itemErr.message); }
 // restock each product + log stock movement + update cost_price to latest
 for(const it of purchaseItems){
  const p=productsFull.find(x=>x.id===it.product_id);
  const newStock=(p?Number(p.stock):0)+it.qty;
  await sb.from('products').update({stock:newStock,cost_price:it.unit_cost,updated_at:new Date().toISOString()}).eq('id',it.product_id);
  await sb.from('stock_movements').insert({product_id:it.product_id,product_name:it.product_name,movement_type:'purchase_in',qty:it.qty,note:'Purchase from '+supplier,ref_id:purchase.id,created_by:CURRENT_USER.id});
 }
 btn.disabled=false; btn.textContent='Save purchase';
 closePurchaseModal();
 loadPurchases();
 loadProductsFull();
}
async function viewPurchase(id){
 const {data,error}=await sb.from('purchase_items').select('*').eq('purchase_id',id);
 const p=purchasesCache.find(x=>x.id===id);
 if(error||!p){ alert('Could not load purchase.'); return; }
 const lines=(data||[]).map(it=>`${it.product_name}  —  ${it.qty} × Rs. ${Number(it.unit_cost).toLocaleString()} = Rs. ${Number(it.line_total).toLocaleString()}`).join('\n');
 alert(`Purchase from ${p.supplier_name} (${p.purchase_date})\n\n${lines}\n\nTotal: Rs. ${Number(p.total).toLocaleString()}`);
}
async function deletePurchaseRow(id){
 if(!confirm('Delete this purchase? Stock already added will NOT be automatically reversed.')) return;
 const {error}=await sb.from('purchases').delete().eq('id',id);
 if(error){ alert('Could not delete: '+error.message); return; }
 loadPurchases();
}
document.getElementById('newPurchaseBtn')?.addEventListener('click',openPurchaseModal);
document.getElementById('pCancelBtn')?.addEventListener('click',closePurchaseModal);
document.getElementById('pAddItemBtn')?.addEventListener('click',addPurchaseItemRow);
document.getElementById('pSaveBtn')?.addEventListener('click',savePurchase);
document.getElementById('purchBody')?.addEventListener('click',e=>{
 const v=e.target.closest('[data-view]'); if(v){ viewPurchase(v.dataset.view); return; }
 const d=e.target.closest('[data-delp]'); if(d){ deletePurchaseRow(d.dataset.delp); return; }
});

} // end initApp
