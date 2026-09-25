/* BAYBREEZE Business OS — app.js
   Guards the page behind login.html, registers the offline service worker,
   then runs the dashboard/POS logic. */

(function authGuard(){
  if(sessionStorage.getItem('bb_auth')!=='1'){
    location.replace('login.html');
  }
})();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

document.getElementById('logoutBtn')?.addEventListener('click',()=>{
  sessionStorage.removeItem('bb_auth');
  location.replace('login.html');
});

/* ---------------- original dashboard / POS logic ---------------- */
const groups=[
 ["Overview",[["dash","◧","Dashboard"],["pos","▣","POS / Sales"]]],
 ["Make",[["x","◫","Products"],["x","☰","Recipes / BOM"],["x","⚙","Production"]]],
 ["Stock",[["x","▤","Inventory"],["x","◍","Raw Materials"],["x","▢","Packaging"],["x","⇩","Purchases"],["x","◈","Suppliers"]]],
 ["Sell",[["x","☺","Customers"],["x","▦","Wholesale"],["x","↺","Returns"],["x","✕","Wastage"]]],
 ["Money",[["x","₨","Expenses"],["x","◔","Payments"],["x","▥","Reports"],["x","△","Profit Analytics"],["x","◉","Business Intelligence"],["x","✦","AI Assistant"]]],
 ["Admin",[["x","♙","Staff"],["x","⚒","Settings"],["x","⛨","Backup & Audit"]]]
];
const nav=document.getElementById('nav');
groups.forEach(([g,items])=>{nav.insertAdjacentHTML('beforeend',`<h4>${g}</h4>`);
 items.forEach(([id,ic,name])=>nav.insertAdjacentHTML('beforeend',`<button data-v="${id}" data-n="${name}"><i>${ic}</i>${name}${name==='Dashboard'?'<em>5</em>':''}</button>`))});
const mob=[["dash","◧","Home"],["pos","▣","POS"],["x","▤","Stock"],["x","⚙","Make"],["x","☰","More"]];
document.getElementById('bnav').innerHTML=mob.map(([v,i,n])=>`<button data-v="${v}" data-n="${n}"><i>${i}</i>${n}</button>`).join('');
function go(v,n){
 const id=v==='dash'?'v-dash':v==='pos'?'v-pos':'v-other';
 document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id===id));
 if(id==='v-other')document.getElementById('ot').textContent=n;
 document.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.n===n||(v!=='x'&&b.dataset.v===v)));
 document.querySelector('main').scrollTo(0,0);
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

const P=[["Fish Jaadi 250g",950,"FJ-250",42,950],["Mixed Seafood Jaadi 500g",1850,"MS-500",18,1850],["Premium Fish Jaadi 1kg",3400,"PF-1000",9,3200],["Fish Jaadi 250g (wholesale)",820,"FJ-250W",120,800]];
const cart=[[0,2],[1,1]];
document.getElementById('tiles').innerHTML=P.map((p,i)=>`<button class="tile" data-i="${i}"><small>${p[2]}</small><b>${p[0]}</b><small>${p[3]} in stock</small><span class="p">Rs. ${p[1].toLocaleString()}</span></button>`).join('');
function draw(){
 let s=0;
 document.getElementById('cart').innerHTML=cart.map(([i,q],k)=>{s+=P[i][1]*q;return `<div class="line"><div><b>${P[i][0]}</b><br><small>Rs. ${P[i][1].toLocaleString()}</small></div><div class="qty"><button data-k="${k}" data-d="-1" aria-label="Decrease">−</button><b>${q}</b><button data-k="${k}" data-d="1" aria-label="Increase">+</button></div></div>`}).join('')||'<p style="color:#6B6F85;padding:14px 0">Tap a product to start a sale.</p>';
 document.getElementById('sub').textContent=document.getElementById('tot').textContent='Rs. '+s.toLocaleString();
 document.getElementById('warn').innerHTML=cart.some(([i])=>P[i][1]<P[i][4])?'<div class="warn">A price is below the approved minimum. A manager must approve it.</div>':'';
}
document.getElementById('tiles').onclick=e=>{const t=e.target.closest('.tile');if(!t)return;const i=+t.dataset.i,f=cart.find(c=>c[0]===i);f?f[1]++:cart.push([i,1]);draw()};
document.getElementById('cart').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;const c=cart[+b.dataset.k];c[1]+=+b.dataset.d;if(c[1]<1)cart.splice(+b.dataset.k,1);draw()};
draw();

const A={
 "Why did cost go up?":[["Fact","Dried fish went from Rs. 1,190/kg to Rs. 1,290/kg (+8.4%) on invoice SUP-2291."],["Calculation","That adds about Rs. 38 to each Fish Jaadi 250g unit."],["Possible explanation","Seasonal supply. Nothing in the system confirms it."],["User decision","Change supplier, raise the price, or accept the lower margin."]],
 "Top margin products":[["Fact","Mixed Seafood Jaadi 500g leads at 43%. Premium 1kg follows at 41%."],["Trend","Fish Jaadi 250g fell from 41% to 36% this month."]],
 "Wastage this month":[["Calculation","Wastage cost Rs. 18,420, or 2.9% of production cost."],["Insufficient data","Reasons are missing for 4 of 11 wastage entries."]]
};
const cls={Fact:"t-g",Calculation:"t-b",Trend:"t-a","Possible explanation":"t-a","User decision":"t-r","Insufficient data":"t-r"};
document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{document.getElementById('ans').innerHTML=A[b.textContent].map(([t,x])=>`<p><span class="tag ${cls[t]}">${t}</span> ${x}</p>`).join('')});
