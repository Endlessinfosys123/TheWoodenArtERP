(() => {
"use strict";
/* ---------- constants ---------- */
const STATES = ["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];
const MATS = ["Acrylic","MDF","Corian","MS (Mild Steel)","SS (Stainless Steel)","ACP","WPC","Plywood","Aluminium","Brass","Other"];

const DEFAULT_MAT_PRICING = [
  { material: "Acrylic", thick: 2, rate: 80 },
  { material: "Acrylic", thick: 3, rate: 120 },
  { material: "Acrylic", thick: 5, rate: 200 },
  { material: "Acrylic", thick: 8, rate: 320 },
  { material: "Acrylic", thick: 10, rate: 420 },
  { material: "MDF", thick: 6, rate: 35 },
  { material: "MDF", thick: 8, rate: 45 },
  { material: "MDF", thick: 12, rate: 65 },
  { material: "MDF", thick: 18, rate: 95 },
  { material: "Corian", thick: 6, rate: 250 },
  { material: "Corian", thick: 12, rate: 450 },
  { material: "ACP", thick: 3, rate: 45 },
  { material: "ACP", thick: 4, rate: 60 },
  { material: "WPC", thick: 5, rate: 40 },
  { material: "WPC", thick: 12, rate: 85 },
  { material: "WPC", thick: 18, rate: 130 },
  { material: "Plywood", thick: 6, rate: 45 },
  { material: "Plywood", thick: 12, rate: 75 },
  { material: "Plywood", thick: 18, rate: 110 },
  { material: "MS (Mild Steel)", thick: 1, rate: 90 },
  { material: "MS (Mild Steel)", thick: 2, rate: 160 },
  { material: "MS (Mild Steel)", thick: 3, rate: 240 },
  { material: "SS (Stainless Steel)", thick: 1, rate: 180 },
  { material: "SS (Stainless Steel)", thick: 2, rate: 320 },
  { material: "Aluminium", thick: 1, rate: 120 },
  { material: "Aluminium", thick: 2, rate: 220 },
  { material: "Brass", thick: 1, rate: 450 },
  { material: "Brass", thick: 2, rate: 850 }
];

function getMatPricingList(){
  const s = S.settings || {};
  if (Array.isArray(s.matPricing) && s.matPricing.length) return s.matPricing;
  if (s.matRates && Object.keys(s.matRates).length) {
    const list = [];
    Object.entries(s.matRates).forEach(([m, r]) => {
      if (r !== "" && r !== null && r !== undefined) {
        list.push({ material: m, thick: "", rate: +r });
      }
    });
    DEFAULT_MAT_PRICING.forEach(d => {
      if (!list.some(x => x.material.toLowerCase() === d.material.toLowerCase())) {
        list.push({ ...d });
      }
    });
    return list;
  }
  return DEFAULT_MAT_PRICING;
}

function getAllConfiguredMaterials(){
  const list = getMatPricingList();
  const names = new Set(MATS.filter(m=>m!=="Other"));
  list.forEach(x => { if(x.material && x.material.trim()) names.add(x.material.trim()); });
  (S.materials||[]).forEach(m => { if(m.name && m.name.trim()) names.add(m.name.trim()); });
  return [...names];
}

function getMaterialThicknesses(material){
  if(!material) return [];
  const list = getMatPricingList();
  const matNorm = material.trim().toLowerCase();
  return list
    .filter(x => (x.material||"").trim().toLowerCase() === matNorm && x.thick !== "" && x.thick !== null && x.thick !== undefined)
    .sort((a,b) => (parseFloat(a.thick)||0) - (parseFloat(b.thick)||0));
}

function getMaterialRate(material, thick){
  if(!material) return null;
  const list = getMatPricingList();
  const matNorm = material.trim().toLowerCase();
  const thNum = parseFloat(thick);
  
  if(!isNaN(thNum)){
    const exact = list.find(x => (x.material||"").trim().toLowerCase() === matNorm && parseFloat(x.thick) === thNum);
    if(exact && exact.rate !== undefined && exact.rate !== "") return +exact.rate;
  }
  
  const noThick = list.find(x => (x.material||"").trim().toLowerCase() === matNorm && (!x.thick || parseFloat(x.thick) === 0));
  if(noThick && noThick.rate !== undefined && noThick.rate !== "") return +noThick.rate;

  const oldRate = (S.settings?.matRates || {})[material];
  if(oldRate !== undefined && oldRate !== "") return +oldRate;

  if(isNaN(thNum)){
    const firstWithRate = list.find(x => (x.material||"").trim().toLowerCase() === matNorm && x.rate);
    if(firstWithRate) return +firstWithRate.rate;
  }

  return null;
}

function onMaterialOrThickChange(itemRowElem, changedField){
  const r = itemRowElem;
  if (!r) return;
  const matIn = $("[name=material]", r);
  const thickIn = $("[name=thick]", r);
  const rateIn = $("[name=rate]", r);
  const matVal = matIn ? matIn.value : "";
  let thickVal = thickIn ? thickIn.value.trim() : "";

  const m = S.materials.find(x => x.name === matVal);
  if(m && changedField === "material"){
    if(m.saleRate && rateIn && !rateIn.value) rateIn.value = m.saleRate;
    if(m.thick && thickIn && !thickIn.value) { thickIn.value = m.thick; thickVal = String(m.thick); }
    if(m.hsn && $("[name=hsn]", r) && !$("[name=hsn]", r).value) $("[name=hsn]", r).value = m.hsn;
    const v = (m.unit||"").toLowerCase().startsWith("sq") ? "sqft" : "unit";
    const b = $(`[data-act=pricing][data-v=${v}]`, r);
    if(b && r.dataset.pricing !== v) b.click();
    if(v === "unit" && m.unit && $("[name=unit]", r)) $("[name=unit]", r).value = m.unit;
  }

  const thList = matVal ? getMaterialThicknesses(matVal) : [];
  const thWrap = $("[data-role=thickHints]", r);
  if(thWrap){
    if(thList.length){
      const thChipsHtml = thList.map(t => {
        const isActive = thickVal !== "" && parseFloat(thickVal) === parseFloat(t.thick);
        return `<button type="button" class="th-chip ${isActive ? 'active' : ''}" data-act="pickThick" data-thick="${esc(t.thick)}" data-rate="${esc(t.rate)}">${esc(t.thick)}mm <span class="rate-badge">₹${esc(t.rate)}</span></button>`;
      }).join("");
      thWrap.innerHTML = `<span class="muted" style="font-size:11px;font-weight:600;display:flex;align-items:center;margin-right:2px">Thickness:</span>` + thChipsHtml;
      thWrap.hidden = false;
    } else {
      thWrap.innerHTML = "";
      thWrap.hidden = true;
    }
  }

  if(changedField === "material"){
    if(thickVal !== ""){
      const rByTh = getMaterialRate(matVal, thickVal);
      if(rByTh !== null && rateIn) rateIn.value = rByTh;
    } else if(thList.length > 0 && !m){
      if(thickIn) { thickIn.value = thList[0].thick; thickVal = String(thList[0].thick); }
      if(rateIn) rateIn.value = thList[0].rate;
      if(thWrap) $$(".th-chip", thWrap).forEach((c, idx) => c.classList.toggle("active", idx === 0));
    } else {
      const defRate = getMaterialRate(matVal, "");
      if(defRate !== null && rateIn) rateIn.value = defRate;
    }
  } else if(changedField === "thick"){
    if(matVal){
      const rByTh = getMaterialRate(matVal, thickVal);
      if(rByTh !== null && rateIn) rateIn.value = rByTh;
      if(thWrap){
        $$(".th-chip", thWrap).forEach(c => {
          const isActive = thickVal !== "" && parseFloat(thickVal) === parseFloat(c.dataset.thick);
          c.classList.toggle("active", isActive);
        });
      }
    }
  }
}

const DIMS = { in:{label:"inch", f:1/144}, ft:{label:"feet", f:1}, mm:{label:"mm", f:1/92903.04} };
const UNITS = ["Sq.ft","Nos","Pcs","Kg","g","Ltr","Mtr","Ft","Sq.ft","Box","Bag","Set","Hr","Day","Job","Ton"];
const MODES = ["Cash","UPI","Bank transfer","Cheque","Card"];
const INC_CATS = ["Sales (no invoice)","Service","Advance received","Interest","Other income"];
const EXP_CATS = ["Material purchase","Salary / Wages","Rent","Electricity","Transport","Fuel","Repair & maintenance","Office supplies","Phone / Internet","Food & tea","Tax / Fees","Other expense"];
const COLS = ["invoices","quotes","txns","materials","moves","vendors","bills","clients"];

const I = {
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  sales:'<path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  money:'<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.6"/><path d="M6 10v5M18 10v5"/>',
  stock:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  vendors:'<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-7h6v7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>', down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  doc:'<path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',
  quote:'<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  cam:'<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  dl:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  wa:'<path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/>'
};
const svg = (k, sw=2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

/* ---------- runtime ----------
   Inside claude.ai the page uses window.claude (Artifact runtime).
   On your own hosting it uses window.KhataRest (public/js/rest.js -> /api backend). */
const RT = (window.claude && window.claude.use) ? window.claude : (window.KhataRest || null);
const MODE = RT && RT === window.KhataRest ? "rest" : "claude";
const fileUrl = id => MODE === "rest" ? window.KhataRest.fileUrl(id) : "/_blob/" + id;

/* ---------- state ---------- */
const S = {
  db:null, user:null, assets:null, dl:null, uid:null, canWrite:true, isAdmin:true, ready:false, offline:false,
  settings:{}, settingsVersion:0,
  invoices:[], quotes:[], txns:[], materials:[], moves:[], vendors:[], bills:[], clients:[],
  loaded:new Set(),
  view:"home", sub:{sales:"inv", money:"all", stock:"mat", vendors:"bills"},
  month: today().slice(0,7), q:{},
  sheet:null, formFiles:[], names:{}
};

/* ---------- utils ---------- */
function today(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function addDays(s,n){ const d=new Date(s+"T00:00:00"); d.setDate(d.getDate()+n); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const r2 = n => Math.round((+n||0)*100)/100;
/* sq.ft maths: area of one piece x pieces. 144 sq.inch = 1 sq.ft, 92903.04 sq.mm = 1 sq.ft */
const lineSqft = it => r2((+it.l||0)*(+it.w||0)*((DIMS[it.du]||DIMS.in).f)*(+it.qty||0));
const lineAmt = it => it.pricing==="sqft" ? r2(lineSqft(it)*(+it.rate||0)) : r2((+it.qty||0)*(+it.rate||0));
const itemTitle = it => { const m=[it.material, it.thick?`${it.thick}mm`:""].filter(Boolean).join(" "); return [m, it.desc].filter(Boolean).join(" – ") || "Item"; };
const itemSize = it => it.pricing==="sqft" ? `${+it.l||0} × ${+it.w||0} ${it.du==="ft"?"ft":it.du==="mm"?"mm":"in"}` : "";
const qtyText = it => it.pricing==="sqft" ? `${(+it.sqft||lineSqft(it)).toFixed(2)} sq.ft` : `${+it.qty||0} ${it.unit||""}`.trim();
const inr = (n, dec) => { n=+n||0; const d = dec ?? (Math.abs(n%1)>0.001?2:0); return "₹" + n.toLocaleString("en-IN",{minimumFractionDigits:d,maximumFractionDigits:d}); };
const inrShort = n => { n=+n||0; const a=Math.abs(n); if(a>=1e7) return "₹"+(n/1e7).toFixed(2).replace(/\.?0+$/,"")+" Cr"; if(a>=1e5) return "₹"+(n/1e5).toFixed(2).replace(/\.?0+$/,"")+" L"; return inr(Math.round(n),0); };
const pdfAmt = n => (+n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = s => { if(!s) return "—"; const [y,m,d]=s.split("-"); return `${+d} ${MON[+m-1]} ${y}`; };
const fmtMonth = ym => { const [y,m]=ym.split("-"); return `${MON[+m-1]} ${y}`; };
const shiftMonth = (ym,n) => { let [y,m]=ym.split("-").map(Number); m+=n; while(m<1){m+=12;y--;} while(m>12){m-=12;y++;} return `${y}-${String(m).padStart(2,"0")}`; };
const initials = s => (String(s||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("")||"?").toUpperCase();
const sum = (arr, f) => arr.reduce((a,x)=>a+(+f(x)||0),0);
const fyOf = date => { const [y,m]=date.split("-").map(Number); const s = m>=4?y:y-1; return `${String(s).slice(2)}-${String(s+1).slice(2)}`; };

function calc(d){
  const gst = d.gstMode === "gst"; let sub=0, tax=0, area=0;
  const rows = (d.items||[]).map(it => { const amt=lineAmt(it); const sq = it.pricing==="sqft" ? lineSqft(it) : 0; const t = gst ? r2(amt*(+it.gst||0)/100) : 0; sub+=amt; tax+=t; area+=sq; return {...it, sqft:sq, amt, t}; });
  sub=r2(sub); tax=r2(tax); const raw=r2(sub+tax); const total=Math.round(raw);
  const half = r2(tax/2);
  return { rows, sub, tax, area:r2(area), cgst: d.inter?0:half, sgst: d.inter?0:r2(tax-half), igst: d.inter?tax:0, roundOff:r2(total-raw), total };
}
const paidOf = d => r2(sum(d.payments||[], p=>p.amount));
function invStatus(inv){
  const paid = paidOf(inv), tot = +inv.total||0;
  if(tot>0 && paid >= tot-0.5) return "paid";
  if(inv.dueDate && inv.dueDate < today()) return "overdue";
  return paid>0 ? "partial" : "unpaid";
}
function billStatus(b){
  const paid = paidOf(b), tot = +b.amount||0;
  if(tot>0 && paid >= tot-0.5) return "paid";
  if(b.dueDate && b.dueDate < today()) return "overdue";
  return paid>0 ? "partial" : "unpaid";
}
function nextNo(list, prefix, date){
  const fy = fyOf(date||today());
  const seq = Math.max(0, ...list.filter(x=>x.fy===fy).map(x=>+x.seq||0)) + 1;
  return { no: `${prefix}/${fy}/${String(seq).padStart(3,"0")}`, fy, seq };
}
function inWords(n){
  n = Math.round(Math.abs(+n||0)); if(n===0) return "Zero";
  const a=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const two = x => x<20 ? a[x] : b[Math.floor(x/10)] + (x%10 ? " "+a[x%10] : "");
  const three = x => x>=100 ? a[Math.floor(x/100)]+" Hundred"+(x%100?" "+two(x%100):"") : two(x);
  const out=[]; const cr=Math.floor(n/1e7); n%=1e7; const lk=Math.floor(n/1e5); n%=1e5; const th=Math.floor(n/1000); n%=1000;
  if(cr) out.push((cr>999?inWords(cr):three(cr))+" Crore"); if(lk) out.push(two(lk)+" Lakh"); if(th) out.push(two(th)+" Thousand"); if(n) out.push(three(n));
  return out.join(" ");
}
const vendorName = id => (S.vendors.find(v=>v.id===id)||{}).name || "Unknown vendor";
const matById = id => S.materials.find(m=>m.id===id);
function stockOf(m){ return r2((+m.opening||0) + sum(S.moves.filter(x=>x.materialId===m.id), x => x.type==="in" ? +x.qty : -x.qty)); }
function stockState(m){ const s=stockOf(m); if(s<=0) return "out"; if(m.minStock && s<=+m.minStock) return "low"; return "ok"; }

function ledger(){
  const L=[];
  S.txns.forEach(t => L.push({key:"t"+t.id, src:"txn", id:t.id, type:t.type, date:t.date, amount:+t.amount||0, cat:t.category, party:t.party, mode:t.mode, note:t.note, files:t.files||[]}));
  S.invoices.forEach(inv => (inv.payments||[]).forEach((p,i) => L.push({key:"i"+inv.id+i, src:"inv", id:inv.id, type:"income", date:p.date, amount:+p.amount||0, cat:"Invoice payment", party:inv.client?.name, mode:p.mode, note:inv.no})));
  S.bills.forEach(b => (b.payments||[]).forEach((p,i) => L.push({key:"b"+b.id+i, src:"bill", id:b.id, type:"expense", date:p.date, amount:+p.amount||0, cat:"Vendor bill", party:vendorName(b.vendorId), mode:p.mode, note:b.billNo})));
  return L.sort((a,b)=> (b.date||"").localeCompare(a.date||""));
}

/* ---------- toast / errors ---------- */
let toastT;
function toast(msg){ const h=$("#toastHost"); h.innerHTML=`<div class="toast" role="status">${esc(msg)}</div>`; clearTimeout(toastT); toastT=setTimeout(()=>h.innerHTML="",2600); }
function errMsg(e){
  const c=e&&e.code;
  if(e && e.status && e.message) return e.message;
  if(c==="forbidden") return "Only an admin can do this.";
  if(c==="invalid_argument") return "You don't have permission to change this. Ask the owner to give you Contributor access.";
  if(c==="quota_exceeded") return "Storage is full. Delete some old entries and try again.";
  if(c==="too_large") return "File is too big (max 20 MB).";
  if(c==="unsupported_type") return "Only photos (JPG, PNG, WEBP) and PDF files can be attached.";
  if(c==="rate_limited"||c==="resource_exhausted") return "Too many actions at once. Wait a moment and try again.";
  return "Could not save. Check your connection and try again.";
}
async function write(fn, okMsg){
  if(!S.db){ toast("Not connected. Sign in to claude.ai to save."); return false; }
  try{ await fn(); if(okMsg) toast(okMsg); return true; }
  catch(e){ if(e&&e.code==="unavailable"){ try{ await new Promise(r=>setTimeout(r,600+Math.random()*600)); await fn(); if(okMsg) toast(okMsg); return true; }catch(e2){ e=e2; } }
    toast(errMsg(e)); console.warn(e); return false; }
}
const uidMeta = () => ({ by:S.uid||null });

/* ---------- boot ---------- */
async function boot(){
  renderNav(); render();
  const c = RT;
  if(!c || !c.use){ S.offline=true; S.ready=true; render(); return; }
  if(MODE==="rest"){ try{ await window.KhataRest.ensureAuth(); }catch(e){ return; } }
  const [db,user,assets,dl] = await Promise.all(["db","user","assets","downloads"].map(n=>c.use(n).catch(()=>null)));
  S.db=db; S.user=user; S.assets=assets; S.dl=dl;
  if(user){ try{ S.uid = await user.id(); }catch{} try{ const w = await user.can("data.write"); S.canWrite = w!==false; }catch{}
    try{ S.isAdmin = user.canEdit ? (await user.canEdit())!==false : true; }catch{} }
  document.body.classList.toggle("no-del", !S.isAdmin);
  if(!db){ S.offline=true; S.ready=true; render(); return; }
  db.doc("app/settings").onSnapshot(s => { S.settings = s.exists ? {...s.data()} : {}; S.loaded.add("settings"); paintBrand(); schedule(); }, e=>console.warn(e));
  COLS.forEach(name => {
    db.collection(name).orderBy("createdAt","desc").limit(1000).onSnapshot(snap => {
      S[name] = snap.docs.map(d => ({id:d.id, ...d.data()})); S.loaded.add(name); schedule();
    }, e => { console.warn(name,e); S.loaded.add(name); schedule(); });
  });
  setTimeout(()=>{ S.ready=true; schedule(); }, 2500);
}
let raf=0;
function schedule(){ if(S.loaded.size>=COLS.length+1) S.ready=true; if(raf) return; raf=requestAnimationFrame(()=>{ raf=0; render(); refreshSheet(); }); }

function paintBrand(){
  const st=S.settings; $("#coName").textContent = st.name || "Khata Desk";
  $("#coSub").textContent = st.name ? (st.gstin ? "GSTIN "+st.gstin : (st.city||st.state||"CNC · Invoices · Stock · Vendors")) : "Set your company name in Settings";
  const m=$("#mark"); if(st.logoId){ m.innerHTML=`<img alt="" src="${esc(fileUrl(st.logoId))}">`; } else m.textContent = initials(st.name||"K D").slice(0,1);
}

/* ---------- nav ---------- */
const TABS = [["home","Home"],["sales","Sales"],["money","Money"],["stock","Stock"],["vendors","Vendors"]];
function renderNav(){
  $("#nav").innerHTML = TABS.map(([k,l]) => `<button data-act="tab" data-v="${k}" aria-current="${S.view===k}"><span class="pill">${svg(k)}</span>${l}</button>`).join("");
}

/* ---------- views ---------- */
function render(){
  renderNav();
  const v=$("#view");
  let html="";
  if(S.offline) html += `<div class="banner">Open this app while signed in to claude.ai to load and save your company's data.</div>`;
  else if(!S.canWrite) html += `<div class="banner">You have view-only access. Ask the owner to share it with you as Contributor to add entries.</div>`;
  if(!S.ready && !S.offline){ v.innerHTML = html + `<div class="loading">Loading your books…</div>`; $("#fabHost").innerHTML=""; return; }
  html += ({home:vHome, sales:vSales, money:vMoney, stock:vStock, vendors:vVendors})[S.view]();
  const oldQ = document.activeElement && document.activeElement.id==="q" ? document.activeElement : null;
  const tmp = document.createElement("div"); tmp.innerHTML = html;
  const newQ = tmp.querySelector("#q"); const newBar = newQ && newQ.closest(".bar"); const oldBar = oldQ && oldQ.closest(".bar");
  if(oldQ && newBar && newBar.parentNode===tmp && oldBar && oldBar.parentNode===v && newQ.dataset.key===oldQ.dataset.key){
    const kids=[...tmp.childNodes]; const idx=kids.indexOf(newBar);
    [...v.childNodes].forEach(n=>{ if(n!==oldBar) n.remove(); });
    kids.slice(0,idx).forEach(n=>v.insertBefore(n, oldBar));
    kids.slice(idx+1).forEach(n=>v.appendChild(n));
  } else { v.replaceChildren(...tmp.childNodes); }
  const fab = fabFor();
  $("#fabHost").innerHTML = (fab && S.canWrite && !S.offline) ? `<button class="fab" data-act="${fab[0]}" ${fab[2]||""}>${svg("plus",2.4)}${fab[1]}</button>` : "";
}
function fabFor(){
  switch(S.view){
    case "home": return null;
    case "sales": return S.sub.sales==="inv" ? ["newInvoice","New invoice"] : S.sub.sales==="quo" ? ["newQuote","New quotation"] : ["newClient","Add client"];
    case "money": return ["newTxn", S.sub.money==="income"?"Add income":"Add expense", `data-type="${S.sub.money==="income"?"income":"expense"}"`];
    case "stock": return ["newMaterial","Add material"];
    case "vendors": return S.sub.vendors==="bills" ? ["newBill","Upload bill"] : ["newVendor","Add vendor"];
  }
}
function seg(group, opts){ return `<div class="seg" role="group">${opts.map(([k,l])=>`<button data-act="sub" data-g="${group}" data-v="${k}" aria-pressed="${S.sub[group]===k}">${l}</button>`).join("")}</div>`; }
function emptyBox(title, text, act, label, extra=""){ return `<div class="empty"><b>${title}</b><p>${text}</p>${act && S.canWrite && !S.offline ? `<button class="btn pri" data-act="${act}" ${extra}>${svg("plus")}${label}</button>`:""}</div>`; }
function searchBar(key, ph){ return `<input class="search" id="q" data-key="${key}" type="search" placeholder="${ph}" value="${esc(S.q[key]||"")}" autocomplete="off">`; }
const match = (key, ...fields) => { const q=(S.q[key]||"").toLowerCase().trim(); return !q || fields.some(f=>String(f||"").toLowerCase().includes(q)); };

/* HOME */
function vHome(){
  const ym = today().slice(0,7); const L = ledger();
  const mInc = sum(L.filter(x=>x.type==="income"&&x.date?.startsWith(ym)), x=>x.amount);
  const mExp = sum(L.filter(x=>x.type==="expense"&&x.date?.startsWith(ym)), x=>x.amount);
  const recv = sum(S.invoices.filter(i=>invStatus(i)!=="paid"), i=>(+i.total||0)-paidOf(i));
  const pay = sum(S.bills.filter(b=>billStatus(b)!=="paid"), b=>(+b.amount||0)-paidOf(b));
  const overdueInv = S.invoices.filter(i=>invStatus(i)==="overdue");
  const lowMats = S.materials.filter(m=>stockState(m)!=="ok");
  const hello = `${MON[+ym.slice(5)-1]} ${ym.slice(0,4)} at a glance`;
  let h = `<h2 class="vt">${hello}</h2>
  <div class="tiles">
    <div class="tile good"><div class="k">Income · ${MON[+ym.slice(5)-1]}</div><div class="v num">${inrShort(mInc)}</div></div>
    <div class="tile bad"><div class="k">Expense · ${MON[+ym.slice(5)-1]}</div><div class="v num">${inrShort(mExp)}</div></div>
    <div class="tile ${mInc-mExp>=0?"good":"bad"}"><div class="k">Profit</div><div class="v num">${inrShort(mInc-mExp)}</div></div>
  </div>
  <div class="tiles two">
    <button class="tile" style="text-align:left;cursor:pointer;color:inherit" data-act="goto" data-v="sales" data-g="sales" data-s="inv"><div class="k">To receive (invoices)</div><div class="v num">${inrShort(recv)}</div></button>
    <button class="tile" style="text-align:left;cursor:pointer;color:inherit" data-act="goto" data-v="vendors" data-g="vendors" data-s="bills"><div class="k">To pay (vendor bills)</div><div class="v num">${inrShort(pay)}</div></button>
  </div>`;
  if(S.canWrite && !S.offline) h += `<div class="quick">
    <button data-act="newInvoice"><span class="ic">${svg("doc")}</span>Invoice</button>
    <button data-act="newQuote"><span class="ic">${svg("quote")}</span>Quotation</button>
    <button data-act="newTxn" data-type="expense"><span class="ic">${svg("down")}</span>Expense</button>
    <button data-act="newBill"><span class="ic">${svg("cam")}</span>Vendor bill</button>
  </div>`;
  // chart
  const months=[]; for(let i=5;i>=0;i--) months.push(shiftMonth(ym,-i));
  const data = months.map(m=>({m, inc:sum(L.filter(x=>x.type==="income"&&x.date?.startsWith(m)),x=>x.amount), exp:sum(L.filter(x=>x.type==="expense"&&x.date?.startsWith(m)),x=>x.amount)}));
  h += `<h3 class="st">Last 6 months</h3><div class="card chart">${barChart(data)}</div>`;
  if(overdueInv.length || lowMats.length){
    h += `<h3 class="st">Needs attention</h3><div class="list">`;
    overdueInv.slice(0,5).forEach(i => h += `<button class="row" data-act="openInvoice" data-id="${i.id}"><div class="av out">${svg("doc")}</div><div class="main"><div class="t">${esc(i.client?.name||"Client")}</div><div class="s">${esc(i.no)} · due ${fmtDate(i.dueDate)}</div></div><div class="amt"><b>${inr((+i.total||0)-paidOf(i))}</b><span class="chip overdue">overdue</span></div></button>`);
    lowMats.slice(0,5).forEach(m => { const st=stockState(m); h += `<button class="row" data-act="openMaterial" data-id="${m.id}"><div class="av n">${svg("box")}</div><div class="main"><div class="t">${esc(m.name)}</div><div class="s">Min ${esc(m.minStock||0)} ${esc(m.unit||"")}</div></div><div class="amt"><b>${stockOf(m)} ${esc(m.unit||"")}</b><span class="chip ${st}">${st==="out"?"out of stock":"low stock"}</span></div></button>`; });
    h += `</div>`;
  }
  const recent = L.slice(0,6);
  h += `<h3 class="st">Recent money entries</h3>`;
  h += recent.length ? `<div class="list">${recent.map(ledgerRow).join("")}</div>` : emptyBox("No money entries yet","Record your first income or expense, or mark an invoice as paid. They will show up here.","newTxn","Add expense",`data-type="expense"`);
  return h;
}
function barChart(data){
  const W=340,H=150,pl=8,pr=8,pt=12,pb=24; const max=Math.max(1,...data.flatMap(d=>[d.inc,d.exp]));
  const gw=(W-pl-pr)/data.length, bw=Math.min(16,gw/3.2);
  const y=v=>pt+(H-pt-pb)*(1-v/max);
  let s=`<div class="legend"><span><i style="background:var(--good)"></i>Income</span><span><i style="background:var(--bad)"></i>Expense</span><span style="margin-left:auto">max ${inrShort(max)}</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Income and expense for the last six months">`;
  [0.5,1].forEach(f=>{ const yy=y(max*f); s+=`<line x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-dasharray="3 4"/>`; });
  s+=`<line x1="${pl}" x2="${W-pr}" y1="${H-pb}" y2="${H-pb}" stroke="var(--line)"/>`;
  data.forEach((d,i)=>{ const cx=pl+gw*i+gw/2;
    s+=`<rect x="${cx-bw-1.5}" y="${y(d.inc)}" width="${bw}" height="${Math.max(0,H-pb-y(d.inc))}" rx="3" fill="var(--good)"><title>Income ${inr(d.inc)}</title></rect>`;
    s+=`<rect x="${cx+1.5}" y="${y(d.exp)}" width="${bw}" height="${Math.max(0,H-pb-y(d.exp))}" rx="3" fill="var(--bad)"><title>Expense ${inr(d.exp)}</title></rect>`;
    s+=`<text x="${cx}" y="${H-7}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="Figtree,sans-serif">${MON[+d.m.slice(5)-1]}</text>`; });
  return s+`</svg>`;
}
function ledgerRow(x){
  const inc = x.type==="income";
  const sub = [fmtDate(x.date), x.cat, x.mode].filter(Boolean).join(" · ");
  const act = x.src==="txn" ? `data-act="openTxn" data-id="${x.id}"` : x.src==="inv" ? `data-act="openInvoice" data-id="${x.id}"` : `data-act="openBill" data-id="${x.id}"`;
  return `<button class="row" ${act}><div class="av ${inc?"in":"out"}">${svg(inc?"up":"down")}</div><div class="main"><div class="t">${esc(x.party||x.note||x.cat||"Entry")}</div><div class="s">${esc(sub)}${x.files?.length?" · 📎":""}</div></div><div class="amt"><b style="color:var(--${inc?"good":"bad"})">${inc?"+":"−"}${inr(x.amount)}</b></div></button>`;
}

/* SALES */
function vSales(){
  let h = `<h2 class="vt">Sales</h2>` + seg("sales",[["inv",`Invoices (${S.invoices.length})`],["quo",`Quotations (${S.quotes.length})`],["cli",`Clients (${S.clients.length})`]]);
  if(S.sub.sales==="inv"){
    const list = S.invoices.filter(i=>match("inv", i.no, i.client?.name, i.client?.phone)).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.seq||0)-(a.seq||0));
    const recv = sum(S.invoices.filter(i=>invStatus(i)!=="paid"), i=>(+i.total||0)-paidOf(i));
    h += `<div class="bar">${searchBar("inv","Search invoice no. or client")}<button class="btn sm" data-act="exportInvoices">${svg("dl")}CSV</button></div>`;
    if(S.invoices.length) h += `<p class="small muted" style="margin:0 0 8px">Pending to receive: <b class="num" style="color:var(--ink)">${inr(recv)}</b></p>`;
    h += !S.invoices.length ? emptyBox("No invoices yet","Create a GST or simple invoice, download it as PDF and share on WhatsApp.","newInvoice","New invoice")
      : !list.length ? `<p class="muted">No invoice matches “${esc(S.q.inv)}”.</p>`
      : `<div class="list">${list.map(i=>{ const st=invStatus(i); return `<button class="row" data-act="openInvoice" data-id="${i.id}"><div class="av n">${esc(initials(i.client?.name))}</div><div class="main"><div class="t">${esc(i.client?.name||"Client")}</div><div class="s"><span class="mono">${esc(i.no)}</span> · ${fmtDate(i.date)}${i.gstMode==="gst"?" · GST":""}</div></div><div class="amt"><b>${inr(i.total)}</b><span class="chip ${st}">${st}</span></div></button>`; }).join("")}</div>`;
  } else if(S.sub.sales==="quo"){
    const list = S.quotes.filter(q=>match("quo", q.no, q.client?.name)).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.seq||0)-(a.seq||0));
    h += `<div class="bar">${searchBar("quo","Search quotation no. or client")}</div>`;
    h += !S.quotes.length ? emptyBox("No quotations yet","Send a price quotation to a client. When they agree, convert it to an invoice in one tap.","newQuote","New quotation")
      : !list.length ? `<p class="muted">No quotation matches.</p>`
      : `<div class="list">${list.map(q=>{ const st=q.status||"sent"; return `<button class="row" data-act="openQuote" data-id="${q.id}"><div class="av n">${esc(initials(q.client?.name))}</div><div class="main"><div class="t">${esc(q.client?.name||"Client")}</div><div class="s"><span class="mono">${esc(q.no)}</span> · ${fmtDate(q.date)}</div></div><div class="amt"><b>${inr(q.total)}</b><span class="chip ${st}">${st}</span></div></button>`; }).join("")}</div>`;
  } else {
    const list = S.clients.filter(c=>match("cli", c.name, c.phone, c.gstin, c.address)).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    h += `<div class="bar">${searchBar("cli","Search client name, phone or GSTIN")}</div>`;
    h += !S.clients.length ? emptyBox("No clients yet","Add clients to track their invoices, quotations, and outstanding payments.","newClient","Add client")
      : !list.length ? `<p class="muted">No client matches “${esc(S.q.cli)}”.</p>`
      : `<div class="list">${list.map(c=>{
          const invs = S.invoices.filter(i=>(i.client?.id===c.id) || (i.client?.name && i.client.name.trim().toLowerCase()===(c.name||"").trim().toLowerCase()));
          const billed = sum(invs, i=>+i.total||0);
          const received = sum(invs, paidOf);
          const due = billed - received;
          return `<button class="row" data-act="openClient" data-id="${c.id}"><div class="av n">${esc(initials(c.name))}</div><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${esc([c.phone, c.gstin&&("GSTIN "+c.gstin), c.state].filter(Boolean).join(" · ")||"—")}</div></div><div class="amt"><b>${inr(Math.max(0,due))}</b><span class="small muted">${due>0?"due":"clear"} · ${invs.length} inv</span></div></button>`;
        }).join("")}</div>`;
  }
  return h;
}

/* MONEY */
function vMoney(){
  const all = ledger(); const ym=S.month;
  const inMonth = all.filter(x=>x.date?.startsWith(ym));
  const inc = sum(inMonth.filter(x=>x.type==="income"),x=>x.amount), exp = sum(inMonth.filter(x=>x.type==="expense"),x=>x.amount);
  const f = S.sub.money;
  const shown = inMonth.filter(x => (f==="all"||x.type===f) && match("money", x.party, x.cat, x.note, x.mode));
  let h = `<h2 class="vt">Income & Expense</h2>` + seg("money",[["all","All"],["income","Income"],["expense","Expense"]]);
  h += `<div class="bar"><div class="monthnav"><button data-act="month" data-n="-1" aria-label="Previous month">‹</button><span>${fmtMonth(ym)}</span><button data-act="month" data-n="1" aria-label="Next month">›</button></div>${searchBar("money","Search")}<button class="btn sm" data-act="exportLedger">${svg("dl")}CSV</button></div>`;
  h += `<div class="tiles"><div class="tile good"><div class="k">Income</div><div class="v num">${inrShort(inc)}</div></div><div class="tile bad"><div class="k">Expense</div><div class="v num">${inrShort(exp)}</div></div><div class="tile ${inc-exp>=0?"good":"bad"}"><div class="k">Net</div><div class="v num">${inrShort(inc-exp)}</div></div></div>`;
  if(f!=="income"){
    const byCat={}; inMonth.filter(x=>x.type==="expense").forEach(x=>byCat[x.cat||"Other"]=(byCat[x.cat||"Other"]||0)+x.amount);
    const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if(cats.length){ const mx=cats[0][1]; h += `<h3 class="st">Where money went</h3><div class="card">${cats.map(([c,v])=>`<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-top:6px"><span>${esc(c)}</span><b class="num">${inr(v)}</b></div><div class="stockbar out"><i style="width:${Math.max(3,v/mx*100)}%"></i></div>`).join("")}</div>`; }
  }
  h += `<h3 class="st">${shown.length} entr${shown.length===1?"y":"ies"}</h3>`;
  h += shown.length ? `<div class="list">${shown.map(ledgerRow).join("")}</div>` : emptyBox(`Nothing in ${fmtMonth(ym)}`, "Add income or expenses with a photo of the receipt. Invoice and vendor-bill payments appear here on their own.", "newTxn", f==="income"?"Add income":"Add expense", `data-type="${f==="income"?"income":"expense"}"`);
  if(S.canWrite && !S.offline && f==="all") h += `<div class="actions"><button class="btn" data-act="newTxn" data-type="income">${svg("up")}Add income</button></div>`;
  return h;
}

/* STOCK */
function vStock(){
  let h = `<h2 class="vt">Material Inventory</h2>` + seg("stock",[["mat",`Materials (${S.materials.length})`],["mov","Stock movements"]]);
  if(S.sub.stock==="mat"){
    const list = S.materials.filter(m=>match("mat", m.name, m.category, m.hsn)).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    const value = sum(S.materials, m=>Math.max(0,stockOf(m))*(+m.rate||0));
    h += `<div class="bar">${searchBar("mat","Search material")}<button class="btn sm" data-act="exportStock">${svg("dl")}CSV</button></div>`;
    if(S.materials.length) h += `<p class="small muted" style="margin:0 0 8px">Stock value (at purchase rate): <b class="num" style="color:var(--ink)">${inr(value)}</b> · ${S.materials.filter(m=>stockState(m)!=="ok").length} low/out</p>`;
    h += !S.materials.length ? emptyBox("No materials yet","Add the sheets you keep (Acrylic, MDF, Corian, MS, SS…) with stock in sq.ft. Record stock in and out to always know what's left.","newMaterial","Add material")
      : `<div class="list">${list.map(m=>{ const s=stockOf(m), st=stockState(m), mx=Math.max(s, (+m.minStock||0)*3, 1); return `<button class="row" data-act="openMaterial" data-id="${m.id}"><div class="av n">${svg("box")}</div><div class="main"><div class="t">${esc(m.name)}</div><div class="s">${esc([m.category, m.thick?m.thick+"mm":"", m.saleRate?"sell "+inr(m.saleRate)+"/"+(m.unit||"unit"):""].filter(Boolean).join(" · ")||"—")}</div><div class="stockbar ${st}"><i style="width:${Math.max(2,Math.min(100,s/mx*100))}%"></i></div></div><div class="amt"><b>${s} ${esc(m.unit||"")}</b>${st!=="ok"?`<span class="chip ${st}">${st==="out"?"out":"low"}</span>`:""}</div></button>`; }).join("")}</div>`;
  } else {
    const list = [...S.moves].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).filter(x=>match("mov", matById(x.materialId)?.name, x.note, x.ref));
    h += `<div class="bar">${searchBar("mov","Search material or note")}</div>`;
    h += !S.moves.length ? emptyBox("No stock movements yet","Open a material and tap Stock in or Stock out to record purchases and usage.", null)
      : `<div class="list">${list.slice(0,300).map(x=>{ const m=matById(x.materialId)||{}; const inn=x.type==="in"; return `<button class="row" data-act="openMove" data-id="${x.id}"><div class="av ${inn?"in":"out"}">${svg(inn?"down":"up")}</div><div class="main"><div class="t">${esc(m.name||"Deleted material")}</div><div class="s">${fmtDate(x.date)}${x.ref?" · "+esc(x.ref):""}${x.note?" · "+esc(x.note):""}</div></div><div class="amt"><b style="color:var(--${inn?"good":"bad"})">${inn?"+":"−"}${esc(x.qty)} ${esc(m.unit||"")}</b></div></button>`; }).join("")}</div>`;
  }
  return h;
}

/* VENDORS */
function vVendors(){
  let h = `<h2 class="vt">Vendors & Bills</h2>` + seg("vendors",[["bills",`Bills (${S.bills.length})`],["list",`Vendors (${S.vendors.length})`]]);
  if(S.sub.vendors==="bills"){
    const list = S.bills.filter(b=>match("bill", b.billNo, vendorName(b.vendorId), b.note)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    const pay = sum(S.bills.filter(b=>billStatus(b)!=="paid"), b=>(+b.amount||0)-paidOf(b));
    h += `<div class="bar">${searchBar("bill","Search bill no. or vendor")}<button class="btn sm" data-act="exportBills">${svg("dl")}CSV</button></div>`;
    if(S.bills.length) h += `<p class="small muted" style="margin:0 0 8px">Pending to pay: <b class="num" style="color:var(--ink)">${inr(pay)}</b></p>`;
    h += !S.bills.length ? emptyBox("No vendor bills yet","Snap a photo or upload the PDF of a supplier's bill. Track what's paid and what's due.","newBill","Upload bill")
      : `<div class="list">${list.map(b=>{ const st=billStatus(b); return `<button class="row" data-act="openBill" data-id="${b.id}"><div class="av out">${svg("receipt")}</div><div class="main"><div class="t">${esc(vendorName(b.vendorId))}</div><div class="s">${b.billNo?`<span class="mono">${esc(b.billNo)}</span> · `:""}${fmtDate(b.date)}${b.files?.length?" · 📎 "+b.files.length:""}</div></div><div class="amt"><b>${inr(b.amount)}</b><span class="chip ${st}">${st}</span></div></button>`; }).join("")}</div>`;
  } else {
    const list = S.vendors.filter(v=>match("ven", v.name, v.phone, v.gstin)).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    h += `<div class="bar">${searchBar("ven","Search vendor")}</div>`;
    h += !S.vendors.length ? emptyBox("No vendors yet","Add the suppliers you buy from. Each vendor shows total billed, paid and still due.","newVendor","Add vendor")
      : `<div class="list">${list.map(v=>{ const bs=S.bills.filter(b=>b.vendorId===v.id); const due=sum(bs,b=>(+b.amount||0)-paidOf(b)); return `<button class="row" data-act="openVendor" data-id="${v.id}"><div class="av n">${esc(initials(v.name))}</div><div class="main"><div class="t">${esc(v.name)}</div><div class="s">${esc([v.phone, v.gstin].filter(Boolean).join(" · ")||"—")}</div></div><div class="amt"><b>${inr(due)}</b><span class="small muted">due · ${bs.length} bill${bs.length===1?"":"s"}</span></div></button>`; }).join("")}</div>`;
  }
  return h;
}

/* ---------- sheet system ---------- */
function missing(type, id, refresh){
  if(refresh){ if(S.sheet && S.sheet.wait>0){ S.sheet.wait--; return; } closeSheet(); return; }
  openSheet("Saving…", `<div class="loading">Saving…</div>`, "", {kind:"detail", type, id, wait:30});
}
function openSheet(title, body, footer, meta){
  S.sheet = meta || {kind:"form"};
  $("#sheetHost").innerHTML = `<div class="scrim" data-act="scrim"><div class="sheet" ${S._refreshing?'style="animation:none"':""} role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-h"><h3>${esc(title)}</h3><button class="iconbtn" data-act="close" aria-label="Close">${svg("x")}</button></div><div class="sheet-b">${body}</div>${footer?`<div class="sheet-f">${footer}</div>`:""}</div></div>`;
  document.body.style.overflow="hidden";
}
function closeSheet(){ S.sheet=null; S.formFiles=[]; S._fromQuote=null; $("#sheetHost").innerHTML=""; document.body.style.overflow=""; }
function refreshSheet(){
  const s=S.sheet; if(!s || s.kind!=="detail") return;
  const b=$(".sheet-b"); const top=b?b.scrollTop:0;
  const fn = {invoice:dInvoice, quote:dQuote, txn:dTxn, material:dMaterial, vendor:dVendor, bill:dBill, move:dMove, client:dClient}[s.type];
  S._refreshing = true;
  if(fn){ fn(s.id, true); const nb=$(".sheet-b"); if(nb) nb.scrollTop=top; }
  S._refreshing = false;
}
function confirmSheet(text, onYes, yesLabel="Delete"){
  S._confirm = onYes;
  openSheet("Are you sure?", `<p style="margin:0 0 6px">${text}</p><p class="small muted">This cannot be undone.</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="confirmYes">${esc(yesLabel)}</button>`);
}

/* ---------- file attachments ---------- */
async function prepFile(file){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try{
    const bmp = await createImageBitmap(file); const max=1800; const s=Math.min(1, max/Math.max(bmp.width,bmp.height));
    const c=document.createElement("canvas"); c.width=Math.round(bmp.width*s); c.height=Math.round(bmp.height*s);
    c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    const blob = await new Promise(r=>c.toBlob(r,"image/jpeg",0.82));
    return (blob && blob.size < file.size) ? new File([blob], file.name.replace(/\.\w+$/,"")+".jpg", {type:"image/jpeg"}) : file;
  }catch{ return file; }
}
function filesField(label="Attach bill / receipt"){
  if(!S.assets) return `<p class="small muted">File upload is not available for your access level. Ask the owner for Contributor or Editor access.</p>`;
  return `<div class="actions" style="margin:0"><label class="btn pri upl">${svg("cam")}Camera<input type="file" id="fileCam" accept="image/*" capture="environment"></label><label class="btn upl">${svg("doc")}${label}<input type="file" id="fileIn" accept="image/*,application/pdf" multiple></label></div><div class="files" id="fileList">${filesThumbs(S.formFiles,true)}</div>`;
}
function filesThumbs(files, removable){
  return (files||[]).map((f,i)=> f.pending ? `<div class="fthumb">Uploading…</div>` :
    `<div class="fthumb" data-act="viewFile" data-fid="${esc(f.id)}" data-ftype="${esc(f.type||"")}" data-fname="${esc(f.name||"file")}">${(f.type||"").startsWith("image/")?`<img alt="${esc(f.name||"")}" src="${esc(fileUrl(f.id))}">`:"PDF"}${removable?`<button type="button" class="rm" data-act="rmFile" data-i="${i}" aria-label="Remove">×</button>`:""}</div>`).join("");
}
async function handleFiles(list, raw0){
  for(const raw of list){
    const ok = /^image\/(jpeg|png|webp|gif)$/.test(raw.type) || raw.type==="application/pdf";
    if(!ok){ toast("Only JPG, PNG, WEBP photos or PDF files."); continue; }
    const slot = {pending:true}; S.formFiles.push(slot); paintFiles();
    try{ const f = raw0 ? raw : await prepFile(raw); const res = await S.assets.upload(f, {type: f.type});
      Object.assign(slot, {pending:false, id:res.id, type:res.contentType, name:raw.name, size:res.sizeBytes});
    }catch(e){ S.formFiles.splice(S.formFiles.indexOf(slot),1); toast(errMsg(e)); }
    paintFiles();
  }
}
function paintFiles(){ const el=$("#fileList"); if(el) el.innerHTML = filesThumbs(S.formFiles,true); }
function viewFile(id, type, name){
  if(!type.startsWith("image/")){
    const h=$("#toastHost");
    h.innerHTML = `<div class="viewer"><div class="vh"><a class="btn" href="${esc(fileUrl(id))}" target="_blank" rel="noopener">Open PDF</a><button class="btn" data-act="saveFile" data-fid="${esc(id)}" data-fname="${esc(name)}">${svg("dl")}Save</button><button class="btn" data-act="closeViewer">${svg("x")}Close</button></div><div class="vb"><p style="color:#fff">${esc(name)}</p></div></div>`;
    return;
  }
  $("#toastHost").innerHTML = `<div class="viewer"><div class="vh"><button class="btn" data-act="saveFile" data-fid="${esc(id)}" data-fname="${esc(name)}">${svg("dl")}Save</button><button class="btn" data-act="closeViewer">${svg("x")}Close</button></div><div class="vb"><img alt="${esc(name)}" src="${esc(fileUrl(id))}"></div></div>`;
}
async function saveFile(id, name){
  if(!S.dl){ toast("Download is not available here."); return; }
  try{ const r = await fetch(fileUrl(id)); const b = await r.blob(); let fn=name||"file"; if(!/\.\w+$/.test(fn)) fn += b.type==="application/pdf"?".pdf":".jpg"; await S.dl.save({filename:fn, data:b}); }
  catch(e){ if(e?.code!=="declined") toast("Could not save the file."); }
}

function clientNames(){
  const m=new Map();
  (S.clients||[]).forEach(c => { if(c.name) m.set(c.name, c); });
  [...S.invoices,...S.quotes].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).forEach(d=>{ if(d.client?.name && !m.has(d.client.name)) m.set(d.client.name, d.client); });
  return m;
}
function itemRow(it={}, gst, prev){
  const p = it.pricing || (it.desc && !it.material && it.rate!==undefined && !it.l ? "unit" : (prev?.pricing || "sqft"));
  const du = it.du || prev?.du || S.settings.dimUnit || "in";
  const stockNames = S.materials.map(m=>m.name).filter(n=>n && !MATS.includes(n));
  const mat = it.material ?? prev?.material ?? "";
  const thick = it.thick ?? prev?.thick ?? "";
  
  const allConfigured = getAllConfiguredMaterials();
  const customMats = allConfigured.filter(m => !MATS.includes(m) && !stockNames.includes(m));
  const extra = mat && !MATS.includes(mat) && !stockNames.includes(mat) && !customMats.includes(mat) ? `<option selected>${esc(mat)}</option>` : "";
  const matOpts = `<option value="">Material…</option>`
    + `${MATS.map(m=>`<option ${m===mat?"selected":""}>${esc(m)}</option>`).join("")}`
    + `${customMats.length?`<optgroup label="Custom Materials">${customMats.map(n=>`<option ${n===mat?"selected":""}>${esc(n)}</option>`).join("")}</optgroup>`:""}`
    + `${stockNames.length?`<optgroup label="From stock">${stockNames.map(n=>`<option ${n===mat?"selected":""}>${esc(n)}</option>`).join("")}</optgroup>`:""}`
    + `${extra}`;

  const thList = mat ? getMaterialThicknesses(mat) : [];
  const thChipsHtml = thList.map(t => {
    const isActive = thick !== "" && parseFloat(thick) === parseFloat(t.thick);
    return `<button type="button" class="th-chip ${isActive?'active':''}" data-act="pickThick" data-thick="${esc(t.thick)}" data-rate="${esc(t.rate)}">${esc(t.thick)}mm <span class="rate-badge">₹${esc(t.rate)}</span></button>`;
  }).join("");

  return `<div class="item" data-pricing="${p}">
    <div class="d"><select name="material" aria-label="Material">${matOpts}</select><input name="thick" type="number" inputmode="decimal" step="any" min="0" placeholder="mm" value="${esc(thick)}" aria-label="Thickness (mm)" class="thick"><button type="button" class="x" data-act="rmItem" aria-label="Remove item">×</button></div>
    <div class="thick-hints full" data-role="thickHints" ${thList.length ? "" : "hidden"}><span class="muted" style="font-size:11px;font-weight:600;display:flex;align-items:center;margin-right:2px">Thickness:</span>${thChipsHtml}</div>
    <input class="full" name="desc" placeholder="Job / design (e.g. Name plate, Jali cutting)" value="${esc(it.desc||"")}" aria-label="Description">
    <input type="hidden" name="pricing" value="${p}">
    <div class="pseg full" role="group"><button type="button" data-act="pricing" data-v="sqft" aria-pressed="${p==="sqft"}">Per sq.ft</button><button type="button" data-act="pricing" data-v="unit" aria-pressed="${p!=="sqft"}">Per piece / unit</button></div>
    <label class="c2 sq"><small>Length</small><input name="l" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.l??"")}"></label>
    <label class="c2 sq"><small>Width</small><input name="w" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.w??"")}"></label>
    <label class="c2 sq"><small>Size in</small><select name="du">${Object.entries(DIMS).map(([k,v])=>`<option value="${k}" ${k===du?"selected":""}>${v.label}</option>`).join("")}</select></label>
    <label class="c2 qr"><small class="qlbl">${p==="sqft"?"Pieces":"Qty"}</small><input name="qty" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.qty??1)}"></label>
    <label class="c2 un"><small>Unit</small><input name="unit" list="unitList" value="${esc(it.pricing==="sqft"?"Nos":(it.unit||"Nos"))}"></label>
    <label class="c2 qr"><small class="rlbl">${p==="sqft"?"Rate / sq.ft (₹)":"Rate (₹)"}</small><input name="rate" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.rate??"")}"></label>
    <label class="c3 gstonly" ${gst?"":"hidden"}><small>HSN / SAC</small><input name="hsn" inputmode="numeric" value="${esc(it.hsn||"")}"></label>
    <label class="c3 gstonly" ${gst?"":"hidden"}><small>GST %</small><select name="gst">${GST_RATES.map(r=>`<option value="${r}" ${(+(it.gst ?? S.settings.defaultGst ?? 18))===r?"selected":""}>${r}%</option>`).join("")}</select></label>
    <div class="lineamt num"></div>
  </div>`;
}
function readRow(r){
  const g = n => ($(`[name=${n}]`, r)?.value ?? "");
  const it = { material:g("material"), thick:g("thick"), desc:g("desc").trim(), pricing:g("pricing")||"unit", qty:+g("qty")||0, rate:+g("rate")||0, hsn:g("hsn").trim(), gst:+g("gst")||0 };
  if(it.pricing==="sqft"){ it.l=+g("l")||0; it.w=+g("w")||0; it.du=g("du")||"in"; it.unit="Sq.ft"; it.sqft=lineSqft(it); }
  else it.unit=g("unit").trim();
  return it;
}
function docForm(kind, existing){
  S._fromQuote = null;
  const isQ = kind==="quote"; const list = isQ?S.quotes:S.invoices;
  const st=S.settings; const d = existing ? JSON.parse(JSON.stringify(existing)) : null;
  const date = d?.date || today();
  const nn = d ? {no:d.no} : nextNo(list, isQ?(st.quotePrefix||"QT"):(st.invPrefix||"INV"), date);
  const gst = d ? d.gstMode==="gst" : (st.defaultMode ? st.defaultMode==="gst" : !!st.gstin);
  const cl = d?.client || {};
  const items = d?.items?.length ? d.items : [{}];
  const body = `<form id="docForm" data-form="doc" data-kind="${kind}" data-id="${d?.id||""}" autocomplete="off">
    <div class="seg" role="group" style="margin-bottom:14px"><button type="button" data-act="mode" data-v="gst" aria-pressed="${gst}">GST ${isQ?"quotation":"invoice"}</button><button type="button" data-act="mode" data-v="none" aria-pressed="${!gst}">Simple (no GST)</button></div>
    <input type="hidden" name="gstMode" value="${gst?"gst":"none"}">
    <div class="fg">
      <label class="f"><span>${isQ?"Quotation":"Invoice"} no.</span><input name="no" required value="${esc(nn.no)}"></label>
      <label class="f"><span>Date</span><input name="date" type="date" required value="${esc(date)}"></label>
      ${isQ ? `<label class="f full"><span>Valid till</span><input name="validTill" type="date" value="${esc(d?.validTill || addDays(date,15))}"></label>`
            : `<label class="f full"><span>Payment due date</span><input name="dueDate" type="date" value="${esc(d?.dueDate || addDays(date,+(st.dueDays||15)))}"></label>`}
    </div>
    <div class="legend-s">${isQ?"Quotation for":"Bill to"}</div>
    <div class="fg">
      <label class="f full"><span>Client name</span><input name="cname" list="clientList" required value="${esc(cl.name||"")}"></label>
      <label class="f"><span>Phone</span><input name="cphone" type="tel" inputmode="tel" value="${esc(cl.phone||"")}"></label>
      <label class="f gstonly" ${gst?"":"hidden"}><span>Client GSTIN</span><input name="cgstin" maxlength="15" style="text-transform:uppercase" value="${esc(cl.gstin||"")}"></label>
      <label class="f full"><span>Address</span><input name="caddress" value="${esc(cl.address||"")}"></label>
      <label class="f full gstonly" ${gst?"":"hidden"}><span>Place of supply (state)</span><select name="cstate"><option value="">Select state</option>${STATES.map(s=>`<option ${s===(cl.state||st.state)?"selected":""}>${s}</option>`).join("")}</select></label>
    </div>
    <div class="legend-s">Items</div>
    <div class="items" id="items">${items.map(it=>itemRow(it,gst)).join("")}</div>
    <button type="button" class="btn sm" style="margin-top:10px" data-act="addItem">${svg("plus")}Add item</button>
    <div class="totals" id="totals"></div>
    <div class="legend-s">Notes</div>
    <label class="f"><textarea name="notes" placeholder="${isQ?"Scope of work, delivery time, payment terms…":"Thank you for your business."}">${esc(d?.notes ?? "")}</textarea></label>
    <datalist id="clientList">${[...clientNames().keys()].map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
    <datalist id="matList">${S.materials.map(m=>`<option value="${esc(m.name)}">`).join("")}</datalist>
    <datalist id="unitList">${UNITS.map(u=>`<option value="${u}">`).join("")}</datalist>
  </form>`;
  openSheet(`${d?"Edit":"New"} ${isQ?"quotation":"invoice"}`, body, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="docForm">Save</button>`);
  recalcForm();
}
function readItems(form){
  return $$(".item", form).map(readRow).filter(it=>it.desc||it.material||it.rate);
}
function interOf(form){ const cs=form.cstate?.value, ms=S.settings.state; return !!(cs && ms && cs!==ms); }
function recalcForm(){
  const form=$("#docForm"); if(!form) return;
  const gst = form.gstMode.value==="gst"; const items=readItems(form); const inter=gst && interOf(form);
  const c = calc({gstMode:form.gstMode.value, inter, items});
  $$(".item",form).forEach(r=>{ const it=readRow(r); const a=lineAmt(it); const g = gst ? r2(a*(it.gst||0)/100):0;
    const area = it.pricing==="sqft" ? `${it.sqft.toFixed(2)} sq.ft${it.rate?` × ${inr(it.rate,2)}`:""}` : "";
    $(".lineamt",r).textContent = (area||a) ? [area, a?`Amount ${inr(a,2)}${gst&&g?` + GST ${inr(g,2)}`:""}`:""].filter(Boolean).join("  =  ") : ""; });
  let t = (c.area ? `<div class="muted"><span>Total area</span><span>${c.area.toFixed(2)} sq.ft</span></div>` : "") + `<div><span>Subtotal</span><span>${inr(c.sub,2)}</span></div>`;
  if(gst){ t += inter ? `<div><span>IGST</span><span>${inr(c.igst,2)}</span></div>` : `<div><span>CGST</span><span>${inr(c.cgst,2)}</span></div><div><span>SGST</span><span>${inr(c.sgst,2)}</span></div>`; }
  if(c.roundOff) t += `<div class="muted"><span>Round off</span><span>${c.roundOff>0?"+":""}${c.roundOff.toFixed(2)}</span></div>`;
  t += `<div class="gt"><span>Total</span><span>${inr(c.total,0)}</span></div>`;
  if(gst && !S.settings.state) t += `<p class="small muted" style="margin:6px 0 0">Tip: set your company state in Settings so CGST/SGST vs IGST is picked automatically.</p>`;
  $("#totals").innerHTML = t;
}
async function saveDoc(form){
  const kind=form.dataset.kind, id=form.dataset.id, isQ=kind==="quote";
  const items = readItems(form);
  if(!items.length){ toast("Add at least one item."); return; }
  const gstMode=form.gstMode.value, inter = gstMode==="gst" && interOf(form);
  const c = calc({gstMode, inter, items});
  const date=form.date.value;
  const doc = { no:form.no.value.trim(), date, fy:fyOf(date), gstMode, inter,
    client:{ name:form.cname.value.trim(), phone:form.cphone.value.trim(), address:form.caddress.value.trim(), gstin:(form.cgstin.value||"").trim().toUpperCase(), state:form.cstate.value },
    items, notes:form.notes.value.trim(), sub:c.sub, tax:c.tax, total:c.total, updatedAt:Date.now() };
  const m = doc.no.match(/(\d+)\s*$/); doc.seq = m ? +m[1] : 0;
  if(isQ) doc.validTill=form.validTill.value; else doc.dueDate=form.dueDate.value;
  const col = isQ?"quotes":"invoices";
  const fromQ = (!id && !isQ) ? S._fromQuote : null; if(fromQ) doc.quoteNo = fromQ.no;
  if(!id && (isQ?S.quotes:S.invoices).some(x=>x.no===doc.no)){ toast(`${doc.no} already exists. Change the number.`); return; }
  const btn=$(".sheet-f .pri"); if(btn) btn.disabled=true;
  let ref;
  const ok = await write(async()=>{
    if(id){ ref=S.db.collection(col).doc(id); await ref.update(doc); }
    else { ref=S.db.collection(col).doc(); await ref.set({...doc, createdAt:Date.now(), ...uidMeta(), ...(isQ?{status:"sent"}:{payments:[]})}); }
  }, `${isQ?"Quotation":"Invoice"} ${doc.no} saved`);
  if(btn) btn.disabled=false;
  if(ok){
    const cName = doc.client?.name?.trim();
    if(cName){
      const existingCli = S.clients.find(x => (x.name||"").trim().toLowerCase() === cName.toLowerCase());
      if(!existingCli){
        const newC = { name: cName, phone: doc.client.phone||"", gstin: doc.client.gstin||"", address: doc.client.address||"", state: doc.client.state||"", notes:"", createdAt: Date.now(), updatedAt: Date.now(), ...uidMeta() };
        const cliRef = S.db.collection("clients").doc();
        cliRef.set(newC).catch(()=>{});
        S.clients.push({ id: cliRef.id, ...newC });
      }
    }
    if(fromQ) await write(()=>S.db.collection("quotes").doc(fromQ.id).update({status:"accepted", invoiceId:ref.id, invoiceNo:doc.no}));
    closeSheet(); (isQ?dQuote:dInvoice)(ref.id);
  }
}

/* ---------- detail: invoice / quote ---------- */
function docBody(d, kind){
  const c = calc(d); const gst=d.gstMode==="gst";
  return `<div class="scrollx"><table class="tbl"><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th>${gst?`<th class="r">GST</th>`:""}<th class="r">Amount</th></tr></thead><tbody>
  ${c.rows.map(r=>`<tr><td>${esc(itemTitle(r))}${r.pricing==="sqft"?`<div class="small muted">${esc(itemSize(r))} × ${esc(r.qty)} pcs</div>`:""}${gst&&r.hsn?`<div class="small muted">HSN ${esc(r.hsn)}</div>`:""}</td><td class="r">${esc(qtyText(r))}</td><td class="r">${inr(r.rate,2)}${r.pricing==="sqft"?`<div class="small muted">/sq.ft</div>`:""}</td>${gst?`<td class="r">${esc(r.gst)}%</td>`:""}<td class="r">${inr(r.amt,2)}</td></tr>`).join("")}
  </tbody></table></div>
  <div class="totals">${c.area?`<div class="muted"><span>Total area</span><span>${c.area.toFixed(2)} sq.ft</span></div>`:""}<div><span>Subtotal</span><span>${inr(c.sub,2)}</span></div>
  ${gst ? (d.inter?`<div><span>IGST</span><span>${inr(c.igst,2)}</span></div>`:`<div><span>CGST</span><span>${inr(c.cgst,2)}</span></div><div><span>SGST</span><span>${inr(c.sgst,2)}</span></div>`):""}
  ${c.roundOff?`<div class="muted"><span>Round off</span><span>${c.roundOff.toFixed(2)}</span></div>`:""}
  <div class="gt"><span>Total</span><span>${inr(c.total,0)}</span></div></div>
  <p class="small muted" style="margin:6px 0 0">Rupees ${inWords(c.total)} only</p>
  ${d.notes?`<p class="small" style="white-space:pre-wrap">${esc(d.notes)}</p>`:""}`;
}
function dInvoice(id, refresh){
  const d=S.invoices.find(x=>x.id===id); if(!d){ missing("invoice",id,refresh); return; }
  const st=invStatus(d), paid=paidOf(d), due=r2((+d.total||0)-paid);
  const cl=d.client||{};
  let b = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div style="min-width:0"><div class="mono muted">${esc(d.no)}</div><div style="font-weight:700;font-size:17px">${esc(cl.name)}</div><div class="small muted">${esc([cl.phone, cl.gstin&&("GSTIN "+cl.gstin)].filter(Boolean).join(" · "))}</div></div><span class="chip ${st}">${st}</span></div>
  <div class="big" style="margin-top:8px">${inr(d.total)}</div>
  <dl class="dl" style="margin-top:6px"><dt>Date</dt><dd>${fmtDate(d.date)}</dd><dt>Due</dt><dd>${fmtDate(d.dueDate)}</dd><dt>Received</dt><dd class="num" style="color:var(--good)">${inr(paid)}</dd><dt>Balance</dt><dd class="num" style="font-weight:700">${inr(Math.max(0,due))}</dd>${d.quoteNo?`<dt>From quotation</dt><dd class="mono">${esc(d.quoteNo)}</dd>`:""}</dl>
  <div class="actions"><button class="btn pri" data-act="pdf" data-kind="invoice" data-id="${d.id}">${svg("dl")}PDF</button><button class="btn" data-act="shareWhatsApp" data-kind="invoice" data-id="${d.id}">${svg("wa")}WhatsApp</button>${S.canWrite&&st!=="paid"?`<button class="btn" data-act="payInvoice" data-id="${d.id}">Record payment</button>`:""}</div>`;
  if((d.payments||[]).length){ b += `<div class="legend-s">Payments received</div><div class="list">${d.payments.map((p,i)=>`<div class="row" style="cursor:default"><div class="av in">${svg("up")}</div><div class="main"><div class="t">${inr(p.amount)}</div><div class="s">${fmtDate(p.date)} · ${esc(p.mode||"")}${p.note?" · "+esc(p.note):""}</div></div>${S.canWrite?`<button class="btn sm danger" data-act="rmPay" data-col="invoices" data-id="${d.id}" data-i="${i}" aria-label="Remove payment">${svg("trash")}</button>`:""}</div>`).join("")}</div>`; }
  b += `<div class="legend-s">Items</div>` + docBody(d,"invoice");
  if(S.canWrite) b += `<div class="actions" style="margin-top:18px"><button class="btn" data-act="editInvoice" data-id="${d.id}">${svg("edit")}Edit</button><button class="btn" data-act="dupInvoice" data-id="${d.id}">Duplicate</button><button class="btn danger" data-act="delDoc" data-col="invoices" data-id="${d.id}">${svg("trash")}Delete</button></div>`;
  b += byLine(d);
  openSheet(d.gstMode==="gst"?"Tax invoice":"Invoice", b, "", {kind:"detail", type:"invoice", id});
}
function dQuote(id, refresh){
  const d=S.quotes.find(x=>x.id===id); if(!d){ missing("quote",id,refresh); return; }
  const st=d.status||"sent"; const cl=d.client||{};
  let b = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div style="min-width:0"><div class="mono muted">${esc(d.no)}</div><div style="font-weight:700;font-size:17px">${esc(cl.name)}</div><div class="small muted">${esc(cl.phone||"")}</div></div><span class="chip ${st}">${st}</span></div>
  <div class="big" style="margin-top:8px">${inr(d.total)}</div>
  <dl class="dl" style="margin-top:6px"><dt>Date</dt><dd>${fmtDate(d.date)}</dd><dt>Valid till</dt><dd>${fmtDate(d.validTill)}</dd>${d.invoiceNo?`<dt>Invoice</dt><dd class="mono">${esc(d.invoiceNo)}</dd>`:""}</dl>
  <div class="actions"><button class="btn pri" data-act="pdf" data-kind="quote" data-id="${d.id}">${svg("dl")}PDF</button><button class="btn" data-act="shareWhatsApp" data-kind="quote" data-id="${d.id}">${svg("wa")}WhatsApp</button>${S.canWrite&&!d.invoiceId?`<button class="btn" data-act="convertQuote" data-id="${d.id}">Convert to invoice</button>`:""}</div>`;
  if(S.canWrite) b += `<div class="seg" role="group" style="margin-top:8px">${["sent","accepted","rejected"].map(s=>`<button data-act="quoteStatus" data-id="${d.id}" data-v="${s}" aria-pressed="${st===s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join("")}</div>`;
  b += `<div class="legend-s">Items</div>` + docBody(d,"quote");
  if(S.canWrite) b += `<div class="actions" style="margin-top:18px"><button class="btn" data-act="editQuote" data-id="${d.id}">${svg("edit")}Edit</button><button class="btn danger" data-act="delDoc" data-col="quotes" data-id="${d.id}">${svg("trash")}Delete</button></div>`;
  b += byLine(d);
  openSheet("Quotation", b, "", {kind:"detail", type:"quote", id});
}
function byLine(d){
  if(!d.by) return "";
  const id=d.by; const nm=S.names[id];
  if(nm===undefined && S.user?.profiles){ S.names[id]=""; S.user.profiles([id]).then(ps=>{ S.names[id]=ps[id]?.name||""; refreshSheet(); }).catch(()=>{}); }
  return `<p class="small muted" style="margin-top:16px">Added by ${esc(S.names[id]||"a team member")}${d.createdAt?" on "+fmtDate(new Date(d.createdAt).toISOString().slice(0,10)):""}</p>`;
}
function waLink(d, kind){
  const co=S.settings.name||"us"; const isQ=kind==="quote";
  const txt = `Hello ${d.client?.name||""},\n${isQ?"Quotation":"Invoice"} ${d.no} dated ${fmtDate(d.date)} from ${co}.\nAmount: Rs. ${pdfAmt(d.total)}${!isQ&&d.dueDate?`\nDue by: ${fmtDate(d.dueDate)}`:""}${!isQ&&S.settings.upi?`\nPay via UPI: ${S.settings.upi}`:""}\nPDF attached. Thank you!`;
  const ph = (d.client?.phone||"").replace(/\D/g,""); const num = ph.length===10 ? "91"+ph : ph;
  return `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
}
function payForm(col, id){
  const d = (col==="invoices"?S.invoices:S.bills).find(x=>x.id===id); if(!d) return;
  const tot = col==="invoices" ? +d.total : +d.amount; const due=Math.max(0,r2(tot-paidOf(d)));
  openSheet(col==="invoices"?"Payment received":"Payment made", `<form id="payForm" data-form="pay" data-col="${col}" data-id="${id}"><div class="fg">
    <label class="f full"><span>Amount (₹) · balance ${inr(due)}</span><input name="amount" type="number" inputmode="decimal" step="any" min="0.01" required value="${due||""}"></label>
    <label class="f"><span>Date</span><input name="date" type="date" required value="${today()}"></label>
    <label class="f"><span>Mode</span><select name="mode">${MODES.map(m=>`<option>${m}</option>`).join("")}</select></label>
    <label class="f full"><span>Reference / note</span><input name="note" placeholder="UTR no., cheque no.…"></label></div></form>`,
    `<button class="btn" data-act="back">Back</button><button class="btn pri" type="submit" form="payForm">Save payment</button>`);
  S._back = () => (col==="invoices"?dInvoice:dBill)(id);
}
async function savePay(form){
  const col=form.dataset.col, id=form.dataset.id; const d=(col==="invoices"?S.invoices:S.bills).find(x=>x.id===id); if(!d) return;
  const p={amount:r2(form.amount.value), date:form.date.value, mode:form.mode.value, note:form.note.value.trim(), at:Date.now(), ...uidMeta()};
  if(!(p.amount>0)){ toast("Enter an amount."); return; }
  const ok = await write(()=>S.db.collection(col).doc(id).update({payments:[...(d.payments||[]), p], updatedAt:Date.now()}), "Payment saved");
  if(ok) (col==="invoices"?dInvoice:dBill)(id);
}

/* ---------- PDF ---------- */
async function loadImg(idOrUrl){
  if(!idOrUrl) return null;
  try{
    const url = (idOrUrl.startsWith("/") || idOrUrl.startsWith("http") || idOrUrl.startsWith("data:")) ? idOrUrl : fileUrl(idOrUrl);
    const r = await fetch(url);
    if(!r.ok) return null;
    const blob = await r.blob();
    const data = await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(blob); });
    const dim = await new Promise((res)=>{ const im=new Image(); im.onload=()=>res({w:im.naturalWidth,h:im.naturalHeight}); im.onerror=()=>res({w:1,h:1}); im.src=data; });
    let fmt = /png/.test(blob.type)?"PNG":"JPEG";
    if(/webp|svg/.test(blob.type)){ // convert to PNG for jsPDF
      const c=document.createElement("canvas"); c.width=dim.w; c.height=dim.h; const im=new Image(); im.src=data; await im.decode(); c.getContext("2d").drawImage(im,0,0); return {data:c.toDataURL("image/png"), fmt:"PNG", ...dim};
    }
    return {data, fmt, ...dim};
  }catch(e){
    console.warn("loadImg failed:", idOrUrl, e);
    return null;
  }
}

async function buildPDFDoc(d, kind){
  if(!window.jspdf){ toast("PDF tool did not load. Check internet and reopen."); return null; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"mm", format:"a4"});
  const W=210, H=297, M=13;
  const contentWidth = W - 2*M; // 184 mm
  const st = S.settings || {};
  const c = calc(d);
  const gst = d.gstMode==="gst";
  const isQ = kind==="quote";
  const cl = d.client || {};

  const ORANGE = [232, 128, 42];     // #E8802A brand orange stripe
  const INK = [20, 20, 20];          // Dark text
  const BORDER = [35, 35, 35];       // Clean table borders
  const MUT = [90, 90, 90];          // Muted labels
  const TH_BG = [238, 238, 238];     // Shaded table header
  const GRAND_BG = [247, 222, 199];  // Soft peach/beige grand total highlight

  const pdfSafe = t => String(t||"").replace(/[×]/g,"x").replace(/[–—]/g,"-").replace(/[^\x20-\x7E\n]/g,"");

  let y = 10;

  // 1. Logo (top left)
  let logo = null;
  if(st.logoId) {
    logo = await loadImg(st.logoId);
  }
  if(!logo) {
    logo = await loadImg("/icons/the_wooden_art_logo.png");
  }

  if(logo && logo.w && logo.h) {
    const maxH = 18;
    const maxW = 55;
    const ratio = logo.w / logo.h;
    let lh = maxH;
    let lw = lh * ratio;
    if(lw > maxW) {
      lw = maxW;
      lh = lw / ratio;
    }
    doc.addImage(logo.data, logo.fmt, M, y + (maxH - lh)/2, lw, lh);
  } else {
    doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.setTextColor(...INK);
    doc.text((st.name || "THE WOODEN ART").toUpperCase(), M, y + 8);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...MUT);
    doc.text("Interior & Exterior Hub", M, y + 13);
  }

  // 2. Full-width Orange Bar below logo
  y = 31;
  doc.setFillColor(...ORANGE);
  doc.rect(M, y, contentWidth, 3.8, "F");
  y += 6.5;

  // 3. Document Title Box (INVOICE / QUOTATION)
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.35);
  doc.setFillColor(255, 255, 255);
  doc.rect(M, y, contentWidth, 8, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  const docTitle = isQ ? "QUOTATION" : (gst ? "TAX INVOICE" : "INVOICE");
  doc.text(docTitle, W / 2, y + 5.6, { align: "center" });
  y += 9.5;

  // 4. Customer & Order Info Grid
  const cw1 = 92;
  const cw2 = contentWidth - cw1; // 92
  const r1h = 6.8;
  const r2h = 6.8;
  doc.setFontSize(8.5);
  const addrText = cl.address ? pdfSafe(cl.address) : "—";
  const addrLines = doc.splitTextToSize(addrText, contentWidth - 26);
  const r3h = Math.max(6.8, addrLines.length * 3.8 + 2.8);
  const custTableH = r1h + r2h + r3h;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(M, y, contentWidth, custTableH, "S");
  doc.line(M, y + r1h, M + contentWidth, y + r1h);
  doc.line(M, y + r1h + r2h, M + contentWidth, y + r1h + r2h);
  doc.line(M + cw1, y, M + cw1, y + r1h + r2h);

  // Row 1
  doc.setFont("helvetica", "bold"); doc.setTextColor(...INK);
  doc.text("Customer:", M + 2.5, y + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(pdfSafe(cl.name || "—"), cw1 - 24)[0], M + 22, y + 4.6);

  doc.setFont("helvetica", "bold");
  doc.text(isQ ? "Quotation No:" : "Order No:", M + cw1 + 2.5, y + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(String(d.no || "—"), M + cw1 + 26, y + 4.6);

  // Row 2
  doc.setFont("helvetica", "bold");
  doc.text("Mobile No:", M + 2.5, y + r1h + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(cl.phone ? String(cl.phone) : "—", M + 22, y + r1h + 4.6);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", M + cw1 + 2.5, y + r1h + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(d.date), M + cw1 + 26, y + r1h + 4.6);

  // Row 3 (Address)
  doc.setFont("helvetica", "bold");
  doc.text("Address:", M + 2.5, y + r1h + r2h + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(addrLines, M + 22, y + r1h + r2h + 4.6);

  y += custTableH + 5;

  // 5. Line Items Table
  // Columns: SN. NO (14), Description (72), Sq/Ft (18), Rate (20), Amount (22), Qty (16), Total (22)
  const cols = [
    { title: "SN.\nNO", w: 14, align: "center" },
    { title: "Description", w: 72, align: "left" },
    { title: "Sq/Ft", w: 18, align: "right" },
    { title: "Rate", w: 20, align: "right" },
    { title: "Amount", w: 22, align: "right" },
    { title: "Qty", w: 16, align: "center" },
    { title: "Total", w: 22, align: "right" }
  ];

  let xs = [];
  let curX = M;
  cols.forEach(col => { xs.push(curX); curX += col.w; });

  const drawTableHeader = () => {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.setFillColor(...TH_BG);
    doc.rect(M, y, contentWidth, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...INK);

    cols.forEach((col, idx) => {
      const cx = xs[idx];
      if(idx > 0) doc.line(cx, y, cx, y + 8);
      if(col.align === "center") {
        const lines = col.title.split("\n");
        if(lines.length > 1) {
          doc.text(lines[0], cx + col.w / 2, y + 3.2, { align: "center" });
          doc.text(lines[1], cx + col.w / 2, y + 6.6, { align: "center" });
        } else {
          doc.text(col.title, cx + col.w / 2, y + 5.2, { align: "center" });
        }
      } else if(col.align === "right") {
        doc.text(col.title, cx + col.w - 2.5, y + 5.2, { align: "right" });
      } else {
        doc.text(col.title, cx + 2.5, y + 5.2, { align: "left" });
      }
    });
    y += 8;
  };

  drawTableHeader();

  // Print Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  c.rows.forEach((r, idx) => {
    const isSqft = r.pricing === "sqft";
    const title = pdfSafe(itemTitle(r));
    const descLines = doc.splitTextToSize(title, cols[1].w - 4);
    const rh = Math.max(6.8, descLines.length * 3.8 + 2.8);

    if(y + rh > H - 25) {
      doc.addPage();
      y = M;
      drawTableHeader();
    }

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    // Draw cells
    cols.forEach((col, cIdx) => {
      doc.rect(xs[cIdx], y, col.w, rh, "S");
    });

    // Values
    const snText = String(idx + 1);

    const pieceSqft = isSqft ? r2((+r.l || 0) * (+r.w || 0) * ((DIMS[r.du] || DIMS.in).f)) : 0;
    const sqftText = (isSqft && pieceSqft > 0) ? pieceSqft.toFixed(2) : (isSqft && r.sqft ? (r.sqft / (r.qty || 1)).toFixed(2) : "—");

    const rateText = pdfAmt(r.rate);
    const pieceAmt = (isSqft && pieceSqft > 0) ? r2(pieceSqft * (+r.rate || 0)) : (+r.rate || 0);
    const amtText = pdfAmt(pieceAmt);
    const qtyText = String(r.qty || 1);
    const totText = pdfAmt(r.amt);

    const vals = [snText, descLines, sqftText, rateText, amtText, qtyText, totText];

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);

    vals.forEach((v, cIdx) => {
      const col = cols[cIdx];
      const cx = xs[cIdx];
      if(col.align === "center") {
        doc.text(v, cx + col.w / 2, y + 4.5, { align: "center" });
      } else if(col.align === "right") {
        doc.text(v, cx + col.w - 2.5, y + 4.5, { align: "right" });
      } else {
        doc.text(v, cx + 2.5, y + 4.5, { align: "left" });
      }
    });

    y += rh;
  });

  y += 5;

  // 6. Payment Details & Amount Summary Section
  let qrImg = null;
  if(!isQ && st.qrId) {
    qrImg = await loadImg(st.qrId);
  }

  let totalJobQty = c.rows.reduce((sum, r) => sum + (+r.qty || 1), 0);
  const summaryRows = [
    ["Total Job Qty", String(totalJobQty)],
    ["Sub Total", pdfAmt(c.sub)]
  ];
  if(gst) {
    if(d.inter) {
      summaryRows.push(["IGST", pdfAmt(c.igst)]);
    } else {
      summaryRows.push(["CGST", pdfAmt(c.cgst)]);
      summaryRows.push(["SGST", pdfAmt(c.sgst)]);
    }
  }
  if(c.roundOff) {
    summaryRows.push(["Round Off", (c.roundOff > 0 ? "+" : "") + c.roundOff.toFixed(2)]);
  }

  const paymentRows = [
    ["Account Number:", st.accNo || "—"],
    ["Bank Name:", st.bankName || "—"],
    ["Account Type:", st.accType || "Savings"],
    ["Account Holder:", st.accName || "—"],
    ["IFSC Code:", st.ifsc || "—"]
  ];
  if(!qrImg && st.upi) {
    paymentRows.push(["UPI ID:", st.upi]);
  }

  const numPaymentRows = paymentRows.length;
  const numSummaryRows = summaryRows.length + 1; // +1 for Grand Total
  const maxRows = Math.max(numPaymentRows, numSummaryRows);
  const rowHeight = 5.6;
  const boxHeaderH = 6.5;
  const totalBoxH = isQ ? (boxHeaderH + numSummaryRows * rowHeight) : (boxHeaderH + maxRows * rowHeight);

  if(y + totalBoxH + 45 > H - 15) {
    doc.addPage();
    y = M;
  }

  const startY = y;

  if(isQ) {
    // Quotations: No Bank Details & No Payment QR code. Only Amount Summary on the right!
    const wSum = 85;
    const xSum = W - M - wSum;

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.setFillColor(...TH_BG);
    doc.rect(xSum, startY, wSum, boxHeaderH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text("Amount Summary", xSum + wSum / 2, startY + 4.5, { align: "center" });

    let sy = startY + boxHeaderH;
    const wSumLabel = 48;
    summaryRows.forEach(([k, v]) => {
      doc.rect(xSum, sy, wSum, rowHeight, "S");
      doc.line(xSum + wSumLabel, sy, xSum + wSumLabel, sy + rowHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.text(k, xSum + 2.5, sy + 3.9);
      doc.setFont("helvetica", "normal");
      doc.text(v, xSum + wSum - 2.5, sy + 3.9, { align: "right" });
      sy += rowHeight;
    });

    // Grand Total Row
    doc.setFillColor(...GRAND_BG);
    doc.rect(xSum, sy, wSum, rowHeight, "FD");
    doc.line(xSum + wSumLabel, sy, xSum + wSumLabel, sy + rowHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text("Grand Total", xSum + 2.5, sy + 3.9);
    doc.text(pdfAmt(c.total), xSum + wSum - 2.5, sy + 3.9, { align: "right" });
    sy += rowHeight;

  } else if(qrImg && qrImg.w && qrImg.h) {
    // Invoices with Payment QR: 3 columns: Bank Details (82mm), QR Box (34mm), Summary (64mm)
    const wBank = 82;
    const wQr = 34;
    const wSum = 64;
    const xBank = M;
    const xQr = M + wBank + 2;
    const xSum = xQr + wQr + 2;

    // A. Bank Details Box
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.setFillColor(...TH_BG);
    doc.rect(xBank, startY, wBank, boxHeaderH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text("Payment Details", xBank + wBank / 2, startY + 4.5, { align: "center" });

    let py = startY + boxHeaderH;
    paymentRows.forEach(([k, v]) => {
      doc.rect(xBank, py, wBank, rowHeight, "S");
      doc.line(xBank + 32, py, xBank + 32, py + rowHeight);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(k, xBank + 2, py + 3.9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(doc.splitTextToSize(v, wBank - 34)[0], xBank + 34, py + 3.9);
      py += rowHeight;
    });
    for(let i = paymentRows.length; i < maxRows; i++) {
      doc.rect(xBank, py, wBank, rowHeight, "S");
      py += rowHeight;
    }

    // B. QR Box
    doc.rect(xQr, startY, wQr, totalBoxH, "S");
    doc.setFillColor(...TH_BG);
    doc.rect(xQr, startY, wQr, boxHeaderH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Scan to Pay", xQr + wQr / 2, startY + 4.5, { align: "center" });

    const qrSize = Math.min(wQr - 6, totalBoxH - boxHeaderH - 8, 25);
    const qrX = xQr + (wQr - qrSize) / 2;
    const qrY = startY + boxHeaderH + 1.5;
    doc.addImage(qrImg.data, qrImg.fmt, qrX, qrY, qrSize, qrSize);

    if(st.upi) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(...INK);
      doc.text(doc.splitTextToSize(st.upi, wQr - 2)[0], xQr + wQr / 2, qrY + qrSize + 3.5, { align: "center" });
    }

    // C. Amount Summary Box
    doc.setFillColor(...TH_BG);
    doc.rect(xSum, startY, wSum, boxHeaderH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Amount Summary", xSum + wSum / 2, startY + 4.5, { align: "center" });

    let sy = startY + boxHeaderH;
    const wSumLabel = 36;
    summaryRows.forEach(([k, v]) => {
      doc.rect(xSum, sy, wSum, rowHeight, "S");
      doc.line(xSum + wSumLabel, sy, xSum + wSumLabel, sy + rowHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.text(k, xSum + 2, sy + 3.9);
      doc.setFont("helvetica", "normal");
      doc.text(v, xSum + wSum - 2.5, sy + 3.9, { align: "right" });
      sy += rowHeight;
    });

    // Grand Total Row (with peach/beige highlight!)
    doc.setFillColor(...GRAND_BG);
    doc.rect(xSum, sy, wSum, rowHeight, "FD");
    doc.line(xSum + wSumLabel, sy, xSum + wSumLabel, sy + rowHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text("Grand Total", xSum + 2, sy + 3.9);
    doc.text(pdfAmt(c.total), xSum + wSum - 2.5, sy + 3.9, { align: "right" });
    sy += rowHeight;

    for(let i = summaryRows.length + 1; i < maxRows; i++) {
      doc.rect(xSum, sy, wSum, rowHeight, "S");
      sy += rowHeight;
    }

  } else {
    // Invoices without QR: 2 columns: Bank Details (104mm), Summary (78mm)
    const wBank = 104;
    const wSum = 78;
    const xBank = M;
    const xSum = M + wBank + 2;

    // Bank Details
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.setFillColor(...TH_BG);
    doc.rect(xBank, startY, wBank, boxHeaderH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text("Payment Details", xBank + wBank / 2, startY + 4.5, { align: "center" });

    let py = startY + boxHeaderH;
    paymentRows.forEach(([k, v]) => {
      doc.rect(xBank, py, wBank, rowHeight, "S");
      doc.line(xBank + 36, py, xBank + 36, py + rowHeight);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      doc.text(k, xBank + 2.5, py + 3.9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.text(doc.splitTextToSize(v, wBank - 38)[0], xBank + 38, py + 3.9);
      py += rowHeight;
    });
    for(let i = paymentRows.length; i < maxRows; i++) {
      doc.rect(xBank, py, wBank, rowHeight, "S");
      py += rowHeight;
    }

    // Amount Summary
    doc.setFillColor(...TH_BG);
    doc.rect(xSum, startY, wSum, boxHeaderH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Amount Summary", xSum + wSum / 2, startY + 4.5, { align: "center" });

    let sy = startY + boxHeaderH;
    const wSumLabel = 44;
    summaryRows.forEach(([k, v]) => {
      doc.rect(xSum, sy, wSum, rowHeight, "S");
      doc.line(xSum + wSumLabel, sy, xSum + wSumLabel, sy + rowHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.text(k, xSum + 2.5, sy + 3.9);
      doc.setFont("helvetica", "normal");
      doc.text(v, xSum + wSum - 2.5, sy + 3.9, { align: "right" });
      sy += rowHeight;
    });

    // Grand Total Row
    doc.setFillColor(...GRAND_BG);
    doc.rect(xSum, sy, wSum, rowHeight, "FD");
    doc.line(xSum + wSumLabel, sy, xSum + wSumLabel, sy + rowHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text("Grand Total", xSum + 2.5, sy + 3.9);
    doc.text(pdfAmt(c.total), xSum + wSum - 2.5, sy + 3.9, { align: "right" });
    sy += rowHeight;

    for(let i = summaryRows.length + 1; i < maxRows; i++) {
      doc.rect(xSum, sy, wSum, rowHeight, "S");
      sy += rowHeight;
    }
  }

  y = startY + totalBoxH + 5;

  // 7. Payment terms and info & instructions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(...INK);
  doc.text(isQ ? "Terms & Conditions" : "Payment terms and info & instructions", M, y);
  y += 4.2;

  const defaultBullets = isQ ? [
    "This quotation is valid for 15 days from the date of issue.",
    "Order confirmation will be processed upon approval and agreement of terms.",
    "Goods once delivered will not be returned or exchanged, except in case of manufacturing defects."
  ] : [
    "100% payment is required before delivery. Delivery will be scheduled after payment confirmation.",
    "Goods once delivered will not be returned or exchanged, except in case of manufacturing defects.",
    "Please verify all order details before payment."
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(40, 40, 40);

  defaultBullets.forEach(b => {
    doc.text("•  " + b, M + 1, y);
    y += 3.6;
  });

  if(st.terms) {
    const extraTerms = doc.splitTextToSize(pdfSafe(st.terms), contentWidth - 4);
    extraTerms.forEach(t => {
      doc.text("•  " + t, M + 1, y);
      y += 3.6;
    });
  }

  if(d.notes) {
    const notesText = doc.splitTextToSize("Note: " + pdfSafe(d.notes), contentWidth - 4);
    notesText.forEach(nt => {
      doc.text("•  " + nt, M + 1, y);
      y += 3.6;
    });
  }

  // 8. Signatory & Bottom Footer
  let sy = Math.max(y + 6, H - 32);
  if(sy > H - 16) {
    doc.addPage();
    sy = H - 32;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text("For " + (st.name || "THE WOODEN ART"), W - M, sy, { align: "right" });
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(W - M - 52, sy + 13, W - M, sy + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUT);
  doc.text("Authorised Signatory", W - M, sy + 17, { align: "right" });

  const totalPages = doc.getNumberOfPages();
  for(let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...MUT);
    doc.text(isQ ? "This is a computer generated quotation." : "This is a computer generated invoice.", M, H - 6);
    if(totalPages > 1) {
      doc.text(`Page ${p} of ${totalPages}`, W - M, H - 6, { align: "right" });
    }
  }

  const fname = `${(isQ ? "Quotation" : "Invoice")}_${(d.no || "").replace(/[^\w-]+/g, "-")}_${(cl.name || "").replace(/[^\w]+/g, "-").slice(0, 30)}.pdf`.replace(/-+/g, "-");
  const blob = doc.output("blob");
  return { doc, blob, fname };
}

async function makePDF(d, kind){
  const res = await buildPDFDoc(d, kind);
  if(!res) return;
  const { blob, fname } = res;
  if(!S.dl) { toast("Download not available in this view."); return; }
  try {
    await S.dl.save({ filename: fname, data: blob });
  } catch(e) {
    if(e?.code !== "declined") toast("Could not save PDF.");
  }
}

async function shareWhatsApp(d, kind){
  toast("Preparing PDF for WhatsApp…");
  const res = await buildPDFDoc(d, kind);
  if(!res) return;
  const { blob, fname } = res;
  const co = S.settings.name || "us";
  const isQ = kind === "quote";
  const txt = `Hello ${d.client?.name || ""},\n${isQ ? "Quotation" : "Invoice"} ${d.no} dated ${fmtDate(d.date)} from ${co}.\nAmount: Rs. ${pdfAmt(d.total)}${!isQ && d.dueDate ? `\nDue by: ${fmtDate(d.dueDate)}` : ""}${!isQ && S.settings.upi ? `\nPay via UPI: ${S.settings.upi}` : ""}\nPDF attached. Thank you!`;
  const ph = (d.client?.phone || "").replace(/\D/g, "");
  const num = ph.length === 10 ? "91" + ph : ph;

  let file = null;
  try {
    file = new File([blob], fname, { type: "application/pdf" });
  } catch(e) {}

  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: fname,
        text: txt,
      });
      return;
    } catch(err) {
      if(err?.name === "AbortError") return;
    }
  }

  // Fallback for desktop / browsers without Web Share file support:
  try {
    if (S.dl) await S.dl.save({ filename: fname, data: blob });
  } catch(e) {}
  const waUrl = `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
  window.open(waUrl, "_blank");
  toast("PDF download ho gaya hai! WhatsApp chat me attach karein.");
}

/* ---------- txn ---------- */
function txnForm(type, existing){
  const t = existing || {}; type = t.type || type || "expense"; S.formFiles = (t.files||[]).map(f=>({...f}));
  const cats = type==="income"?INC_CATS:EXP_CATS;
  openSheet(`${existing?"Edit":"Add"} ${type}`, `<form id="txnForm" data-form="txn" data-id="${t.id||""}">
    <div class="seg" role="group" style="margin-bottom:14px"><button type="button" data-act="txnType" data-v="income" aria-pressed="${type==="income"}">Income</button><button type="button" data-act="txnType" data-v="expense" aria-pressed="${type==="expense"}">Expense</button></div>
    <input type="hidden" name="type" value="${type}">
    <div class="fg">
      <label class="f full"><span>Amount (₹)</span><input name="amount" type="number" inputmode="decimal" step="any" min="0.01" required value="${esc(t.amount||"")}" style="font-size:20px;font-weight:700"></label>
      <label class="f"><span>Date</span><input name="date" type="date" required value="${esc(t.date||today())}"></label>
      <label class="f"><span>Paid ${type==="income"?"by":"via"}</span><select name="mode">${MODES.map(m=>`<option ${m===t.mode?"selected":""}>${m}</option>`).join("")}</select></label>
      <label class="f full"><span>Category</span><select name="category">${cats.map(c=>`<option ${c===t.category?"selected":""}>${c}</option>`).join("")}</select></label>
      <label class="f full"><span>${type==="income"?"Received from":"Paid to"}</span><input name="party" value="${esc(t.party||"")}" placeholder="Name"></label>
      <label class="f full"><span>Note</span><input name="note" value="${esc(t.note||"")}"></label>
    </div>
    <div class="legend-s">Receipt / bill photo</div>${filesField("Gallery / PDF")}
  </form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="txnForm">Save</button>`);
}
async function saveTxn(form){
  if(S.formFiles.some(f=>f.pending)){ toast("Wait for the upload to finish."); return; }
  const id=form.dataset.id;
  const t = { type:form.type.value, amount:r2(form.amount.value), date:form.date.value, mode:form.mode.value, category:form.category.value, party:form.party.value.trim(), note:form.note.value.trim(), files:S.formFiles.map(({id,type,name})=>({id,type,name})), updatedAt:Date.now() };
  if(!(t.amount>0)){ toast("Enter an amount."); return; }
  const ok = await write(()=> id ? S.db.collection("txns").doc(id).update(t) : S.db.collection("txns").add({...t, createdAt:Date.now(), ...uidMeta()}), `${t.type==="income"?"Income":"Expense"} saved`);
  if(ok){ closeSheet(); S.month=t.date.slice(0,7); if(S.view!=="money"&&S.view!=="home"){ S.view="money"; } render(); }
}
function dTxn(id, refresh){
  const t=S.txns.find(x=>x.id===id); if(!t){ missing("txn",id,refresh); return; }
  const inc=t.type==="income";
  let b=`<div class="big" style="color:var(--${inc?"good":"bad"})">${inc?"+":"−"}${inr(t.amount)}</div>
  <dl class="dl" style="margin-top:8px"><dt>Type</dt><dd>${inc?"Income":"Expense"}</dd><dt>Date</dt><dd>${fmtDate(t.date)}</dd><dt>Category</dt><dd>${esc(t.category)}</dd><dt>${inc?"From":"To"}</dt><dd>${esc(t.party||"—")}</dd><dt>Mode</dt><dd>${esc(t.mode)}</dd>${t.note?`<dt>Note</dt><dd>${esc(t.note)}</dd>`:""}</dl>`;
  if(t.files?.length) b+=`<div class="legend-s">Attachments</div><div class="files">${filesThumbs(t.files,false)}</div>`;
  if(S.canWrite) b+=`<div class="actions" style="margin-top:18px"><button class="btn" data-act="editTxn" data-id="${t.id}">${svg("edit")}Edit</button><button class="btn danger" data-act="delSimple" data-col="txns" data-id="${t.id}">${svg("trash")}Delete</button></div>`;
  b += byLine(t);
  openSheet(inc?"Income":"Expense", b, "", {kind:"detail", type:"txn", id});
}

/* ---------- materials ---------- */
function materialForm(m){
  m=m||{};
  openSheet(m.id?"Edit material":"Add material", `<form id="matForm" data-form="mat" data-id="${m.id||""}"><div class="fg">
    <label class="f full"><span>Material name</span><input name="name" required value="${esc(m.name||"")}" placeholder="e.g. Acrylic 3mm Clear"></label>
    <label class="f"><span>Type</span><select name="category"><option value="">Select</option>${MATS.map(x=>`<option ${x===m.category?"selected":""}>${x}</option>`).join("")}</select></label>
    <label class="f"><span>Thickness (mm)</span><input name="thick" type="number" inputmode="decimal" step="any" min="0" value="${esc(m.thick??"")}"></label>
    <label class="f"><span>Stock unit</span><input name="unit" list="unitList2" value="${esc(m.unit||"Sq.ft")}"></label>
    <label class="f"><span>Purchase rate (₹/unit)</span><input name="rate" type="number" inputmode="decimal" step="any" min="0" value="${esc(m.rate??"")}"></label>
    <label class="f full"><span>Selling rate for invoice (₹/unit)</span><input name="saleRate" type="number" inputmode="decimal" step="any" min="0" value="${esc(m.saleRate??"")}" placeholder="Filled automatically when you pick this material"></label>
    <label class="f"><span>HSN code</span><input name="hsn" inputmode="numeric" value="${esc(m.hsn||"")}"></label>
    <label class="f"><span>${m.id?"Opening stock":"Current stock"}</span><input name="opening" type="number" inputmode="decimal" step="any" value="${esc(m.opening??0)}"></label>
    <label class="f"><span>Alert when below</span><input name="minStock" type="number" inputmode="decimal" step="any" min="0" value="${esc(m.minStock??"")}"></label>
  </div><datalist id="unitList2">${UNITS.map(u=>`<option value="${u}">`).join("")}</datalist></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="matForm">Save</button>`);
}
async function saveMat(form){
  const id=form.dataset.id;
  const m={ name:form.name.value.trim(), unit:form.unit.value.trim()||"Sq.ft", category:form.category.value, thick:form.thick.value, saleRate:r2(form.saleRate.value), rate:r2(form.rate.value), hsn:form.hsn.value.trim(), opening:+form.opening.value||0, minStock:+form.minStock.value||0, updatedAt:Date.now() };
  if(!m.name){ toast("Enter a name."); return; }
  let ref; const ok = await write(async()=>{ if(id){ ref=S.db.collection("materials").doc(id); await ref.update(m);} else { ref=S.db.collection("materials").doc(); await ref.set({...m, createdAt:Date.now(), ...uidMeta()}); } }, "Material saved");
  if(ok){ closeSheet(); dMaterial(ref.id); }
}
function dMaterial(id, refresh){
  const m=matById(id); if(!m){ missing("material",id,refresh); return; }
  const s=stockOf(m), st=stockState(m); const mv=S.moves.filter(x=>x.materialId===id).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  let b=`<div style="display:flex;justify-content:space-between;align-items:center"><div class="big">${s} <span style="font-size:18px">${esc(m.unit||"")}</span></div>${st!=="ok"?`<span class="chip ${st}">${st==="out"?"out of stock":"low stock"}</span>`:`<span class="chip ok">in stock</span>`}</div>
  <dl class="dl" style="margin-top:8px"><dt>Purchase rate</dt><dd>${m.rate?inr(m.rate,2)+" / "+esc(m.unit||"unit"):"—"}</dd><dt>Selling rate</dt><dd>${m.saleRate?inr(m.saleRate,2)+" / "+esc(m.unit||"unit"):"—"}</dd>${m.thick?`<dt>Thickness</dt><dd>${esc(m.thick)} mm</dd>`:""}<dt>Stock value</dt><dd>${inr(Math.max(0,s)*(+m.rate||0))}</dd><dt>Opening stock</dt><dd>${esc(m.opening||0)}</dd><dt>Alert below</dt><dd>${esc(m.minStock||"—")}</dd>${m.hsn?`<dt>HSN</dt><dd>${esc(m.hsn)}</dd>`:""}${m.category?`<dt>Category</dt><dd>${esc(m.category)}</dd>`:""}</dl>`;
  if(S.canWrite) b+=`<div class="actions"><button class="btn pri" data-act="moveForm" data-id="${id}" data-type="in">${svg("down")}Stock in</button><button class="btn" data-act="moveForm" data-id="${id}" data-type="out">${svg("up")}Stock out</button></div>`;
  b+=`<div class="legend-s">History (${mv.length})</div>` + (mv.length?`<div class="list">${mv.map(x=>{const inn=x.type==="in"; return `<button class="row" data-act="openMove" data-id="${x.id}"><div class="av ${inn?"in":"out"}">${svg(inn?"down":"up")}</div><div class="main"><div class="t">${inn?"Stock in":"Stock out"}${x.ref?" · "+esc(x.ref):""}</div><div class="s">${fmtDate(x.date)}${x.note?" · "+esc(x.note):""}</div></div><div class="amt"><b style="color:var(--${inn?"good":"bad"})">${inn?"+":"−"}${esc(x.qty)}</b></div></button>`;}).join("")}</div>`:`<p class="small muted">No movements yet.</p>`);
  if(S.canWrite) b+=`<div class="actions" style="margin-top:18px"><button class="btn" data-act="editMaterial" data-id="${id}">${svg("edit")}Edit</button><button class="btn danger" data-act="delMaterial" data-id="${id}">${svg("trash")}Delete</button></div>`;
  openSheet(m.name, b, "", {kind:"detail", type:"material", id});
}
function moveForm(matId, type){
  const m=matById(matId); if(!m) return;
  openSheet(`${type==="in"?"Stock in":"Stock out"} · ${m.name}`, `<form id="moveForm" data-form="move" data-mat="${matId}" data-type="${type}"><div class="fg">
    <label class="f"><span>Quantity (${esc(m.unit||"units")})</span><input name="qty" type="number" inputmode="decimal" step="any" min="0.001" required autofocus></label>
    <label class="f"><span>Date</span><input name="date" type="date" required value="${today()}"></label>
    <label class="f full"><span>${type==="in"?"Bill no. / supplier":"Used for (job / client)"}</span><input name="ref"></label>
    <label class="f full"><span>Note</span><input name="note"></label>
  </div><p class="small muted">Current stock: ${stockOf(m)} ${esc(m.unit||"")}</p></form>`, `<button class="btn" data-act="back">Back</button><button class="btn pri" type="submit" form="moveForm">Save</button>`);
  S._back=()=>dMaterial(matId);
}
async function saveMove(form){
  const x={ materialId:form.dataset.mat, type:form.dataset.type, qty:+form.qty.value||0, date:form.date.value, ref:form.ref.value.trim(), note:form.note.value.trim(), createdAt:Date.now(), ...uidMeta() };
  if(!(x.qty>0)){ toast("Enter quantity."); return; }
  const ok = await write(()=>S.db.collection("moves").add(x), "Stock updated");
  if(ok) dMaterial(x.materialId);
}
function dMove(id, refresh){
  const x=S.moves.find(v=>v.id===id); if(!x){ missing("move",id,refresh); return; } const m=matById(x.materialId)||{};
  let b=`<div class="big">${x.type==="in"?"+":"−"}${esc(x.qty)} ${esc(m.unit||"")}</div><dl class="dl" style="margin-top:8px"><dt>Material</dt><dd>${esc(m.name||"Deleted")}</dd><dt>Type</dt><dd>${x.type==="in"?"Stock in":"Stock out"}</dd><dt>Date</dt><dd>${fmtDate(x.date)}</dd>${x.ref?`<dt>Reference</dt><dd>${esc(x.ref)}</dd>`:""}${x.note?`<dt>Note</dt><dd>${esc(x.note)}</dd>`:""}</dl>`;
  if(S.canWrite) b+=`<div class="actions" style="margin-top:18px"><button class="btn danger" data-act="delSimple" data-col="moves" data-id="${id}">${svg("trash")}Delete entry</button></div>`;
  b+=byLine(x);
  openSheet("Stock entry", b, "", {kind:"detail", type:"move", id});
}

/* ---------- vendors & bills ---------- */
function vendorForm(v, after){
  v=v||{}; S._afterVendor = after||null;
  openSheet(v.id?"Edit vendor":"Add vendor", `<form id="venForm" data-form="ven" data-id="${v.id||""}"><div class="fg">
    <label class="f full"><span>Vendor / supplier name</span><input name="name" required value="${esc(v.name||"")}"></label>
    <label class="f"><span>Phone</span><input name="phone" type="tel" inputmode="tel" value="${esc(v.phone||"")}"></label>
    <label class="f"><span>GSTIN</span><input name="gstin" maxlength="15" style="text-transform:uppercase" value="${esc(v.gstin||"")}"></label>
    <label class="f full"><span>Address</span><input name="address" value="${esc(v.address||"")}"></label>
    <label class="f full"><span>Supplies / note</span><input name="note" value="${esc(v.note||"")}" placeholder="e.g. Acrylic sheets, MS plates"></label>
  </div></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="venForm">Save</button>`);
}
async function saveVen(form){
  const id=form.dataset.id; const v={ name:form.name.value.trim(), phone:form.phone.value.trim(), gstin:form.gstin.value.trim().toUpperCase(), address:form.address.value.trim(), note:form.note.value.trim(), updatedAt:Date.now() };
  if(!v.name){ toast("Enter a name."); return; }
  let ref; const ok = await write(async()=>{ if(id){ ref=S.db.collection("vendors").doc(id); await ref.update(v);} else { ref=S.db.collection("vendors").doc(); await ref.set({...v, createdAt:Date.now(), ...uidMeta()}); } }, "Vendor saved");
  if(!ok) return;
  if(!id && !S.vendors.some(x=>x.id===ref.id)) S.vendors.push({id:ref.id, ...v});
  if(S._afterVendor){ const f=S._afterVendor; S._afterVendor=null; f(ref.id); } else { closeSheet(); dVendor(ref.id); }
}
function dVendor(id, refresh){
  const v=S.vendors.find(x=>x.id===id); if(!v){ missing("vendor",id,refresh); return; }
  const bs=S.bills.filter(b=>b.vendorId===id).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const billed=sum(bs,b=>b.amount), paid=sum(bs,paidOf);
  let b=`<div class="tiles"><div class="tile"><div class="k">Billed</div><div class="v num">${inrShort(billed)}</div></div><div class="tile good"><div class="k">Paid</div><div class="v num">${inrShort(paid)}</div></div><div class="tile bad"><div class="k">Due</div><div class="v num">${inrShort(billed-paid)}</div></div></div>
  <dl class="dl" style="margin-top:12px">${v.phone?`<dt>Phone</dt><dd>${esc(v.phone)}</dd>`:""}${v.gstin?`<dt>GSTIN</dt><dd class="mono">${esc(v.gstin)}</dd>`:""}${v.address?`<dt>Address</dt><dd>${esc(v.address)}</dd>`:""}${v.note?`<dt>Supplies</dt><dd>${esc(v.note)}</dd>`:""}</dl>`;
  if(S.canWrite) b+=`<div class="actions"><button class="btn pri" data-act="newBill" data-vendor="${id}">${svg("cam")}Upload bill</button></div>`;
  b+=`<div class="legend-s">Bills (${bs.length})</div>` + (bs.length?`<div class="list">${bs.map(x=>{const st=billStatus(x); return `<button class="row" data-act="openBill" data-id="${x.id}"><div class="av out">${svg("receipt")}</div><div class="main"><div class="t">${esc(x.billNo||"Bill")}</div><div class="s">${fmtDate(x.date)}</div></div><div class="amt"><b>${inr(x.amount)}</b><span class="chip ${st}">${st}</span></div></button>`;}).join("")}</div>`:`<p class="small muted">No bills yet.</p>`);
  if(S.canWrite) b+=`<div class="actions" style="margin-top:18px"><button class="btn" data-act="editVendor" data-id="${id}">${svg("edit")}Edit</button><button class="btn danger" data-act="delVendor" data-id="${id}">${svg("trash")}Delete</button></div>`;
  openSheet(v.name, b, "", {kind:"detail", type:"vendor", id});
}
function clientForm(c, after){
  c=c||{}; S._afterClient = after||null;
  openSheet(c.id?"Edit client":"Add client", `<form id="cliForm" data-form="cli" data-id="${c.id||""}"><div class="fg">
    <label class="f full"><span>Client / Party name</span><input name="name" required value="${esc(c.name||"")}"></label>
    <label class="f"><span>Phone</span><input name="phone" type="tel" inputmode="tel" value="${esc(c.phone||"")}"></label>
    <label class="f"><span>GSTIN</span><input name="gstin" maxlength="15" style="text-transform:uppercase" value="${esc(c.gstin||"")}"></label>
    <label class="f full"><span>Address</span><input name="address" value="${esc(c.address||"")}"></label>
    <label class="f full"><span>State</span><select name="state"><option value="">Select state</option>${STATES.map(s=>`<option ${s===(c.state||S.settings.state)?"selected":""}>${s}</option>`).join("")}</select></label>
    <label class="f full"><span>Notes</span><input name="notes" value="${esc(c.notes||"")}" placeholder="e.g. Regular client, Interior designer"></label>
  </div></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="cliForm">Save</button>`);
}
async function saveCli(form){
  const id=form.dataset.id;
  const c={ name:form.name.value.trim(), phone:form.phone.value.trim(), gstin:form.gstin.value.trim().toUpperCase(), address:form.address.value.trim(), state:form.state.value, notes:form.notes.value.trim(), updatedAt:Date.now() };
  if(!c.name){ toast("Enter a client name."); return; }
  let ref;
  const ok = await write(async()=>{
    if(id){ ref=S.db.collection("clients").doc(id); await ref.update(c); }
    else { ref=S.db.collection("clients").doc(); await ref.set({...c, createdAt:Date.now(), ...uidMeta()}); }
  }, "Client saved");
  if(!ok) return;
  if(!id && !S.clients.some(x=>x.id===ref.id)) S.clients.push({id:ref.id, ...c});
  if(S._afterClient){ const f=S._afterClient; S._afterClient=null; f(ref.id); }
  else { closeSheet(); dClient(ref.id); }
}
function dClient(id, refresh){
  const c=S.clients.find(x=>x.id===id); if(!c){ missing("client",id,refresh); return; }
  const invs=S.invoices.filter(i=>(i.client?.id===id) || (i.client?.name && i.client.name.trim().toLowerCase()===(c.name||"").trim().toLowerCase())).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const quotes=S.quotes.filter(q=>(q.client?.id===id) || (q.client?.name && q.client.name.trim().toLowerCase()===(c.name||"").trim().toLowerCase())).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const billed=sum(invs, i=>+i.total||0), received=sum(invs, paidOf), due=billed-received;
  const ph = (c.phone||"").replace(/\D/g,""); const num = ph.length===10 ? "91"+ph : ph;
  let b=`<div class="tiles"><div class="tile"><div class="k">Billed</div><div class="v num">${inrShort(billed)}</div></div><div class="tile good"><div class="k">Received</div><div class="v num">${inrShort(received)}</div></div><div class="tile ${due>0?"bad":"good"}"><div class="k">Due</div><div class="v num">${inrShort(Math.max(0,due))}</div></div></div>
  <dl class="dl" style="margin-top:12px">
    ${c.phone?`<dt>Phone</dt><dd style="display:flex;align-items:center;gap:10px">${esc(c.phone)}<a href="tel:${esc(c.phone)}" class="btn sm" style="padding:2px 8px">Call</a><a href="https://wa.me/${num}" target="_blank" rel="noopener" class="btn sm" style="padding:2px 8px">${svg("wa",1.8)} WhatsApp</a></dd>`:""}
    ${c.gstin?`<dt>GSTIN</dt><dd class="mono">${esc(c.gstin)}</dd>`:""}
    ${c.state?`<dt>State</dt><dd>${esc(c.state)}</dd>`:""}
    ${c.address?`<dt>Address</dt><dd>${esc(c.address)}</dd>`:""}
    ${c.notes?`<dt>Notes</dt><dd>${esc(c.notes)}</dd>`:""}
  </dl>`;
  if(S.canWrite) b+=`<div class="actions"><button class="btn pri" data-act="newInvoiceForClient" data-id="${id}">${svg("plus")}New Invoice</button><button class="btn" data-act="newQuoteForClient" data-id="${id}">${svg("plus")}New Quotation</button></div>`;
  b+=`<div class="legend-s">Invoices (${invs.length})</div>` + (invs.length?`<div class="list">${invs.map(i=>{const st=invStatus(i); return `<button class="row" data-act="openInvoice" data-id="${i.id}"><div class="av n">${svg("doc")}</div><div class="main"><div class="t"><span class="mono">${esc(i.no)}</span></div><div class="s">${fmtDate(i.date)}${i.gstMode==="gst"?" · GST":""}</div></div><div class="amt"><b>${inr(i.total)}</b><span class="chip ${st}">${st}</span></div></button>`;}).join("")}</div>`:`<p class="small muted">No invoices for this client yet.</p>`);
  if(quotes.length) b+=`<div class="legend-s">Quotations (${quotes.length})</div><div class="list">${quotes.map(q=>{const st=q.status||"sent"; return `<button class="row" data-act="openQuote" data-id="${q.id}"><div class="av n">${svg("quote")}</div><div class="main"><div class="t"><span class="mono">${esc(q.no)}</span></div><div class="s">${fmtDate(q.date)}</div></div><div class="amt"><b>${inr(q.total)}</b><span class="chip ${st}">${st}</span></div></button>`;}).join("")}</div>`;
  if(S.canWrite) b+=`<div class="actions" style="margin-top:18px"><button class="btn" data-act="editClient" data-id="${id}">${svg("edit")}Edit</button><button class="btn danger" data-act="delClient" data-id="${id}">${svg("trash")}Delete</button></div>`;
  openSheet(c.name, b, "", {kind:"detail", type:"client", id});
}
function billForm(b, vendorId){
  b=b||{}; S.formFiles=(b.files||[]).map(f=>({...f})); const vid=b.vendorId||vendorId||"";
  const vs=[...S.vendors].sort((a,c)=>(a.name||"").localeCompare(c.name||""));
  openSheet(b.id?"Edit vendor bill":"Upload vendor bill", `<form id="billForm" data-form="bill" data-id="${b.id||""}">
    <div class="legend-s" style="margin-top:0">Bill photo / PDF</div>${filesField("Gallery / PDF")}
    <div class="fg" style="margin-top:14px">
      <label class="f full"><span>Vendor</span><select name="vendorId" required><option value="">Select vendor</option>${vs.map(v=>`<option value="${v.id}" ${v.id===vid?"selected":""}>${esc(v.name)}</option>`).join("")}<option value="__new">+ Add new vendor…</option></select></label>
      <label class="f"><span>Bill no.</span><input name="billNo" value="${esc(b.billNo||"")}"></label>
      <label class="f"><span>Bill date</span><input name="date" type="date" required value="${esc(b.date||today())}"></label>
      <label class="f"><span>Total amount (₹)</span><input name="amount" type="number" inputmode="decimal" step="any" min="0.01" required value="${esc(b.amount||"")}"></label>
      <label class="f"><span>GST in bill (₹)</span><input name="tax" type="number" inputmode="decimal" step="any" min="0" value="${esc(b.tax||"")}" placeholder="Optional"></label>
      <label class="f full"><span>Pay by</span><input name="dueDate" type="date" value="${esc(b.dueDate||"")}"></label>
      <label class="f full"><span>Items / note</span><input name="note" value="${esc(b.note||"")}" placeholder="e.g. 10 sheets Acrylic 3mm 8×4"></label>
      ${b.id?"":`<label class="chk full"><input type="checkbox" name="paidNow"> Already paid in full</label><label class="f gst-pm full" ><span>Paid via (if paid)</span><select name="mode">${MODES.map(m=>`<option>${m}</option>`).join("")}</select></label>`}
    </div></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="billForm">Save bill</button>`);
}
async function saveBill(form){
  if(S.formFiles.some(f=>f.pending)){ toast("Wait for the upload to finish."); return; }
  const id=form.dataset.id;
  const b={ vendorId:form.vendorId.value, billNo:form.billNo.value.trim(), date:form.date.value, amount:r2(form.amount.value), tax:r2(form.tax.value), dueDate:form.dueDate.value, note:form.note.value.trim(), files:S.formFiles.map(({id,type,name})=>({id,type,name})), updatedAt:Date.now() };
  if(!b.vendorId||b.vendorId==="__new"){ toast("Select a vendor."); return; }
  if(!(b.amount>0)){ toast("Enter the bill amount."); return; }
  let ref; const ok = await write(async()=>{
    if(id){ ref=S.db.collection("bills").doc(id); await ref.update(b); }
    else { ref=S.db.collection("bills").doc(); const payments = form.paidNow?.checked ? [{amount:b.amount, date:b.date, mode:form.mode.value, note:"Paid on bill date", at:Date.now(), ...uidMeta()}] : []; await ref.set({...b, payments, createdAt:Date.now(), ...uidMeta()}); }
  }, "Bill saved");
  if(ok){ S.formFiles=[]; dBill(ref.id); }
}
function dBill(id, refresh){
  const x=S.bills.find(v=>v.id===id); if(!x){ missing("bill",id,refresh); return; }
  const st=billStatus(x), paid=paidOf(x);
  let b=`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div style="min-width:0"><div class="mono muted">${esc(x.billNo||"No bill no.")}</div><div style="font-weight:700;font-size:17px">${esc(vendorName(x.vendorId))}</div></div><span class="chip ${st}">${st}</span></div>
  <div class="big" style="margin-top:8px">${inr(x.amount)}</div>
  <dl class="dl" style="margin-top:6px"><dt>Bill date</dt><dd>${fmtDate(x.date)}</dd><dt>Pay by</dt><dd>${fmtDate(x.dueDate)}</dd>${x.tax?`<dt>GST in bill</dt><dd>${inr(x.tax,2)}</dd>`:""}<dt>Paid</dt><dd style="color:var(--good)">${inr(paid)}</dd><dt>Balance</dt><dd style="font-weight:700">${inr(Math.max(0,(+x.amount||0)-paid))}</dd>${x.note?`<dt>Note</dt><dd>${esc(x.note)}</dd>`:""}</dl>`;
  if(S.canWrite&&st!=="paid") b+=`<div class="actions"><button class="btn pri" data-act="payBill" data-id="${id}">Record payment</button></div>`;
  b+=`<div class="legend-s">Bill copy</div>` + (x.files?.length?`<div class="files">${filesThumbs(x.files,false)}</div>`:`<p class="small muted">No file attached. Edit the bill to add a photo or PDF.</p>`);
  if((x.payments||[]).length) b+=`<div class="legend-s">Payments made</div><div class="list">${x.payments.map((p,i)=>`<div class="row" style="cursor:default"><div class="av out">${svg("down")}</div><div class="main"><div class="t">${inr(p.amount)}</div><div class="s">${fmtDate(p.date)} · ${esc(p.mode||"")}${p.note?" · "+esc(p.note):""}</div></div>${S.canWrite?`<button class="btn sm danger" data-act="rmPay" data-col="bills" data-id="${id}" data-i="${i}" aria-label="Remove payment">${svg("trash")}</button>`:""}</div>`).join("")}</div>`;
  if(S.canWrite) b+=`<div class="actions" style="margin-top:18px"><button class="btn" data-act="editBill" data-id="${id}">${svg("edit")}Edit</button><button class="btn danger" data-act="delBill" data-id="${id}">${svg("trash")}Delete</button></div>`;
  b+=byLine(x);
  openSheet("Vendor bill", b, "", {kind:"detail", type:"bill", id});
}

/* ---------- settings ---------- */
function renderSettingsMedia(){
  const ll = $("#logoList");
  if(ll){
    ll.innerHTML = S._settingsLogoId ?
      `<div class="fthumb" data-act="viewFile" data-fid="${esc(S._settingsLogoId)}" data-ftype="image/png" data-fname="logo"><img alt="Logo" src="${esc(fileUrl(S._settingsLogoId))}"><button type="button" class="rm" data-act="rmSettingLogo" aria-label="Remove logo">×</button></div>` :
      `<p class="small muted" style="margin:4px 0">Default logo ("The Wooden Art") will be used if none is uploaded.</p>`;
  }
  const ql = $("#qrList");
  if(ql){
    ql.innerHTML = S._settingsQrId ?
      `<div style="display:flex;align-items:center;gap:12px"><div class="fthumb" data-act="viewFile" data-fid="${esc(S._settingsQrId)}" data-ftype="image/png" data-fname="payment_qr"><img alt="Payment QR" src="${esc(fileUrl(S._settingsQrId))}"><button type="button" class="rm" data-act="rmSettingQr" aria-label="Remove QR">×</button></div><div><span class="chip in" style="display:inline-block">QR Code Active</span><p class="small muted" style="margin:4px 0 0">Printed in payment section on all invoices & quotes</p></div></div>` :
      `<p class="small muted" style="margin:4px 0">No QR code uploaded. Upload your UPI payment QR code (GPay/PhonePe/Paytm).</p>`;
  }
}

function renderMatPricingInSettings(){
  const container = $("#matPricingListContainer");
  if(!container) return;
  const list = S._tempMatPricing || [];
  
  if(!list.length){
    container.innerHTML = `<p class="small muted" style="padding:14px;background:var(--surface-2);border-radius:9px;text-align:center">No material thickness rates added yet. Use the form above to add rates.</p>`;
    return;
  }
  
  const groups = {};
  list.forEach((item, index) => {
    const m = (item.material || "Other").trim();
    if(!groups[m]) groups[m] = [];
    groups[m].push({ ...item, index });
  });

  let h = `<div class="mat-pricing-wrap">`;
  Object.entries(groups).forEach(([matName, items]) => {
    items.sort((a,b) => (parseFloat(a.thick)||0) - (parseFloat(b.thick)||0));
    h += `<div class="mat-group">
      <div class="mat-group-hd">
        <div class="mat-group-badge">
          <span>${esc(matName)}</span>
          <span class="mat-tag">${items.length} ${items.length === 1 ? 'thickness' : 'thicknesses'}</span>
        </div>
        <button type="button" class="btn sm" data-act="quickAddThick" data-mat="${esc(matName)}" style="padding:3px 9px;font-size:11.5px">+ Add thickness</button>
      </div>
      <div class="mat-rates-grid">
        ${items.map(it => `
          <div class="mat-rate-card">
            <div class="info">
              <span class="th">${it.thick !== "" && it.thick !== null && it.thick !== undefined ? `${esc(it.thick)} mm` : '<span class="muted" style="font-size:11px">Default (any mm)</span>'}</span>
            </div>
            <div class="input-wrap">
              <span class="unit">₹</span>
              <input type="number" inputmode="decimal" step="any" min="0" class="mat-rate-in" data-idx="${it.index}" value="${esc(it.rate)}" placeholder="Rate">
              <span class="unit">/sqft</span>
            </div>
            <button type="button" class="rm-btn" data-act="rmMatPrice" data-idx="${it.index}" aria-label="Delete rate" title="Delete">×</button>
          </div>
        `).join("")}
      </div>
    </div>`;
  });
  h += `</div>`;
  container.innerHTML = h;
}

function settingsForm(){
  const s = S.settings || {};
  S._settingsLogoId = s.logoId || null;
  S._settingsQrId = s.qrId || null;
  S._tempMatPricing = JSON.parse(JSON.stringify(getMatPricingList()));
  const ro = !S.canWrite || !S.isAdmin || S.offline;

  openSheet("Company settings", `<form id="setForm" data-form="set"><fieldset ${ro?"disabled":""}>
    <div class="legend-s" style="margin-top:0">Company</div>
    <div class="fg">
      <label class="f full"><span>Company name</span><input name="name" value="${esc(s.name||"")}" placeholder="As printed on invoices"></label>
      <label class="f full"><span>Address</span><textarea name="address" rows="2">${esc(s.address||"")}</textarea></label>
      <label class="f"><span>City</span><input name="city" value="${esc(s.city||"")}"></label>
      <label class="f"><span>State</span><select name="state"><option value="">Select</option>${STATES.map(x=>`<option ${x===s.state?"selected":""}>${x}</option>`).join("")}</select></label>
      <label class="f"><span>Phone</span><input name="phone" type="tel" value="${esc(s.phone||"")}"></label>
      <label class="f"><span>Email</span><input name="email" type="email" value="${esc(s.email||"")}"></label>
      <label class="f"><span>GSTIN</span><input name="gstin" maxlength="15" style="text-transform:uppercase" value="${esc(s.gstin||"")}" placeholder="Leave blank if not registered"></label>
      <label class="f"><span>PAN</span><input name="pan" maxlength="10" style="text-transform:uppercase" value="${esc(s.pan||"")}"></label>
    </div>
    <div class="legend-s">Company Logo</div>
    <p class="small muted" style="margin:-4px 0 8px">Printed at the top-left of invoices and quotations.</p>
    ${S.assets ? `<label class="btn upl">${svg("cam")}Upload company logo<input type="file" id="logoIn" accept="image/png,image/jpeg,image/webp"></label><div class="files" id="logoList" style="margin-top:8px"></div>` : `<p class="small muted">Only editors can change the logo.</p>`}
    
    <div class="legend-s">Online Payment & QR Code</div>
    <p class="small muted" style="margin:-4px 0 8px">Your UPI ID and QR code are printed directly on every generated invoice & quotation.</p>
    <div class="fg">
      <label class="f full"><span>UPI ID (Printed on invoice & WhatsApp message)</span><input name="upi" value="${esc(s.upi||"")}" placeholder="e.g. 7490041570@okbizaxis or name@upi"></label>
    </div>
    ${S.assets ? `<label class="btn upl" style="margin-top:4px">${svg("cam")}Upload Payment QR Code (GPay/PhonePe/Paytm)<input type="file" id="qrIn" accept="image/png,image/jpeg,image/webp"></label><div class="files" id="qrList" style="margin-top:8px"></div>` : `<p class="small muted">Only editors can upload payment QR code.</p>`}

    <div class="legend-s">Bank Details (Printed on Invoice)</div>
    <div class="fg">
      <label class="f full"><span>Account holder name</span><input name="accName" value="${esc(s.accName||"")}"></label>
      <label class="f"><span>Bank name</span><input name="bankName" value="${esc(s.bankName||"")}"></label>
      <label class="f"><span>Account type</span><select name="accType"><option value="Savings" ${(s.accType||"Savings")==="Savings"?"selected":""}>Savings</option><option value="Current" ${s.accType==="Current"?"selected":""}>Current</option></select></label>
      <label class="f"><span>Account no.</span><input name="accNo" inputmode="numeric" value="${esc(s.accNo||"")}"></label>
      <label class="f"><span>IFSC</span><input name="ifsc" style="text-transform:uppercase" value="${esc(s.ifsc||"")}"></label>
    </div>
    <div class="legend-s">Invoice Defaults</div>
    <div class="fg">
      <label class="f"><span>Invoice prefix</span><input name="invPrefix" value="${esc(s.invPrefix||"INV")}"></label>
      <label class="f"><span>Quotation prefix</span><input name="quotePrefix" value="${esc(s.quotePrefix||"QT")}"></label>
      <label class="f"><span>Default type</span><select name="defaultMode"><option value="">Auto (GST if GSTIN filled)</option><option value="gst" ${s.defaultMode==="gst"?"selected":""}>GST invoice</option><option value="none" ${s.defaultMode==="none"?"selected":""}>Simple (no GST)</option></select></label>
      <label class="f"><span>Default GST %</span><select name="defaultGst">${GST_RATES.map(r=>`<option value="${r}" ${(+(s.defaultGst??18))===r?"selected":""}>${r}%</option>`).join("")}</select></label>
      <label class="f"><span>Payment due in (days)</span><input name="dueDays" type="number" min="0" value="${esc(s.dueDays??15)}"></label>
      <label class="f"><span>Default size unit</span><select name="dimUnit">${Object.entries(DIMS).map(([k,v])=>`<option value="${k}" ${(s.dimUnit||"in")===k?"selected":""}>${v.label}</option>`).join("")}</select></label>
      <label class="f full"><span>Additional terms & conditions</span><textarea name="terms" rows="3" placeholder="Additional terms...">${esc(s.terms||"")}</textarea></label>
    </div>
    <div class="legend-s">Material & Thickness Rates (₹ per sq.ft)</div>
    <p class="small muted" style="margin:-4px 0 10px">Configure different thickness rates (₹/sq.ft) for each material. Any custom material + thickness added here will be available when creating Quotations & Invoices.</p>

    <div class="mat-add-card" style="background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px">
      <div style="font-size:12.5px;font-weight:700;margin-bottom:8px;color:var(--ink)">➕ Add Material & Thickness Rate</div>
      <div class="mat-add-grid" style="display:grid;grid-template-columns:2fr 1fr 1.2fr auto;gap:8px;align-items:flex-end">
        <label class="f" style="margin:0">
          <span style="font-size:11px">Material name</span>
          <input id="newMatName" list="allMatSuggestions" placeholder="e.g. Acrylic, HDHMR, Corian" autocomplete="off">
        </label>
        <label class="f" style="margin:0">
          <span style="font-size:11px">Thickness (mm)</span>
          <input id="newMatThick" type="number" inputmode="decimal" step="any" min="0" placeholder="e.g. 3">
        </label>
        <label class="f" style="margin:0">
          <span style="font-size:11px">Rate (₹/sq.ft)</span>
          <input id="newMatRate" type="number" inputmode="decimal" step="any" min="0" placeholder="e.g. 120">
        </label>
        <button type="button" class="btn pri sm" data-act="addMatPrice" style="height:42px;white-space:nowrap;padding:0 14px">+ Add Rate</button>
      </div>
      <datalist id="allMatSuggestions">
        ${getAllConfiguredMaterials().map(m=>`<option value="${esc(m)}">`).join("")}
      </datalist>
    </div>

    <div id="matPricingListContainer"></div>
    </fieldset>
    ${MODE==="rest" ? `<div class="legend-s">Team & login</div><div class="actions" style="margin-top:0">${S.isAdmin?`<button type="button" class="btn" data-act="team">Manage team logins</button>`:""}<button type="button" class="btn" data-act="myPass">Change my password</button><button type="button" class="btn danger-soft" data-act="logout">Log out</button></div>` : ""}
    ${ro && !S.offline ? `<p class="small muted">Only an admin can change company settings.</p>` : ""}
    <div class="legend-s">Security & Screen Lock</div>
    <div class="actions" style="margin-top:0">
      <button type="button" class="btn" data-act="screenLockSettings">🛡️ Screen Lock (PIN & Biometric)</button>
      <button type="button" class="btn" data-act="quickLock">🔒 Lock Screen Now</button>
    </div>
    ${S.isAdmin ? `
    <div class="legend-s">Cloud Database & Storage (Supabase)</div>
    <div class="actions" style="margin-top:0">
      <button type="button" class="btn" data-act="dbSettings">🗄️ Database & Supabase Settings</button>
    </div>
    ` : ""}
    <div class="legend-s">Backup</div>
    <div class="actions" style="margin-top:0"><button type="button" class="btn" data-act="backup">${svg("dl")}Download full backup (JSON)</button></div>
    <p class="small muted">Invoice numbers follow the Indian financial year, e.g. INV/26-27/001. Everyone you share this app with sees the same data.</p>
  </form>`, ro?`<button class="btn" data-act="close">Close</button>`:`<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="setForm">Save settings</button>`);

  renderSettingsMedia();
  renderMatPricingInSettings();
}

async function saveSettings(form){
  const f=form; const s={};
  ["name","address","city","state","phone","email","pan","accName","bankName","accType","accNo","upi","invPrefix","quotePrefix","defaultMode","terms"].forEach(k=>{
    if(f[k]) s[k]=(f[k].value||"").trim();
  });
  s.gstin=(f.gstin?.value||"").trim().toUpperCase();
  s.ifsc=(f.ifsc?.value||"").trim().toUpperCase();
  s.pan=(s.pan||"").toUpperCase();
  s.defaultGst=+f.defaultGst?.value||18;
  s.dueDays=+f.dueDays?.value||0;
  s.dimUnit=f.dimUnit?.value||"in";

  const validPricing = (S._tempMatPricing || []).filter(x => x.material && x.material.trim() && x.rate !== "" && x.rate !== null && !isNaN(+x.rate));
  s.matPricing = validPricing.map(x => ({
    material: x.material.trim(),
    thick: x.thick !== "" && x.thick !== null && !isNaN(+x.thick) ? +x.thick : "",
    rate: r2(x.rate)
  }));
  s.matRates = {};
  s.matPricing.forEach(p => {
    if(!s.matRates[p.material] || (p.thick === "" || p.thick === 0)) {
      s.matRates[p.material] = p.rate;
    }
  });

  s.logoId = S._settingsLogoId !== undefined ? S._settingsLogoId : (S.settings?.logoId || null);
  s.qrId = S._settingsQrId !== undefined ? S._settingsQrId : (S.settings?.qrId || null);
  s.updatedAt=Date.now();
  s.invPrefix = (s.invPrefix||"INV").replace(/\//g,"-");
  s.quotePrefix = (s.quotePrefix||"QT").replace(/\//g,"-");
  const ok = await write(()=>S.db.doc("app/settings").set(s), "Settings saved");
  if(ok){
    Object.assign(S.settings, s);
    renderCo();
    closeSheet();
  }
}

/* ---------- team logins (own hosting only) ---------- */
async function teamSheet(){
  let users=[]; try{ users = await window.KhataRest.users.list(); }catch(e){ toast(errMsg(e)); return; }
  S._users = users;
  openSheet("Team logins", `<div class="list">${users.map(u=>`<div class="row" style="cursor:default"><div class="av n">${esc(initials(u.name))}</div><div class="main"><div class="t">${esc(u.name)} ${u.role==="admin"?`<span class="chip inv">admin</span>`:""} ${u.active?"":`<span class="chip out">off</span>`}</div><div class="s">@${esc(u.username)}</div></div>${u.id!==S.uid?`<button class="btn sm" data-act="userReset" data-id="${u.id}">Password</button><button class="btn sm" data-act="userToggle" data-id="${u.id}">${u.active?"Turn off":"Turn on"}</button>`:`<span class="small muted">you</span>`}</div>`).join("")}</div>
    <div class="legend-s">Add a person</div>
    <form id="userForm" data-form="user" autocomplete="off"><div class="fg">
      <label class="f full"><span>Name</span><input name="name" required></label>
      <label class="f"><span>Username</span><input name="username" required autocapitalize="none" pattern="[A-Za-z0-9_.]{3,30}" title="3-30 letters, numbers, dot or underscore"></label>
      <label class="f"><span>Password (min 6)</span><input name="password" type="text" minlength="6" required></label>
      <label class="f full"><span>Role</span><select name="role"><option value="staff">Staff — add & edit entries, cannot delete</option><option value="admin">Admin — everything incl. delete & settings</option></select></label>
    </div></form>`, `<button class="btn" data-act="settings">Back</button><button class="btn pri" type="submit" form="userForm">Add person</button>`);
}
function passSheet(){
  openSheet("Change my password", `<form id="passForm" data-form="pass"><div class="fg">
    <label class="f full"><span>Current password</span><input name="cur" type="password" required autocomplete="current-password"></label>
    <label class="f full"><span>New password (min 6)</span><input name="next" type="password" minlength="6" required autocomplete="new-password"></label></div></form>`,
    `<button class="btn" data-act="settings">Back</button><button class="btn pri" type="submit" form="passForm">Change</button>`);
}
async function saveUser(f){ try{ await window.KhataRest.users.create({name:f.name.value.trim(), username:f.username.value.trim(), password:f.password.value, role:f.role.value}); toast("Login created. Share the username and password with them."); teamSheet(); }catch(e){ toast(errMsg(e)); } }
async function savePass(f){ try{ await window.KhataRest.changePassword(f.cur.value, f.next.value); toast("Password changed"); closeSheet(); }catch(e){ toast(errMsg(e)); } }
async function saveReset(f){ try{ await window.KhataRest.users.update(S._resetFor,{password:f.pw.value}); toast("Password updated"); teamSheet(); }catch(e){ toast(errMsg(e)); } }

/* ---------- database & supabase settings ---------- */
async function databaseSettingsSheet() {
  let info = null;
  try {
    info = await window.KhataRest.config.getDatabase();
  } catch (e) {
    toast(errMsg(e));
    return;
  }
  const dbInfo = info?.db || {};
  const storageInfo = info?.storage || {};
  const isSupabase = dbInfo.isSupabase;

  openSheet("Database & Supabase Settings", `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="background:var(--surface-2);padding:12px;border-radius:12px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600;font-size:14px">Active Database Mode</div>
          <div style="font-size:12.5px;color:var(--muted)">${isSupabase ? "Cloud PostgreSQL (Supabase)" : "Local Embedded Database (PGlite - Offline)"}</div>
        </div>
        <span class="chip ${isSupabase ? "in" : "warn"}">${isSupabase ? "SUPABASE" : "LOCAL"}</span>
      </div>

      <div style="font-size:13px;color:var(--muted);background:rgba(11,107,93,0.08);border:1px solid rgba(11,107,93,0.2);padding:10px 12px;border-radius:10px">
        💡 <b>Supabase Cloud Setup:</b> Paste your Supabase Connection String and API keys below. The app will automatically test connection, apply database tables schema, and switch live without downtime.
      </div>

      <form id="dbConfigForm" autocomplete="off" style="display:flex;flex-direction:column;gap:12px">
        <label class="f full">
          <span>DATABASE_URL (Supabase Connection String)</span>
          <div style="display:flex;gap:6px;width:100%">
            <input name="dbUrl" id="inpDbUrl" type="password" value="${esc(dbInfo.rawConfigured ? (dbInfo.url || "") : "")}" placeholder="postgresql://postgres.[REF]:[PASSWORD]@aws-0-...pooler.supabase.com:6543/postgres" style="flex:1">
            <button type="button" class="btn sm" id="btnToggleDbPw">Show</button>
          </div>
          <small style="color:var(--muted);font-size:11.5px">Supabase ➔ Project Settings ➔ Database ➔ Connection string (Transaction pooler, port 6543)</small>
        </label>

        <label class="f full">
          <span>SUPABASE_URL (Project URL)</span>
          <input name="supaUrl" type="url" value="${esc(storageInfo.supabaseUrl || "")}" placeholder="https://xxxxxxxxxxxx.supabase.co">
          <small style="color:var(--muted);font-size:11.5px">Supabase ➔ Project Settings ➔ API ➔ Project URL</small>
        </label>

        <label class="f full">
          <span>SUPABASE_SERVICE_ROLE_KEY</span>
          <input name="supaKey" type="password" placeholder="${storageInfo.hasServiceKey ? "(Configured - leave blank to keep unchanged)" : "eyJhbGciOi..."}">
          <small style="color:var(--muted);font-size:11.5px">Supabase ➔ Project Settings ➔ API ➔ Project API keys ➔ service_role (secret)</small>
        </label>

        <div class="fg">
          <label class="f">
            <span>Storage Mode</span>
            <select name="storageMode">
              <option value="supabase" ${storageInfo.mode === "supabase" ? "selected" : ""}>Supabase Cloud Storage</option>
              <option value="local" ${storageInfo.mode === "local" ? "selected" : ""}>Local Server Folder (./uploads)</option>
            </select>
          </label>
          <label class="f">
            <span>Bucket Name</span>
            <input name="supaBucket" value="${esc(storageInfo.bucket || "bills")}" placeholder="bills">
          </label>
        </div>

        <div id="dbTestStatus" style="display:none;padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.4"></div>

        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          <button type="button" class="btn" id="btnTestDbConn">⚡ Test Connection</button>
          <button type="submit" class="btn pri" id="btnSaveDbConn">💾 Save & Switch Database</button>
        </div>

        ${isSupabase ? `
          <div style="margin-top:8px;border-top:1px solid var(--line);padding-top:12px">
            <button type="button" class="btn sm danger-soft" id="btnRevertLocalDb">🔄 Revert to Local Database (PGlite)</button>
          </div>
        ` : ""}
      </form>
    </div>
  `, `<button class="btn" data-act="settings">Back to Settings</button>`);

  const form = $("#dbConfigForm");
  const statusBox = $("#dbTestStatus");
  const inpDbUrl = $("#inpDbUrl");
  const btnToggle = $("#btnToggleDbPw");

  btnToggle?.addEventListener("click", () => {
    if (inpDbUrl.type === "password") {
      inpDbUrl.type = "text";
      btnToggle.textContent = "Hide";
    } else {
      inpDbUrl.type = "password";
      btnToggle.textContent = "Show";
    }
  });

  $("#btnTestDbConn")?.addEventListener("click", async () => {
    const dbUrl = form.dbUrl.value.trim();
    const supaUrl = form.supaUrl.value.trim();
    const supaKey = form.supaKey.value.trim();
    const supaBucket = form.supaBucket.value.trim();
    const storageMode = form.storageMode.value;

    statusBox.style.display = "block";
    statusBox.style.background = "var(--surface-2)";
    statusBox.style.color = "var(--ink)";
    statusBox.textContent = "Testing connection to database and storage…";

    try {
      const res = await window.KhataRest.config.testDatabase({
        databaseUrl: dbUrl,
        supabaseUrl: supaUrl,
        supabaseServiceRoleKey: supaKey,
        supabaseBucket: supaBucket,
        storageMode
      });
      statusBox.style.background = "rgba(16,185,129,0.12)";
      statusBox.style.color = "var(--good)";
      statusBox.innerHTML = `✅ <b>Connection Successful!</b><br>${esc(res.dbMessage)}<br>${esc(res.storageMessage)}`;
    } catch (e) {
      statusBox.style.background = "rgba(239,68,68,0.12)";
      statusBox.style.color = "var(--bad)";
      statusBox.innerHTML = `❌ <b>Connection Failed:</b><br>${esc(e.message || "Failed to connect")}`;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dbUrl = form.dbUrl.value.trim();
    const supaUrl = form.supaUrl.value.trim();
    const supaKey = form.supaKey.value.trim();
    const supaBucket = form.supaBucket.value.trim();
    const storageMode = form.storageMode.value;

    statusBox.style.display = "block";
    statusBox.style.background = "var(--surface-2)";
    statusBox.style.color = "var(--ink)";
    statusBox.textContent = "Saving and configuring database…";

    try {
      const res = await window.KhataRest.config.saveDatabase({
        databaseUrl: dbUrl,
        supabaseUrl: supaUrl,
        supabaseServiceRoleKey: supaKey,
        supabaseBucket: supaBucket,
        storageMode
      });
      toast(res.message || "Database configuration updated!");
      closeSheet();
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      statusBox.style.background = "rgba(239,68,68,0.12)";
      statusBox.style.color = "var(--bad)";
      statusBox.innerHTML = `❌ <b>Failed to Save:</b><br>${esc(e.message || "Error saving database configuration")}`;
    }
  });

  $("#btnRevertLocalDb")?.addEventListener("click", async () => {
    if (!confirm("Switch back to the local embedded database (PGlite)? Cloud data will remain safely in Supabase.")) return;
    try {
      await window.KhataRest.config.saveDatabase({ databaseUrl: "", storageMode: "local" });
      toast("Switched to Local Database.");
      closeSheet();
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      toast(errMsg(e));
    }
  });
}

/* ---------- exports ---------- */
function csv(rows){ return rows.map(r=>r.map(v=>{ v=String(v??""); return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v; }).join(",")).join("\n"); }
async function saveText(filename, text){
  if(!S.dl){ toast("Download not available in this view."); return; }
  try{ await S.dl.save({filename, data:(/\.csv$/.test(filename)?"\ufeff":"")+text}); }catch(e){ if(e?.code!=="declined") toast("Could not save file."); }
}
const EXPORTS = {
  exportInvoices: ()=> saveText(`invoices_${today()}.csv`, csv([["Invoice no","Date","Client","Client GSTIN","Type","Total sq.ft","Taxable","Tax","Total","Received","Balance","Status","Due date"], ...[...S.invoices].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(i=>[i.no,i.date,i.client?.name,i.client?.gstin,i.gstMode==="gst"?"GST":"Simple",calc(i).area,i.sub,i.tax,i.total,paidOf(i),r2(i.total-paidOf(i)),invStatus(i),i.dueDate])])),
  exportLedger: ()=> { const L=ledger().filter(x=>x.date?.startsWith(S.month)); return saveText(`income-expense_${S.month}.csv`, csv([["Date","Type","Amount","Category","Party","Mode","Note"], ...L.map(x=>[x.date,x.type,x.amount,x.cat,x.party,x.mode,x.note])])); },
  exportStock: ()=> saveText(`stock_${today()}.csv`, csv([["Material","Type","Thickness mm","Unit","HSN","Current stock","Min stock","Purchase rate","Selling rate","Value"], ...S.materials.map(m=>[m.name,m.category,m.thick,m.unit,m.hsn,stockOf(m),m.minStock,m.rate,m.saleRate,r2(Math.max(0,stockOf(m))*(+m.rate||0))])])),
  exportBills: ()=> saveText(`vendor-bills_${today()}.csv`, csv([["Bill no","Date","Vendor","Amount","GST","Paid","Balance","Status","Pay by","Note"], ...S.bills.map(b=>[b.billNo,b.date,vendorName(b.vendorId),b.amount,b.tax,paidOf(b),r2(b.amount-paidOf(b)),billStatus(b),b.dueDate,b.note])])),
  backup: ()=> { const o={exportedAt:new Date().toISOString(), settings:S.settings}; COLS.forEach(c=>o[c]=S[c]); return saveText(`khata-backup_${today()}.json`, JSON.stringify(o,null,1)); }
};

/* ---------- events ---------- */
document.addEventListener("click", async e => {
  const el = e.target.closest("[data-act]"); if(!el) return;
  const a=el.dataset.act, id=el.dataset.id;
  if(a==="scrim"){ if(e.target===el) closeSheet(); return; }
  if(el.tagName==="A") return;
  e.preventDefault();
  switch(a){
    case "tab": S.view=el.dataset.v; window.scrollTo(0,0); render(); break;
    case "goto": S.view=el.dataset.v; S.sub[el.dataset.g]=el.dataset.s; window.scrollTo(0,0); render(); break;
    case "sub": S.sub[el.dataset.g]=el.dataset.v; render(); break;
    case "month": S.month=shiftMonth(S.month, +el.dataset.n); render(); break;
    case "close": closeSheet(); break;
    case "back": S._back ? S._back() : closeSheet(); break;
    case "settings": settingsForm(); break;
    case "quickLock": if(window.KhataLock) { if(window.KhataLock.isLockEnabled()) window.KhataLock.lock(); else window.KhataLock.openLockSettingsModal(); } break;
    case "screenLockSettings": if(window.KhataLock) window.KhataLock.openLockSettingsModal(); break;
    case "dbSettings": databaseSettingsSheet(); break;
    case "newInvoice": docForm("invoice"); break;
    case "newQuote": docForm("quote"); break;
    case "editInvoice": docForm("invoice", S.invoices.find(x=>x.id===id)); break;
    case "editQuote": docForm("quote", S.quotes.find(x=>x.id===id)); break;
    case "dupInvoice": { const d=S.invoices.find(x=>x.id===id); if(d){ const c={...JSON.parse(JSON.stringify(d)), id:"", date:today(), dueDate:""}; delete c.id; docForm("invoice", null); fillDocForm(c); } break; }
    case "openInvoice": dInvoice(id); break;
    case "openQuote": dQuote(id); break;
    case "openTxn": dTxn(id); break;
    case "openMaterial": dMaterial(id); break;
    case "openMove": dMove(id); break;
    case "openVendor": dVendor(id); break;
    case "openBill": dBill(id); break;
    case "newTxn": txnForm(el.dataset.type); break;
    case "editTxn": txnForm(null, S.txns.find(x=>x.id===id)); break;
    case "txnType": { const f=$("#txnForm"); const v=el.dataset.v; f.type.value=v; $$("[data-act=txnType]",f).forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===v)); f.category.innerHTML=(v==="income"?INC_CATS:EXP_CATS).map(c=>`<option>${c}</option>`).join(""); f.party.closest("label").firstElementChild.textContent = v==="income"?"Received from":"Paid to"; f.mode.closest("label").firstElementChild.textContent = v==="income"?"Paid by":"Paid via"; $(".sheet-h h3").textContent=(f.dataset.id?"Edit ":"Add ")+v; break; }
    case "newMaterial": materialForm(); break;
    case "editMaterial": materialForm(matById(id)); break;
    case "moveForm": moveForm(id, el.dataset.type); break;
    case "newVendor": vendorForm(); break;
    case "editVendor": vendorForm(S.vendors.find(x=>x.id===id)); break;
    case "openClient": dClient(id); break;
    case "newClient": clientForm(); break;
    case "editClient": clientForm(S.clients.find(x=>x.id===id)); break;
    case "delClient": {
      const c = S.clients.find(x=>x.id===id);
      const invs = S.invoices.filter(i=>(i.client?.id===id) || (i.client?.name && i.client.name.trim().toLowerCase()===(c?.name||"").trim().toLowerCase()));
      const quotes = S.quotes.filter(q=>(q.client?.id===id) || (q.client?.name && q.client.name.trim().toLowerCase()===(c?.name||"").trim().toLowerCase()));
      const totalDocs = invs.length + quotes.length;
      confirmSheet(`Delete client <b>${esc(c?.name)}</b>?${totalDocs ? ` (${totalDocs} invoices/quotations are linked to this client)` : ""}`, async()=>{
        const ok = await write(()=>S.db.collection("clients").doc(id).delete(), "Client deleted");
        if(ok) closeSheet();
      });
      break;
    }
    case "newInvoiceForClient": {
      const c = S.clients.find(x=>x.id===id);
      if(c){ docForm("invoice"); fillDocForm({client:{name:c.name, phone:c.phone, gstin:c.gstin, address:c.address, state:c.state}}); }
      break;
    }
    case "newQuoteForClient": {
      const c = S.clients.find(x=>x.id===id);
      if(c){ docForm("quote"); fillDocForm({client:{name:c.name, phone:c.phone, gstin:c.gstin, address:c.address, state:c.state}}); }
      break;
    }
    case "shareWhatsApp": {
      const d = (el.dataset.kind==="quote"?S.quotes:S.invoices).find(x=>x.id===id);
      if(d){ el.disabled=true; await shareWhatsApp(d, el.dataset.kind); el.disabled=false; }
      break;
    }
    case "newBill": if(!S.vendors.length){ vendorForm(null, vid=>billForm(null, vid)); toast("Add the vendor first"); } else billForm(null, el.dataset.vendor); break;
    case "editBill": billForm(S.bills.find(x=>x.id===id)); break;
    case "payInvoice": payForm("invoices", id); break;
    case "payBill": payForm("bills", id); break;
    case "rmPay": { const col=el.dataset.col, i=+el.dataset.i; const d=(col==="invoices"?S.invoices:S.bills).find(x=>x.id===id); if(!d) break; confirmSheet(`Remove payment of ${inr(d.payments[i]?.amount)}?`, async()=>{ const p=[...d.payments]; p.splice(i,1); const ok=await write(()=>S.db.collection(col).doc(id).update({payments:p}),"Payment removed"); if(ok)(col==="invoices"?dInvoice:dBill)(id); }, "Remove"); break; }
    case "pdf": { const d=(el.dataset.kind==="quote"?S.quotes:S.invoices).find(x=>x.id===id); if(d){ el.disabled=true; await makePDF(d, el.dataset.kind); el.disabled=false; } break; }
    case "quoteStatus": write(()=>S.db.collection("quotes").doc(id).update({status:el.dataset.v}), "Status updated"); break;
    case "convertQuote": { const q=S.quotes.find(x=>x.id===id); if(!q) break; const c=JSON.parse(JSON.stringify(q)); docForm("invoice"); fillDocForm({...c, no:undefined, date:today()}); S._fromQuote=q; break; }
    case "delDoc": { const col=el.dataset.col; const d=S[col].find(x=>x.id===id); confirmSheet(`Delete ${col==="quotes"?"quotation":"invoice"} <b>${esc(d?.no)}</b>?${col==="invoices"&&(d?.payments||[]).length?" Its payments will also be removed from income.":""}`, async()=>{ const ok=await write(()=>S.db.collection(col).doc(id).delete(),"Deleted"); if(ok) closeSheet(); }); break; }
    case "delSimple": { const col=el.dataset.col; const d=S[col].find(x=>x.id===id); confirmSheet(`Delete this entry?`, async()=>{ const ok=await write(()=>S.db.collection(col).doc(id).delete(),"Deleted"); if(ok){ await deleteAssets(d?.files); closeSheet(); } }); break; }
    case "delMaterial": { const n=S.moves.filter(x=>x.materialId===id).length; confirmSheet(`Delete material <b>${esc(matById(id)?.name)}</b>${n?` and its ${n} stock entr${n===1?"y":"ies"}`:""}?`, async()=>{ const ok=await write(async()=>{ for(const mv of S.moves.filter(x=>x.materialId===id)) await S.db.collection("moves").doc(mv.id).delete(); await S.db.collection("materials").doc(id).delete(); },"Deleted"); if(ok) closeSheet(); }); break; }
    case "delVendor": { const n=S.bills.filter(b=>b.vendorId===id).length; if(n){ toast(`Delete this vendor's ${n} bill${n===1?"":"s"} first.`); break; } confirmSheet(`Delete vendor <b>${esc(S.vendors.find(v=>v.id===id)?.name)}</b>?`, async()=>{ const ok=await write(()=>S.db.collection("vendors").doc(id).delete(),"Deleted"); if(ok) closeSheet(); }); break; }
    case "delBill": { const d=S.bills.find(x=>x.id===id); confirmSheet(`Delete bill <b>${esc(d?.billNo||"")}</b> of ${inr(d?.amount)}? Its payments will also be removed from expenses.`, async()=>{ const ok=await write(()=>S.db.collection("bills").doc(id).delete(),"Deleted"); if(ok){ await deleteAssets(d?.files); closeSheet(); } }); break; }
    case "confirmYes": { const f=S._confirm; S._confirm=null; el.disabled=true; if(f) await f(); break; }
    case "mode": { const f=$("#docForm"); const v=el.dataset.v; f.gstMode.value=v; $$("[data-act=mode]",f).forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===v)); $$(".gstonly",f).forEach(x=>x.hidden = v!=="gst"); recalcForm(); break; }
    case "addItem": { const rows0=$$(".item"); const prev = rows0.length ? readRow(rows0[rows0.length-1]) : null; $("#items").insertAdjacentHTML("beforeend", itemRow({}, $("#docForm").gstMode.value==="gst", prev ? {pricing:prev.pricing, du:prev.du, material:prev.material, thick:prev.thick} : null)); const rows=$$(".item"); const last=rows[rows.length-1]; ($("[name=l]", last).offsetParent ? $("[name=l]", last) : $("[name=desc]", last)).focus(); recalcForm(); break; }
    case "pricing": { const r=el.closest(".item"); const v=el.dataset.v; r.dataset.pricing=v; $("[name=pricing]",r).value=v; $$("[data-act=pricing]",r).forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===v)); $(".qlbl",r).textContent = v==="sqft"?"Pieces":"Qty"; $(".rlbl",r).textContent = v==="sqft"?"Rate / sq.ft (₹)":"Rate (₹)"; recalcForm(); break; }
    case "rmItem": { const rows=$$(".item"); if(rows.length>1) el.closest(".item").remove(); else $$("input",rows[0]).forEach(i=>{ if(i.name!=="unit"&&i.name!=="qty") i.value=""; }); recalcForm(); break; }
    case "rmFile": e.stopPropagation(); S.formFiles.splice(+el.dataset.i,1); paintFiles(); break;
    case "viewFile": viewFile(el.dataset.fid, el.dataset.ftype, el.dataset.fname); break;
    case "closeViewer": $("#toastHost").innerHTML=""; break;
    case "saveFile": saveFile(el.dataset.fid, el.dataset.fname); break;
    case "logout": window.KhataRest?.logout(); break;
    case "team": teamSheet(); break;
    case "myPass": passSheet(); break;
    case "userToggle": { const u=(S._users||[]).find(x=>x.id===id); if(!u) break; try{ await window.KhataRest.users.update(id,{active:!u.active}); toast(u.active?"Login turned off":"Login turned on"); teamSheet(); }catch(e){ toast(errMsg(e)); } break; }
    case "userReset": { S._resetFor=id; const u=(S._users||[]).find(x=>x.id===id); openSheet("Reset password", `<form id="resetForm" data-form="reset"><p style="margin-top:0">New password for <b>${esc(u?.name)}</b> (${esc(u?.username)})</p><label class="f"><span>New password (min 6)</span><input name="pw" type="text" minlength="6" required autocomplete="off"></label></form>`, `<button class="btn" data-act="team">Back</button><button class="btn pri" type="submit" form="resetForm">Save</button>`); break; }
    case "pickThick": {
      const r = el.closest(".item");
      if(!r) break;
      const thickVal = el.dataset.thick;
      const rateVal = el.dataset.rate;
      const thickIn = $("[name=thick]", r);
      const rateIn = $("[name=rate]", r);
      if(thickIn) thickIn.value = thickVal;
      if(rateIn) rateIn.value = rateVal;
      
      const sqftBtn = $(`[data-act=pricing][data-v=sqft]`, r);
      if(sqftBtn && r.dataset.pricing !== "sqft") sqftBtn.click();

      $$(".th-chip", r).forEach(c => c.classList.toggle("active", c.dataset.thick === thickVal));
      recalcForm();
      break;
    }
    case "addMatPrice": {
      const name = ($("#newMatName")?.value || "").trim();
      const thick = ($("#newMatThick")?.value || "").trim();
      const rate = ($("#newMatRate")?.value || "").trim();
      if(!name){ toast("Please enter material name"); $("#newMatName")?.focus(); break; }
      if(!rate || isNaN(+rate) || +rate < 0){ toast("Please enter valid rate per sq.ft"); $("#newMatRate")?.focus(); break; }
      S._tempMatPricing = S._tempMatPricing || [];
      const thNum = thick !== "" ? +thick : "";
      const existing = S._tempMatPricing.find(x => (x.material||"").trim().toLowerCase() === name.toLowerCase() && (x.thick === "" ? "" : +x.thick) === (thNum === "" ? "" : +thNum));
      if(existing){
        existing.rate = +rate;
        toast(`Updated rate for ${name} ${thick ? thick+'mm' : ''}`);
      } else {
        S._tempMatPricing.push({ material: name, thick: thNum, rate: +rate });
        toast(`Added ${name} ${thick ? thick+'mm' : ''} at ₹${rate}/sq.ft`);
      }
      if($("#newMatThick")) $("#newMatThick").value = "";
      if($("#newMatRate")) $("#newMatRate").value = "";
      renderMatPricingInSettings();
      break;
    }
    case "quickAddThick": {
      const mat = el.dataset.mat;
      if($("#newMatName")) $("#newMatName").value = mat;
      if($("#newMatThick")) { $("#newMatThick").value = ""; $("#newMatThick").focus(); }
      if($("#newMatRate")) $("#newMatRate").value = "";
      $("#newMatThick")?.scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    }
    case "rmMatPrice": {
      const idx = +el.dataset.idx;
      if(S._tempMatPricing && S._tempMatPricing[idx] !== undefined){
        const removed = S._tempMatPricing.splice(idx, 1)[0];
        toast(`Removed rate for ${removed?.material || "material"}`);
        renderMatPricingInSettings();
      }
      break;
    }
    case "rmSettingLogo": e.stopPropagation(); S._settingsLogoId = null; renderSettingsMedia(); break;
    case "rmSettingQr": e.stopPropagation(); S._settingsQrId = null; renderSettingsMedia(); break;
    default: if(EXPORTS[a]) EXPORTS[a]();
  }
});
async function deleteAssets(files){ if(!S.assets||!files?.length) return; for(const f of files){ try{ await S.assets.delete(f.id); }catch{} } }
function fillDocForm(d){
  const f=$("#docForm"); if(!f) return;
  const gst=d.gstMode==="gst"; f.gstMode.value=gst?"gst":"none"; $$("[data-act=mode]",f).forEach(b=>b.setAttribute("aria-pressed", (b.dataset.v==="gst")===gst)); $$(".gstonly",f).forEach(x=>x.hidden=!gst);
  const cl=d.client||{}; f.cname.value=cl.name||""; f.cphone.value=cl.phone||""; f.caddress.value=cl.address||""; f.cgstin.value=cl.gstin||""; if(cl.state) f.cstate.value=cl.state;
  $("#items").innerHTML=(d.items||[{}]).map(it=>itemRow(it,gst)).join(""); f.notes.value=d.notes||""; recalcForm();
}
document.addEventListener("input", e => {
  const t=e.target;
  if(t.id==="q"){ S.q[t.dataset.key]=t.value; render(); return; }
  if(t.classList.contains("mat-rate-in")){
    const idx = +t.dataset.idx;
    if(S._tempMatPricing && S._tempMatPricing[idx]){
      S._tempMatPricing[idx].rate = t.value !== "" ? +t.value : 0;
    }
    return;
  }
  if(t.closest("#docForm")){
    if(t.name==="material") onMaterialOrThickChange(t.closest(".item"), "material");
    if(t.name==="thick") onMaterialOrThickChange(t.closest(".item"), "thick");
    if(t.name==="cname"){ const c=clientNames().get(t.value); if(c){ const f=t.form; ["phone","address","gstin"].forEach(k=>{ if(!f["c"+k].value) f["c"+k].value=c[k]||""; }); if(c.state) f.cstate.value=c.state; } }
    if(t.name==="date" && !t.form.dataset.id){ const isQ=t.form.dataset.kind==="quote"; const nn=nextNo(isQ?S.quotes:S.invoices, isQ?(S.settings.quotePrefix||"QT"):(S.settings.invPrefix||"INV"), t.value); if(/\/\d{2}-\d{2}\/\d+$/.test(t.form.no.value)) t.form.no.value=nn.no; }
    recalcForm();
  }
});
document.addEventListener("change", async e => {
  const t=e.target;
  if(t.closest("#docForm")){
    if(t.name==="material") onMaterialOrThickChange(t.closest(".item"), "material");
    if(t.name==="thick") onMaterialOrThickChange(t.closest(".item"), "thick");
    recalcForm();
  }
  if((t.id==="fileIn"||t.id==="fileCam") && t.files.length){ handleFiles([...t.files]); t.value=""; }
  if(t.id==="logoIn" && t.files.length){
    const file = t.files[0]; t.value=""; toast("Uploading logo…");
    try { const res = await S.assets.upload(file, {type:file.type}); S._settingsLogoId = res.id; renderSettingsMedia(); toast("Logo uploaded"); }
    catch(err){ toast(errMsg(err)); }
  }
  if(t.id==="qrIn" && t.files.length){
    const file = t.files[0]; t.value=""; toast("Uploading payment QR code…");
    try { const res = await S.assets.upload(file, {type:file.type}); S._settingsQrId = res.id; renderSettingsMedia(); toast("Payment QR code uploaded"); }
    catch(err){ toast(errMsg(err)); }
  }
  if(t.name==="vendorId" && t.value==="__new"){ const keep=S.formFiles; t.value=""; vendorForm(null, vid=>{ const fb=keep; billForm(null, vid); S.formFiles=fb; paintFiles(); }); }
});
document.addEventListener("submit", async e => {
  const f=e.target; if(!f.dataset.form) return; e.preventDefault();
  const fn = {doc:saveDoc, pay:savePay, txn:saveTxn, mat:saveMat, move:saveMove, ven:saveVen, bill:saveBill, cli:saveCli, set:saveSettings, user:saveUser, pass:savePass, reset:saveReset}[f.dataset.form];
  if(!fn) return;
  await fn(f);
});
document.addEventListener("keydown", e => { if(e.key==="Escape"){ if($(".viewer")) $("#toastHost").innerHTML=""; else if(S.sheet) closeSheet(); } });

boot();
})();
