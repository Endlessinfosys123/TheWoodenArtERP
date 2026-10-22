(() => {
"use strict";
/* ---------- constants ---------- */
const STATES = ["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];
const MATS = ["Acrylic","MDF","Corian","MS (Mild Steel)","SS (Stainless Steel)","ACP","WPC","Plywood","Aluminium","Brass","Transportation","Other"];

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

function getDocMaterialsList(){
  const s = S.settings || {};
  const list = Array.isArray(s.matPricing) ? s.matPricing : getMatPricingList();
  const set = new Set();
  list.forEach(x => {
    const name = (x.material || "").trim();
    if(name && name.toLowerCase() !== "other" && name.toLowerCase() !== "transportation") set.add(name);
  });
  const sorted = [...set].sort((a,b) => a.localeCompare(b));
  sorted.push("Transportation");
  sorted.push("Other");
  return sorted;
}

function getAllConfiguredMaterials(){
  const list = getMatPricingList();
  const names = new Set(["Acrylic","MDF","Corian","MS (Mild Steel)","SS (Stainless Steel)","ACP","WPC","Plywood","Aluminium","Brass","HDHMR","Sunboard","PVC Sheet"]);
  list.forEach(x => { if(x.material && x.material.trim()) names.add(x.material.trim()); });
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
  const descIn = $("[name=desc]", r);
  const qtyIn = $("[name=qty]", r);
  const unitIn = $("[name=unit]", r);
  const matVal = matIn ? matIn.value : "";
  let thickVal = thickIn ? thickIn.value.trim() : "";

  const thWrap = $("[data-role=thickHints]", r);
  const trWrap = $("[data-role=transportHints]", r);
  const pseg = $(".pseg", r);

  if(matVal === "Transportation"){
    r.dataset.pricing = "unit";
    const pIn = $("[name=pricing]", r); if(pIn) pIn.value = "unit";
    $$("[data-act=pricing]", r).forEach(b => b.setAttribute("aria-pressed", b.dataset.v === "unit"));
    if(pseg) pseg.hidden = true;

    if(thickIn){ thickIn.value = ""; thickIn.hidden = true; }
    if(thWrap){ thWrap.innerHTML = ""; thWrap.hidden = true; }
    if(trWrap) trWrap.hidden = false;

    const qlbl = $(".qlbl", r); if(qlbl) qlbl.textContent = "No. of Trips";
    const rlbl = $(".rlbl", r); if(rlbl) rlbl.textContent = "Rate / Trip (₹)";
    
    if(qtyIn && (!qtyIn.value || +qtyIn.value === 0)) qtyIn.value = 1;
    const curQty = +qtyIn?.value || 1;

    if(unitIn && (!unitIn.value || unitIn.value === "Nos" || unitIn.value === "Sq.ft")) {
      unitIn.value = curQty === 2 ? "Trips" : "Trip";
    }

    if(descIn && (!descIn.value.trim() || descIn.value.trim() === "Transportation" || descIn.value.includes("Trip"))){
      descIn.value = curQty === 2
        ? "Transportation - Dual Trip (Pickup & Delivery)"
        : "Transportation - Single Trip (Material Pickup)";
    }

    const hsnIn = $("[name=hsn]", r);
    if(hsnIn && !hsnIn.value) hsnIn.value = "9965";

    if(trWrap){
      $$("[data-act=pickTripType]", trWrap).forEach(b => {
        b.classList.toggle("active", (b.dataset.type === "single" && curQty === 1) || (b.dataset.type === "dual" && curQty === 2));
      });
    }

    if(rateIn && !rateIn.value){
      rateIn.focus();
    }
    recalcForm();
    return;
  }

  if(pseg) pseg.hidden = false;
  if(thickIn) thickIn.hidden = false;
  if(trWrap) trWrap.hidden = true;
  const curPricing = r.dataset.pricing || "sqft";
  const qlbl = $(".qlbl", r); if(qlbl) qlbl.textContent = curPricing === "sqft" ? "Pieces" : "Qty";
  const rlbl = $(".rlbl", r); if(rlbl) rlbl.textContent = curPricing === "sqft" ? "Rate / sq.ft (₹)" : "Rate (₹)";

  const m = S.materials.find(x => x.name === matVal);
  if(m && changedField === "material"){
    if(m.saleRate && rateIn && !rateIn.value) rateIn.value = m.saleRate;
    if(m.thick && thickIn && !thickIn.value) { thickIn.value = m.thick; thickVal = String(m.thick); }
    if(m.hsn && $("[name=hsn]", r) && !$("[name=hsn]", r).value) $("[name=hsn]", r).value = m.hsn;
    const v = (m.unit||"").toLowerCase().startsWith("sq") ? "sqft" : "unit";
    const b = $(`[data-act=pricing][data-v=${v}]`, r);
    if(b && r.dataset.pricing !== v) b.click();
    if(v === "unit" && m.unit && unitIn) unitIn.value = m.unit;
  }

  const thList = (matVal && matVal !== "Other") ? getMaterialThicknesses(matVal) : [];
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
    if(matVal === "Other") return;
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
    if(matVal && matVal !== "Other"){
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
const UNITS = ["Sq.ft","Nos","Pcs","Trip","Trips","Kg","g","Ltr","Mtr","Ft","Box","Bag","Set","Hr","Day","Job","Ton"];
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
  clients:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
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
  box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>'
};
const svg = (k, sw=2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]||""}</svg>`;

/* ---------- theme management ---------- */
function getActiveTheme(){
  return document.documentElement.getAttribute("data-theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
function updateThemeToggleUI(t){
  const theme = t || getActiveTheme();
  const btn = $("#btnThemeToggle");
  if(btn){
    const isDark = theme === "dark";
    btn.innerHTML = isDark ? svg("sun") : svg("moon");
    btn.setAttribute("title", isDark ? "Switch to Light Theme" : "Switch to Dark Theme");
    btn.setAttribute("aria-label", isDark ? "Switch to Light Theme" : "Switch to Dark Theme");
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute("content", theme === "dark" ? "#0A110F" : "#0B6B5D");
}
function toggleTheme(){
  const cur = getActiveTheme();
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try{ localStorage.setItem("khata_theme", next); }catch(e){}
  updateThemeToggleUI(next);
  toast(next === "dark" ? "🌙 Dark theme active" : "☀️ Light theme active");
}

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
const itemTitle = it => {
  const m = [it.material, it.thick ? `${it.thick}mm` : ""].filter(Boolean).join(" ");
  if(!m) return it.desc || "Item";
  if(!it.desc) return m;
  if(it.desc.toLowerCase().startsWith(m.toLowerCase())) return it.desc;
  return `${m} – ${it.desc}`;
};
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
  sub=r2(sub); tax=r2(tax);
  const discount = Math.max(0, +d.discount || 0);
  const afterDiscount = r2(Math.max(0, sub + tax - discount));
  const hasManualRoundOff = d.hasManualRoundOff || (d.roundOff !== undefined && d.roundOff !== null && String(d.roundOff).trim() !== "");
  let roundOff = 0;
  let total = afterDiscount;
  if(hasManualRoundOff){
    roundOff = r2(+d.roundOff || 0);
    total = r2(Math.max(0, afterDiscount + roundOff));
  } else {
    total = Math.round(afterDiscount);
    roundOff = r2(total - afterDiscount);
  }
  const autoRoundOff = r2(Math.round(afterDiscount) - afterDiscount);
  const half = r2(tax/2);
  return { rows, sub, tax, area:r2(area), discount, cgst: d.inter?0:half, sgst: d.inter?0:r2(tax-half), igst: d.inter?tax:0, roundOff, hasManualRoundOff, autoRoundOff, total };
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
const TABS = [["home","Home"],["sales","Sales"],["clients","Clients"],["money","Money"],["stock","Stock"],["vendors","Vendors"]];
function renderNav(){
  $("#nav").innerHTML = TABS.map(([k,l]) => `<button data-act="tab" data-v="${k}" aria-current="${S.view===k}"><span class="pill">${svg(k)}</span>${l}</button>`).join("");
}

/* ---------- views ---------- */
function render(){
  updateThemeToggleUI();
  renderNav();
  const v=$("#view");
  let html="";
  if(S.offline) html += `<div class="banner">Open this app while signed in to claude.ai to load and save your company's data.</div>`;
  else if(!S.canWrite) html += `<div class="banner">You have view-only access. Ask the owner to share it with you as Contributor to add entries.</div>`;
  if(!S.ready && !S.offline){ v.innerHTML = html + `<div class="loading">Loading your books…</div>`; $("#fabHost").innerHTML=""; return; }
  html += ({home:vHome, sales:vSales, clients:vClients, money:vMoney, stock:vStock, vendors:vVendors})[S.view]();
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
    case "sales": return S.sub.sales==="inv" ? ["newInvoice","New invoice"] : ["newQuote","New quotation"];
    case "clients": return ["newClient","Add client"];
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
    <button data-act="openBankStatement"><span class="ic">${svg("receipt")}</span>Statement</button>
    <button data-act="newClient"><span class="ic">${svg("clients")}</span>Client</button>
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
  let h = `<h2 class="vt">Sales</h2>` + seg("sales",[["inv",`Invoices (${S.invoices.length})`],["quo",`Quotations (${S.quotes.length})`]]);
  if(S.sub.sales==="inv"){
    const list = S.invoices.filter(i=>match("inv", i.no, i.client?.name, i.client?.phone, i.site||i.client?.site)).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.seq||0)-(a.seq||0));
    const recv = sum(S.invoices.filter(i=>invStatus(i)!=="paid"), i=>(+i.total||0)-paidOf(i));
    h += `<div class="bar">${searchBar("inv","Search invoice no., client or site")}<button class="btn sm" data-act="exportInvoices">${svg("dl")}CSV</button></div>`;
    if(S.invoices.length) h += `<p class="small muted" style="margin:0 0 8px">Pending to receive: <b class="num" style="color:var(--ink)">${inr(recv)}</b></p>`;
    h += !S.invoices.length ? emptyBox("No invoices yet","Create a GST or simple invoice, download it as PDF and share on WhatsApp.","newInvoice","New invoice")
      : !list.length ? `<p class="muted">No invoice matches “${esc(S.q.inv)}”.</p>`
      : `<div class="list">${list.map(i=>{ const st=invStatus(i); const sName = i.site||i.client?.site; return `<button class="row" data-act="openInvoice" data-id="${i.id}"><div class="av n">${esc(initials(i.client?.name))}</div><div class="main"><div class="t">${esc(i.client?.name||"Client")}${sName ? ` <span class="muted" style="font-size:12px;font-weight:normal">(${esc(sName)})</span>` : ""}</div><div class="s"><span class="mono">${esc(i.no)}</span> · ${fmtDate(i.date)}${i.gstMode==="gst"?" · GST":""}</div></div><div class="amt"><b>${inr(i.total)}</b><span class="chip ${st}">${st}</span></div></button>`; }).join("")}</div>`;
  } else {
    const list = S.quotes.filter(q=>match("quo", q.no, q.client?.name, q.site||q.client?.site)).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.seq||0)-(a.seq||0));
    h += `<div class="bar">${searchBar("quo","Search quotation no., client or site")}</div>`;
    h += !S.quotes.length ? emptyBox("No quotations yet","Send a price quotation to a client. When they agree, convert it to an invoice in one tap.","newQuote","New quotation")
      : !list.length ? `<p class="muted">No quotation matches.</p>`
      : `<div class="list">${list.map(q=>{ const st=q.status||"sent"; const sName = q.site||q.client?.site; return `<button class="row" data-act="openQuote" data-id="${q.id}"><div class="av n">${esc(initials(q.client?.name))}</div><div class="main"><div class="t">${esc(q.client?.name||"Client")}${sName ? ` <span class="muted" style="font-size:12px;font-weight:normal">(${esc(sName)})</span>` : ""}</div><div class="s"><span class="mono">${esc(q.no)}</span> · ${fmtDate(q.date)}</div></div><div class="amt"><b>${inr(q.total)}</b><span class="chip ${st}">${st}</span></div></button>`; }).join("")}</div>`;
  }
  return h;
}

/* CLIENTS */
function vClients(){
  const list = S.clients.filter(c => {
    const sites = getClientSites(c).join(" ");
    return match("cli", c.name, c.phone, c.gstin, c.address, c.notes, sites);
  }).sort((a,b)=>(a.name||"").localeCompare(b.name||""));

  const totalDue = sum(S.clients, c => {
    const ledger = buildClientLedger(c);
    return Math.max(0, ledger.closingBalance);
  });

  let h = `<h2 class="vt">Clients</h2>`;
  h += `<div class="bar">${searchBar("cli","Search client name, phone, site or GSTIN")}<button class="btn sm" data-act="exportClients">${svg("dl")}CSV</button><button class="btn pri sm" data-act="newClient">+ Client</button></div>`;
  if(S.clients.length) h += `<p class="small muted" style="margin:0 0 8px">Total outstanding from clients: <b class="num" style="color:var(--ink)">${inr(totalDue)}</b> · ${S.clients.length} client${S.clients.length===1?"":"s"}</p>`;
  h += !S.clients.length ? emptyBox("No clients yet","Add clients to track their daily work, sites, invoices, payments, and monthly khata ledger.","newClient","Add client")
    : !list.length ? `<p class="muted">No client matches “${esc(S.q.cli)}”.</p>`
    : `<div class="list">${list.map(c=>{
        const sites = getClientSites(c);
        const ledger = buildClientLedger(c);
        const due = ledger.closingBalance;
        const siteDisplay = sites.length ? `${sites.slice(0,2).join(", ")}${sites.length>2?` +${sites.length-2} more`:""}` : "";
        return `<button class="row" data-act="openClient" data-id="${c.id}"><div class="av n">${esc(initials(c.name))}</div><div class="main"><div class="t">${esc(c.name)}${siteDisplay ? ` <span class="chip-site" style="font-size:10px;padding:1px 6px">${esc(siteDisplay)}</span>` : ""}</div><div class="s">${esc([c.phone, c.gstin&&("GSTIN "+c.gstin), c.notes].filter(Boolean).join(" · ")||"—")}</div></div><div class="amt"><b>${inr(Math.max(0,due))}</b><span class="small muted">${due>0?"due":"clear"} · ${sites.length} site${sites.length===1?"":"s"}</span></div></button>`;
      }).join("")}</div>`;
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
  h += `<div class="bar"><div class="monthnav"><button data-act="month" data-n="-1" aria-label="Previous month">‹</button><span>${fmtMonth(ym)}</span><button data-act="month" data-n="1" aria-label="Next month">›</button></div>${searchBar("money","Search")}<button class="btn sm pri" data-act="openBankStatement" title="Generate Bank Statement / Passbook Report">${svg("receipt")}Statement</button><button class="btn sm" data-act="exportLedger">${svg("dl")}CSV</button></div>`;
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
  const mat = it.material ?? prev?.material ?? "";
  const isTransport = mat === "Transportation";
  const p = isTransport ? "unit" : (it.pricing || (it.desc && !it.material && it.rate!==undefined && !it.l ? "unit" : (prev?.pricing || "sqft")));
  const du = it.du || prev?.du || S.settings.dimUnit || "in";
  const thick = isTransport ? "" : (it.thick ?? prev?.thick ?? "");
  
  const docMats = getDocMaterialsList();
  const extra = mat && !docMats.includes(mat) ? `<option selected>${esc(mat)}</option>` : "";
  const matOpts = `<option value="">Material…</option>`
    + docMats.map(m => `<option value="${esc(m)}" ${m===mat?"selected":""}>${esc(m)}</option>`).join("")
    + extra;

  const thList = (!isTransport && mat && mat !== "Other") ? getMaterialThicknesses(mat) : [];
  const thChipsHtml = thList.map(t => {
    const isActive = thick !== "" && parseFloat(thick) === parseFloat(t.thick);
    return `<button type="button" class="th-chip ${isActive?'active':''}" data-act="pickThick" data-thick="${esc(t.thick)}" data-rate="${esc(t.rate)}">${esc(t.thick)}mm <span class="rate-badge">₹${esc(t.rate)}</span></button>`;
  }).join("");

  const isDual = isTransport && (+it.qty === 2 || (it.desc && /dual|both/i.test(it.desc)));
  const isSingle = isTransport && (!isDual && (+it.qty === 1 || (it.desc && /single|pickup/i.test(it.desc))));
  const tripChipsHtml = `
    <span class="muted" style="font-size:11px;font-weight:700;display:flex;align-items:center;margin-right:2px">Trip Mode:</span>
    <button type="button" class="th-chip ${isSingle?'active':''}" data-act="pickTripType" data-type="single">🚐 Single Trip (1 Trip · Pickup only)</button>
    <button type="button" class="th-chip ${isDual?'active':''}" data-act="pickTripType" data-type="dual">🔄 Dual Trip (2 Trips · Pickup & Delivery)</button>
    <button type="button" class="th-chip ${(!isSingle && !isDual && it.qty)?'active':''}" data-act="pickTripType" data-type="custom">✏️ Custom Trip</button>
  `;

  const qlblText = isTransport ? "No. of Trips" : (p==="sqft" ? "Pieces" : "Qty");
  const rlblText = isTransport ? "Rate / Trip (₹)" : (p==="sqft" ? "Rate / sq.ft (₹)" : "Rate (₹)");
  const unitVal = isTransport ? (it.unit || (+it.qty === 2 ? "Trips" : "Trip")) : (p==="sqft" ? "Nos" : (it.unit || "Nos"));
  const descPlaceholder = isTransport ? "Transportation details (e.g. Pickup from site, Delivery)" : "Job / design (e.g. Name plate, Jali cutting)";
  const defaultDesc = isTransport ? (it.desc || (isDual ? "Transportation - Dual Trip (Pickup & Delivery)" : "Transportation - Single Trip (Material Pickup)")) : (it.desc || "");
  const defaultQty = isTransport ? (it.qty ?? (isDual ? 2 : 1)) : (it.qty ?? 1);

  return `<div class="item" data-pricing="${p}">
    <div class="d">
      <select name="material" aria-label="Material">${matOpts}</select>
      <input name="thick" type="number" inputmode="decimal" step="any" min="0" placeholder="mm" value="${esc(thick)}" aria-label="Thickness (mm)" class="thick" ${isTransport ? "hidden" : ""}>
      <button type="button" class="x" data-act="rmItem" aria-label="Remove item">×</button>
    </div>
    <div class="thick-hints full" data-role="thickHints" ${thList.length ? "" : "hidden"}>
      <span class="muted" style="font-size:11px;font-weight:600;display:flex;align-items:center;margin-right:2px">Thickness:</span>${thChipsHtml}
    </div>
    <div class="thick-hints full" data-role="transportHints" ${isTransport ? "" : "hidden"} style="margin-top:6px;gap:6px;background:var(--surface-2);padding:6px 10px;border-radius:8px;border:1px solid var(--line)">
      ${tripChipsHtml}
    </div>
    <input class="full" name="desc" placeholder="${descPlaceholder}" value="${esc(defaultDesc)}" aria-label="Description">
    <input type="hidden" name="pricing" value="${p}">
    <div class="pseg full" role="group" ${isTransport ? "hidden" : ""}>
      <button type="button" data-act="pricing" data-v="sqft" aria-pressed="${p==="sqft"}">Per sq.ft</button>
      <button type="button" data-act="pricing" data-v="unit" aria-pressed="${p!=="sqft"}">Per piece / unit</button>
    </div>
    <label class="c2 sq"><small>Length</small><input name="l" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.l??"")}"></label>
    <label class="c2 sq"><small>Width</small><input name="w" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.w??"")}"></label>
    <label class="c2 sq"><small>Size in</small><select name="du">${Object.entries(DIMS).map(([k,v])=>`<option value="${k}" ${k===du?"selected":""}>${v.label}</option>`).join("")}</select></label>
    <label class="c2 qr"><small class="qlbl">${qlblText}</small><input name="qty" type="number" inputmode="decimal" step="any" min="0" value="${esc(defaultQty)}"></label>
    <label class="c2 un"><small>Unit</small><input name="unit" list="unitList" value="${esc(unitVal)}"></label>
    <label class="c2 qr"><small class="rlbl">${rlblText}</small><input name="rate" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.rate??"")}"></label>
    <label class="c3 gstonly" ${gst?"":"hidden"}><small>HSN / SAC</small><input name="hsn" inputmode="numeric" value="${esc(it.hsn||(isTransport?"9965":""))}"></label>
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
function updateDocSiteOptions(cName, selectedSite){
  const f = $("#docForm");
  if(!f) return;
  const c = cName ? (clientNames().get(cName) || S.clients.find(x => (x.name||"").trim().toLowerCase() === cName.trim().toLowerCase())) : null;
  const sites = c ? getClientSites(c) : [];
  const currentVal = selectedSite !== undefined ? selectedSite : (f.csite ? f.csite.value.trim() : "");
  
  const sel = f.csiteSelect;
  if(sel){
    let opts = `<option value="">${sites.length ? `-- Choose saved site (${sites.length}) --` : "-- No saved sites for this client --"}</option>`;
    opts += sites.map(s => `<option value="${esc(s)}" ${s.toLowerCase() === currentVal.toLowerCase() ? "selected" : ""}>${esc(s)}</option>`).join("");
    opts += `<option value="__custom" ${currentVal && !sites.some(s => s.toLowerCase() === currentVal.toLowerCase()) ? "selected" : ""}>+ Add / Custom Site…</option>`;
    sel.innerHTML = opts;
    if(currentVal && sites.some(s => s.toLowerCase() === currentVal.toLowerCase())){
      sel.value = sites.find(s => s.toLowerCase() === currentVal.toLowerCase());
    } else if(currentVal){
      sel.value = "__custom";
    } else {
      sel.value = "";
    }
  }

  const chips = $("#csiteChips");
  if(chips){
    chips.innerHTML = sites.map(s => {
      const active = currentVal && s.toLowerCase() === currentVal.toLowerCase();
      return `<button type="button" class="th-chip ${active ? 'active' : ''}" data-act="pickDocSite" data-site="${esc(s)}">📍 ${esc(s)}</button>`;
    }).join("");
  }
}

function docForm(kind, existing){
  S._fromQuote = null;
  const isQ = kind==="quote"; const list = isQ?S.quotes:S.invoices;
  const st=S.settings; const d = existing ? JSON.parse(JSON.stringify(existing)) : null;
  const date = d?.date || today();
  const nn = (d && d.no) ? {no:d.no} : nextNo(list, isQ?(st.quotePrefix||"QT"):(st.invPrefix||"INV"), date);
  const gst = (d && d.gstMode) ? d.gstMode==="gst" : (st.defaultMode ? st.defaultMode==="gst" : !!st.gstin);
  const cl = d?.client || {};
  const siteVal = d?.site || cl.site || "";
  const clientObj = cl.name ? (clientNames().get(cl.name) || S.clients.find(x => (x.name||"").trim().toLowerCase() === (cl.name||"").trim().toLowerCase())) : null;
  const clientSites = clientObj ? getClientSites(clientObj) : [];
  const discountVal = (d?.discount !== undefined && d?.discount !== null && +d.discount > 0) ? d.discount : "";
  const roundOffVal = (d?.hasManualRoundOff && d?.roundOff !== undefined && d?.roundOff !== null) ? d.roundOff : "";
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
      <label class="f full"><span>Client name</span><input name="cname" id="docClientName" list="clientList" required value="${esc(cl.name||"")}" placeholder="Type or select client"></label>
      <div class="f full">
        <label for="csiteSelect" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:600">Site / Side name</span>
          <span class="small muted">Architect / Mistry site</span>
        </label>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select id="csiteSelect" name="csiteSelect" style="flex:1;min-width:170px;height:38px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);padding:0 8px;font-size:13.5px;font-weight:600">
            <option value="">${clientSites.length ? `-- Choose saved site (${clientSites.length}) --` : "-- No saved sites for this client --"}</option>
            ${clientSites.map(s => `<option value="${esc(s)}" ${s.toLowerCase()===siteVal.toLowerCase()?"selected":""}>${esc(s)}</option>`).join("")}
            <option value="__custom" ${siteVal && !clientSites.some(s => s.toLowerCase() === siteVal.toLowerCase()) ? "selected" : ""}>+ Add / Custom Site…</option>
          </select>
          <input name="csite" id="csiteInput" placeholder="Site name (e.g. Living Room, Bungalow 402)" value="${esc(siteVal)}" style="flex:1;min-width:170px;height:38px">
        </div>
        <div id="csiteChips" class="thick-hints" style="margin-top:6px;gap:6px">
          ${clientSites.map(s => `<button type="button" class="th-chip ${s.toLowerCase()===siteVal.toLowerCase()?'active':''}" data-act="pickDocSite" data-site="${esc(s)}">📍 ${esc(s)}</button>`).join("")}
        </div>
      </div>
      <label class="f"><span>Phone</span><input name="cphone" type="tel" inputmode="tel" value="${esc(cl.phone||"")}"></label>
      <label class="f gstonly" ${gst?"":"hidden"}><span>Client GSTIN</span><input name="cgstin" maxlength="15" style="text-transform:uppercase" value="${esc(cl.gstin||"")}"></label>
      <label class="f full"><span>Address</span><input name="caddress" value="${esc(cl.address||"")}"></label>
      <label class="f full gstonly" ${gst?"":"hidden"}><span>Place of supply (state)</span><select name="cstate"><option value="">Select state</option>${STATES.map(s=>`<option ${s===(cl.state||st.state)?"selected":""}>${s}</option>`).join("")}</select></label>
    </div>
    <div class="legend-s">Items</div>
    <div class="items" id="items">${items.map(it=>itemRow(it,gst)).join("")}</div>
    <button type="button" class="btn sm" style="margin-top:10px" data-act="addItem">${svg("plus")}Add item</button>
    <div class="fg" style="margin-top:14px">
      <label class="f"><span>Discount (₹)</span><input name="discount" type="number" inputmode="decimal" step="any" min="0" placeholder="0.00" value="${esc(discountVal)}"></label>
      <label class="f"><span>Round off (₹)</span><input name="roundOff" type="number" inputmode="decimal" step="any" placeholder="Auto" value="${esc(roundOffVal)}"></label>
    </div>
    <div class="totals" id="totals"></div>
    <div class="legend-s">Notes</div>
    <label class="f"><textarea name="notes" placeholder="${isQ?"Scope of work, delivery time, payment terms…":"Thank you for your business."}">${esc(d?.notes ?? "")}</textarea></label>
    <datalist id="clientList">${[...clientNames().keys()].map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
    <datalist id="matList">${S.materials.map(m=>`<option value="${esc(m.name)}">`).join("")}</datalist>
    <datalist id="unitList">${UNITS.map(u=>`<option value="${u}">`).join("")}</datalist>
  </form>`;
  openSheet(`${(d && d.id) ? "Edit" : "New"} ${isQ ? "quotation" : "invoice"}`, body, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="docForm">Save</button>`);
  recalcForm();
}
function readItems(form){
  return $$(".item", form).map(readRow).filter(it=>it.desc||it.material||it.rate);
}
function interOf(form){ const cs=form.cstate?.value, ms=S.settings.state; return !!(cs && ms && cs!==ms); }
function recalcForm(){
  const form=$("#docForm"); if(!form) return;
  const gst = form.gstMode.value==="gst"; const items=readItems(form); const inter=gst && interOf(form);
  const discountVal = form.discount ? form.discount.value.trim() : "";
  const roundOffVal = form.roundOff ? form.roundOff.value.trim() : "";
  const hasManualRoundOff = roundOffVal !== "";
  const c = calc({
    gstMode: form.gstMode.value,
    inter,
    items,
    discount: discountVal,
    roundOff: hasManualRoundOff ? roundOffVal : undefined,
    hasManualRoundOff
  });
  if(form.roundOff && !hasManualRoundOff){
    form.roundOff.placeholder = `Auto (${c.autoRoundOff >= 0 ? "+" : ""}${c.autoRoundOff.toFixed(2)})`;
  }
  $$(".item",form).forEach(r=>{ const it=readRow(r); const a=lineAmt(it); const g = gst ? r2(a*(it.gst||0)/100):0;
    const area = it.pricing==="sqft" ? `${it.sqft.toFixed(2)} sq.ft${it.rate?` × ${inr(it.rate,2)}`:""}` : "";
    $(".lineamt",r).textContent = (area||a) ? [area, a?`Amount ${inr(a,2)}${gst&&g?` + GST ${inr(g,2)}`:""}`:""].filter(Boolean).join("  =  ") : ""; });
  let t = (c.area ? `<div class="muted"><span>Total area</span><span>${c.area.toFixed(2)} sq.ft</span></div>` : "") + `<div><span>Subtotal</span><span>${inr(c.sub,2)}</span></div>`;
  if(gst){ t += inter ? `<div><span>IGST</span><span>${inr(c.igst,2)}</span></div>` : `<div><span>CGST</span><span>${inr(c.cgst,2)}</span></div><div><span>SGST</span><span>${inr(c.sgst,2)}</span></div>`; }
  if(c.discount) t += `<div style="color:var(--good,#15803d)"><span>Discount</span><span>-${inr(c.discount,2)}</span></div>`;
  if(c.roundOff) t += `<div class="muted"><span>Round off ${c.hasManualRoundOff?"(manual)":""}</span><span>${c.roundOff>0?"+":""}${c.roundOff.toFixed(2)}</span></div>`;
  t += `<div class="gt"><span>Total</span><span>${inr(c.total)}</span></div>`;
  if(gst && !S.settings.state) t += `<p class="small muted" style="margin:6px 0 0">Tip: set your company state in Settings so CGST/SGST vs IGST is picked automatically.</p>`;
  $("#totals").innerHTML = t;
}
async function saveDoc(form){
  const kind=form.dataset.kind, id=form.dataset.id, isQ=kind==="quote";
  const items = readItems(form);
  if(!items.length){ toast("Add at least one item."); return; }
  const gstMode=form.gstMode.value, inter = gstMode==="gst" && interOf(form);
  const discountVal = form.discount ? form.discount.value.trim() : "";
  const roundOffVal = form.roundOff ? form.roundOff.value.trim() : "";
  const hasManualRoundOff = roundOffVal !== "";
  const c = calc({
    gstMode,
    inter,
    items,
    discount: discountVal,
    roundOff: hasManualRoundOff ? roundOffVal : undefined,
    hasManualRoundOff
  });
  const date=form.date.value;
  const siteVal = (form.csite?.value.trim()) || (form.csiteSelect && form.csiteSelect.value !== "__custom" ? form.csiteSelect.value.trim() : "");
  const doc = { no:form.no.value.trim(), date, fy:fyOf(date), gstMode, inter,
    site: siteVal,
    client:{ name:form.cname.value.trim(), site: siteVal, phone:form.cphone.value.trim(), address:form.caddress.value.trim(), gstin:(form.cgstin.value||"").trim().toUpperCase(), state:form.cstate.value },
    items, discount:c.discount, roundOff:c.roundOff, hasManualRoundOff, notes:form.notes.value.trim(), sub:c.sub, tax:c.tax, total:c.total, updatedAt:Date.now() };
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
        const newC = { name: cName, site: siteVal, sites: siteVal ? [siteVal] : [], phone: doc.client.phone||"", gstin: doc.client.gstin||"", address: doc.client.address||"", state: doc.client.state||"", notes:"", createdAt: Date.now(), updatedAt: Date.now(), ...uidMeta() };
        const cliRef = S.db.collection("clients").doc();
        cliRef.set(newC).catch(()=>{});
        S.clients.push({ id: cliRef.id, ...newC });
      } else if(siteVal){
        const curSites = Array.isArray(existingCli.sites) ? [...existingCli.sites] : (existingCli.site ? [existingCli.site] : []);
        if(!curSites.some(s => s.toLowerCase() === siteVal.toLowerCase())){
          curSites.push(siteVal);
          existingCli.sites = curSites;
          existingCli.site = siteVal;
          S.db.collection("clients").doc(existingCli.id).update({ sites: curSites, site: siteVal, updatedAt: Date.now() }).catch(()=>{});
        }
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
  ${c.discount?`<div style="color:var(--good,#15803d)"><span>Discount</span><span>-${inr(c.discount,2)}</span></div>`:""}
  ${c.roundOff?`<div class="muted"><span>Round off ${c.hasManualRoundOff?"(manual)":""}</span><span>${c.roundOff>0?"+":""}${c.roundOff.toFixed(2)}</span></div>`:""}
  <div class="gt"><span>Total</span><span>${inr(c.total)}</span></div></div>
  <p class="small muted" style="margin:6px 0 0">Rupees ${inWords(c.total)} only</p>
  ${d.notes?`<p class="small" style="white-space:pre-wrap">${esc(d.notes)}</p>`:""}`;
}
function dInvoice(id, refresh){
  const d=S.invoices.find(x=>x.id===id); if(!d){ missing("invoice",id,refresh); return; }
  const st=invStatus(d), paid=paidOf(d), due=r2((+d.total||0)-paid);
  const cl=d.client||{};
  const siteName = d.site || cl.site;
  let b = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div style="min-width:0"><div class="mono muted">${esc(d.no)}</div><div style="font-weight:700;font-size:17px">${esc(cl.name)}</div>${siteName?`<div style="font-size:13px;font-weight:600;color:var(--brand)">Site: ${esc(siteName)}</div>`:""}<div class="small muted">${esc([cl.phone, cl.gstin&&("GSTIN "+cl.gstin)].filter(Boolean).join(" · "))}</div></div><span class="chip ${st}">${st}</span></div>
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
  const siteName = d.site || cl.site;
  let b = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div style="min-width:0"><div class="mono muted">${esc(d.no)}</div><div style="font-weight:700;font-size:17px">${esc(cl.name)}</div>${siteName?`<div style="font-size:13px;font-weight:600;color:var(--brand)">Site: ${esc(siteName)}</div>`:""}<div class="small muted">${esc(cl.phone||"")}</div></div><span class="chip ${st}">${st}</span></div>
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

  // 1. Header: Logo (left) + Company Address & Contact Info (right)
  let logo = null;
  if(st.logoId) {
    logo = await loadImg(st.logoId);
  }
  if(!logo) {
    logo = await loadImg("/icons/the_wooden_art_logo.png");
  }

  let logoBottom = y;
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
    logoBottom = y + maxH;
  } else {
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(...INK);
    doc.text((st.name || "THE WOODEN ART").toUpperCase(), M, y + 6.5);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...MUT);
    doc.text("Interior & Exterior Hub", M, y + 11);
    logoBottom = y + 13;
  }

  // Right Side: Company Name, Address, Contact Info, GSTIN, PAN
  let coY = y;
  const coName = pdfSafe(st.name || "THE WOODEN ART").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(coName, W - M, coY + 3.2, { align: "right" });
  coY += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUT);

  // Address lines (wrapped to fit width of ~105mm so it never overlaps logo on left)
  const addrMaxW = 105;
  const addrParts = [];
  if(st.address && st.address.trim()) addrParts.push(st.address.trim());
  const cityState = [st.city, st.state].filter(Boolean).map(s => String(s).trim()).join(", ");
  if(cityState) addrParts.push(cityState);

  addrParts.forEach(part => {
    const lines = doc.splitTextToSize(pdfSafe(part), addrMaxW);
    lines.forEach(line => {
      doc.text(line, W - M, coY + 2.8, { align: "right" });
      coY += 3.4;
    });
  });

  // Contact info (Phone & Email)
  const contactParts = [];
  if(st.phone) contactParts.push("Mo: " + pdfSafe(st.phone));
  if(st.email) contactParts.push("Email: " + pdfSafe(st.email));
  if(contactParts.length) {
    doc.text(contactParts.join("  |  "), W - M, coY + 2.8, { align: "right" });
    coY += 3.4;
  }

  // Tax/Registration info (GSTIN & PAN)
  const regParts = [];
  if(st.gstin) regParts.push("GSTIN: " + pdfSafe(st.gstin));
  if(st.pan) regParts.push("PAN: " + pdfSafe(st.pan));
  if(regParts.length) {
    doc.text(regParts.join("  |  "), W - M, coY + 2.8, { align: "right" });
    coY += 3.4;
  }

  // 2. Full-width Orange Bar below logo & company info
  y = Math.max(31, Math.max(logoBottom, coY) + 2.5);
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
  const siteVal = (d.site || cl.site || "").trim();
  const hasSite = !!siteVal;
  const cw1 = 92;
  const cw2 = contentWidth - cw1; // 92
  const r1h = 6.8;
  const rSiteH = hasSite ? 6.8 : 0;
  const r2h = 6.8;
  doc.setFontSize(8.5);
  const addrText = cl.address ? pdfSafe(cl.address) : "—";
  const addrLines = doc.splitTextToSize(addrText, contentWidth - 26);
  const r3h = Math.max(6.8, addrLines.length * 3.8 + 2.8);
  const custTableH = r1h + rSiteH + r2h + r3h;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(M, y, contentWidth, custTableH, "S");
  doc.line(M, y + r1h, M + contentWidth, y + r1h);
  if(hasSite) {
    doc.line(M, y + r1h + rSiteH, M + contentWidth, y + r1h + rSiteH);
  }
  doc.line(M, y + r1h + rSiteH + r2h, M + contentWidth, y + r1h + rSiteH + r2h);
  doc.line(M + cw1, y, M + cw1, y + r1h + rSiteH + r2h);

  // Row 1
  doc.setFont("helvetica", "bold"); doc.setTextColor(...INK);
  doc.text("Customer:", M + 2.5, y + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(pdfSafe(cl.name || "—"), cw1 - 24)[0], M + 22, y + 4.6);

  doc.setFont("helvetica", "bold");
  doc.text(isQ ? "Quotation No:" : "Order No:", M + cw1 + 2.5, y + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(String(d.no || "—"), M + cw1 + 26, y + 4.6);

  let curY = y + r1h;
  // Row 2 (Site Name if present)
  if(hasSite) {
    doc.setFont("helvetica", "bold");
    doc.text("Site Name:", M + 2.5, curY + 4.6);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(pdfSafe(siteVal), cw1 - 24)[0], M + 22, curY + 4.6);

    const hasTermDate = isQ ? !!d.validTill : !!d.dueDate;
    if(hasTermDate) {
      doc.setFont("helvetica", "bold");
      doc.text(isQ ? "Valid Till:" : "Due Date:", M + cw1 + 2.5, curY + 4.6);
      doc.setFont("helvetica", "normal");
      doc.text(fmtDate(isQ ? d.validTill : d.dueDate), M + cw1 + 26, curY + 4.6);
    }
    curY += rSiteH;
  }

  // Row: Mobile No & Date
  doc.setFont("helvetica", "bold");
  doc.text("Mobile No:", M + 2.5, curY + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(cl.phone ? String(cl.phone) : "—", M + 22, curY + 4.6);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", M + cw1 + 2.5, curY + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(d.date), M + cw1 + 26, curY + 4.6);
  curY += r2h;

  // Row: Address
  doc.setFont("helvetica", "bold");
  doc.text("Address:", M + 2.5, curY + 4.6);
  doc.setFont("helvetica", "normal");
  doc.text(addrLines, M + 22, curY + 4.6);

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
  if(c.discount) {
    summaryRows.push(["Discount", "-" + pdfAmt(c.discount)]);
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

  const docKind = isQ ? "Quotation" : "Invoice";
  const cleanNo = (d.no || "").replace(/[^\w-]+/g, "-");
  const cleanClient = (cl.name || "").replace(/[^\w]+/g, "-").slice(0, 30);
  const cleanSite = siteVal ? siteVal.replace(/[^\w]+/g, "-").slice(0, 30) : "";
  const nameParts = [docKind, cleanNo, cleanClient];
  if(cleanSite) nameParts.push(cleanSite);
  const fname = `${nameParts.filter(Boolean).join("_")}.pdf`.replace(/-+/g, "-").replace(/_+/g, "_");
  const blob = doc.output("blob");
  return { doc, blob, fname };
}

async function makePDF(d, kind){
  const res = await buildPDFDoc(d, kind);
  if(!res) return;
  const { blob, fname } = res;
  if(S.dl && S.dl.save) {
    try {
      await S.dl.save({ filename: fname, data: blob });
      return;
    } catch(e) {
      if(e?.code !== "declined") toast("Could not save PDF.");
      return;
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
  } catch(e) {
    toast("Could not save PDF.");
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
/* ---------- client ledger & multi-site maintenance ---------- */
function getClientSites(c){
  if(!c) return [];
  const set = new Set();
  if(Array.isArray(c.sites)) c.sites.forEach(s => { s = (s||"").trim(); if(s) set.add(s); });
  if(c.site && typeof c.site === "string"){ const s = c.site.trim(); if(s) set.add(s); }
  const cName = (c.name || "").trim().toLowerCase();
  (S.invoices||[]).forEach(i => {
    if((i.client?.id === c.id) || (i.client?.name && i.client.name.trim().toLowerCase() === cName)){
      if(i.site) set.add(i.site.trim());
      if(i.client?.site) set.add(i.client.site.trim());
    }
  });
  (S.quotes||[]).forEach(q => {
    if((q.client?.id === c.id) || (q.client?.name && q.client.name.trim().toLowerCase() === cName)){
      if(q.site) set.add(q.site.trim());
      if(q.client?.site) set.add(q.client.site.trim());
    }
  });
  (S.txns||[]).forEach(t => {
    if(((t.clientId === c.id) || (t.party && t.party.trim().toLowerCase() === cName)) && t.site){
      set.add(t.site.trim());
    }
  });
  return Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b));
}

function buildClientLedger(c, siteFilter="all", periodFilter="all", searchFilter=""){
  if(!c) return { entries:[], allCount:0, openingBalance:0, totalDebit:0, totalCredit:0, closingBalance:0, sitesSummary:{}, allSites:[], siteFilter, periodFilter };
  const cName = (c.name || "").trim().toLowerCase();
  const allSites = getClientSites(c);

  const invs = (S.invoices||[]).filter(i => (i.client?.id === c.id) || (i.client?.name && i.client.name.trim().toLowerCase() === cName));
  const txns = (S.txns||[]).filter(t => (t.clientId === c.id) || (t.party && t.party.trim().toLowerCase() === cName));

  const allEntries = [];

  // Invoices (Debits - Work done)
  invs.forEach(inv => {
    const sName = (inv.site || inv.client?.site || "").trim();
    allEntries.push({
      id: inv.id,
      date: inv.date || today(),
      type: "debit",
      src: "invoice",
      ref: inv.no,
      site: sName,
      desc: `Invoice ${inv.no}${inv.items?.length ? ` (${inv.items.length} item${inv.items.length>1?'s':''})` : ''}`,
      notes: inv.notes || "",
      debit: +inv.total || 0,
      credit: 0,
      status: invStatus(inv),
      raw: inv,
      createdAt: inv.createdAt || 0
    });

    // Payments recorded on this invoice (Credits - Payments received)
    (inv.payments || []).forEach((p, idx) => {
      const pSite = (p.site || sName).trim();
      allEntries.push({
        id: inv.id + "_p_" + idx,
        invId: inv.id,
        date: p.date || inv.date || today(),
        type: "credit",
        src: "inv_pay",
        ref: inv.no,
        site: pSite,
        desc: `Payment for ${inv.no}${p.mode ? ` (${p.mode})` : ''}`,
        notes: p.note || "",
        debit: 0,
        credit: +p.amount || 0,
        mode: p.mode,
        raw: p,
        createdAt: p.at || (inv.createdAt || 0) + idx + 1
      });
    });
  });

  // Client Direct Transactions in S.txns
  txns.forEach(t => {
    const isInc = t.type === "income";
    const tSite = (t.site || "").trim();
    allEntries.push({
      id: t.id,
      date: t.date || today(),
      type: isInc ? "credit" : "debit",
      src: "txn",
      ref: t.note || (isInc ? "Payment" : "Refund"),
      site: tSite,
      desc: isInc ? `Payment received${t.mode ? ` (${t.mode})` : ''}` : `Debit / Adjustment`,
      notes: t.note || "",
      debit: isInc ? 0 : (+t.amount || 0),
      credit: isInc ? (+t.amount || 0) : 0,
      mode: t.mode,
      raw: t,
      createdAt: t.createdAt || 0
    });
  });

  // Sort chronological (oldest to newest)
  allEntries.sort((a,b) => (a.date||"").localeCompare(b.date||"") || (a.createdAt||0) - (b.createdAt||0) || (a.type==="debit"?-1:1));

  // Sites summary calculation across ALL entries
  const sitesSummary = {};
  allSites.forEach(s => { sitesSummary[s] = { billed: 0, received: 0, due: 0, invCount: 0 }; });
  sitesSummary["__unassigned__"] = { billed: 0, received: 0, due: 0, invCount: 0 };

  allEntries.forEach(e => {
    const key = e.site || "__unassigned__";
    if(!sitesSummary[key]) sitesSummary[key] = { billed: 0, received: 0, due: 0, invCount: 0 };
    if(e.type === "debit") {
      sitesSummary[key].billed += e.debit;
      if(e.src === "invoice") sitesSummary[key].invCount++;
    } else {
      sitesSummary[key].received += e.credit;
    }
    sitesSummary[key].due = sitesSummary[key].billed - sitesSummary[key].received;
  });

  // Apply Site Filter
  let filtered = allEntries;
  if(siteFilter && siteFilter !== "all"){
    const sf = siteFilter.trim().toLowerCase();
    filtered = filtered.filter(e => (e.site || "").trim().toLowerCase() === sf);
  }

  // Determine period date range
  let startDate = null;
  const now = today();
  if(periodFilter === "this_month"){
    startDate = now.slice(0,7) + "-01";
  } else if(periodFilter === "last_month"){
    startDate = shiftMonth(now.slice(0,7), -1) + "-01";
  } else if(periodFilter === "last_90"){
    startDate = addDays(now, -90);
  }

  // Calculate Opening Balance if period is set
  let openingBalance = 0;
  let periodEntries = filtered;
  if(startDate){
    const before = filtered.filter(e => (e.date || "") < startDate);
    openingBalance = sum(before, e => e.debit) - sum(before, e => e.credit);
    periodEntries = filtered.filter(e => (e.date || "") >= startDate);
  }

  // Apply search query within description / ref / note
  if(searchFilter && searchFilter.trim()){
    const q = searchFilter.trim().toLowerCase();
    periodEntries = periodEntries.filter(e => (e.ref||"").toLowerCase().includes(q) || (e.desc||"").toLowerCase().includes(q) || (e.notes||"").toLowerCase().includes(q) || (e.site||"").toLowerCase().includes(q));
  }

  // Compute running balance
  let running = openingBalance;
  periodEntries.forEach(e => {
    running += (e.debit - e.credit);
    e.balance = running;
  });

  const totalDebit = sum(periodEntries, e => e.debit);
  const totalCredit = sum(periodEntries, e => e.credit);
  const closingBalance = running;

  return {
    entries: periodEntries,
    allCount: filtered.length,
    openingBalance,
    totalDebit,
    totalCredit,
    closingBalance,
    sitesSummary,
    allSites,
    siteFilter,
    periodFilter
  };
}

function clientPayForm(clientId, defaultSite=""){
  const c = S.clients.find(x => x.id === clientId);
  if(!c) return;
  const sites = getClientSites(c);
  const ledger = buildClientLedger(c);
  const bal = Math.max(0, ledger.closingBalance);

  openSheet(`Receive payment · ${esc(c.name)}`, `<form id="cliPayForm" data-form="clientPay" data-client="${clientId}">
    <div class="fg">
      <div class="f full" style="padding:10px 12px;background:var(--surface-2);border-radius:9px;font-size:13px;line-height:1.5">
        <b>Client:</b> ${esc(c.name)}<br>
        Current outstanding balance: <b class="num" style="color:var(--bad);font-size:15px">${inr(bal)}</b>
      </div>
      <label class="f full"><span>Payment amount (₹)</span><input name="amount" type="number" inputmode="decimal" step="any" min="0.01" required value="${bal > 0 ? bal : ""}" style="font-size:18px;font-weight:700"></label>
      <label class="f"><span>Payment date</span><input name="date" type="date" required value="${today()}"></label>
      <label class="f"><span>Payment mode</span><select name="mode">${MODES.map(m=>`<option ${m==="UPI"?"selected":""}>${m}</option>`).join("")}</select></label>
      <label class="f full"><span>Site / Side allocation (Optional)</span>
        <select name="site">
          <option value="">General / All Sites</option>
          ${sites.map(s => `<option value="${esc(s)}" ${s===defaultSite?"selected":""}>${esc(s)}</option>`).join("")}
        </select>
      </label>
      <label class="f full"><span>Reference / UTR / Cheque no.</span><input name="ref" placeholder="e.g. UTR 402910, Cheque #019283, GPay"></label>
      <label class="f full"><span>Note / Remarks</span><input name="note" placeholder="e.g. Monthly settlement for daily work, Advance"></label>
      <div class="f full" style="margin-top:4px">
        <label class="chk" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
          <input type="checkbox" name="autoFifo" checked style="margin-top:3px">
          <span><b>Auto-settle oldest unpaid invoices (FIFO)</b><br><span class="muted small">Applies payment to clear pending bills automatically and mark them paid</span></span>
        </label>
      </div>
    </div>
  </form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="cliPayForm">Record Payment</button>`);
}

async function saveClientPay(form){
  const clientId = form.dataset.client;
  const c = S.clients.find(x => x.id === clientId);
  if(!c) return;

  const amount = r2(form.amount.value);
  if(!(amount > 0)){ toast("Enter a valid amount."); return; }

  const date = form.date.value || today();
  const mode = form.mode.value;
  const siteVal = (form.site.value || "").trim();
  const refVal = form.ref.value.trim();
  const noteVal = form.note.value.trim();
  const autoFifo = form.autoFifo?.checked;

  const fullNote = [refVal, noteVal].filter(Boolean).join(" · ") || "Client payment";
  const cName = (c.name || "").trim().toLowerCase();

  const ok = await write(async () => {
    if(autoFifo){
      let unpaid = (S.invoices||[]).filter(i => {
        const isClient = (i.client?.id === c.id) || (i.client?.name && i.client.name.trim().toLowerCase() === cName);
        if(!isClient) return false;
        if(siteVal && ((i.site || i.client?.site || "").trim().toLowerCase() !== siteVal.toLowerCase())) return false;
        const due = (+i.total||0) - paidOf(i);
        return due > 0.01;
      });

      if(siteVal && !unpaid.length){
        unpaid = (S.invoices||[]).filter(i => {
          const isClient = (i.client?.id === c.id) || (i.client?.name && i.client.name.trim().toLowerCase() === cName);
          return isClient && (((+i.total||0) - paidOf(i)) > 0.01);
        });
      }

      unpaid.sort((a,b) => (a.date||"").localeCompare(b.date||"") || (a.createdAt||0) - (b.createdAt||0));

      let rem = amount;
      for(const inv of unpaid){
        if(rem <= 0) break;
        const invDue = r2((+inv.total||0) - paidOf(inv));
        const payHere = Math.min(rem, invDue);
        const p = {
          amount: payHere,
          date,
          mode,
          note: fullNote,
          site: siteVal || inv.site || inv.client?.site || "",
          at: Date.now(),
          ...uidMeta()
        };
        const updatedPayments = [...(inv.payments||[]), p];
        await S.db.collection("invoices").doc(inv.id).update({
          payments: updatedPayments,
          updatedAt: Date.now()
        });
        inv.payments = updatedPayments;
        rem = r2(rem - payHere);
      }

      if(rem > 0){
        const advTxn = {
          type: "income",
          amount: rem,
          date,
          mode,
          category: "Client payment",
          party: c.name,
          clientId: c.id,
          site: siteVal,
          note: `Advance / Unallocated from ${fullNote}`,
          files: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...uidMeta()
        };
        const ref = await S.db.collection("txns").add(advTxn);
        S.txns.unshift({ id: ref.id, ...advTxn });
      }
    } else {
      const txn = {
        type: "income",
        amount,
        date,
        mode,
        category: "Client payment",
        party: c.name,
        clientId: c.id,
        site: siteVal,
        note: fullNote,
        files: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...uidMeta()
      };
      const ref = await S.db.collection("txns").add(txn);
      S.txns.unshift({ id: ref.id, ...txn });
    }
  }, `Payment of ${inr(amount)} recorded`);

  if(ok){
    closeSheet();
    dClient(c.id);
  }
}

function shareClientLedgerWhatsApp(clientId, siteFilter="all", periodFilter="all"){
  const c = S.clients.find(x => x.id === clientId);
  if(!c) return;
  const ledger = buildClientLedger(c, siteFilter, periodFilter);
  const co = S.settings?.name || "The Wooden Art";

  const siteText = siteFilter && siteFilter !== "all" ? siteFilter : "All Sites";
  const periodText = periodFilter === "this_month" ? "This Month" : (periodFilter === "last_month" ? "Last Month" : (periodFilter === "last_90" ? "Last 90 Days" : "Complete Khata"));

  let msg = `*KHATA STATEMENT — ${co.toUpperCase()}*\n`;
  msg += `Client: *${c.name}*\n`;
  msg += `Site: *${siteText}*\n`;
  msg += `Period: ${periodText} · Date: ${fmtDate(today())}\n`;
  msg += `--------------------------------\n`;
  msg += `• Total Work Billed: *${inr(ledger.totalDebit)}*\n`;
  msg += `• Total Payment Received: *${inr(ledger.totalCredit)}*\n`;
  msg += `• *Net Balance Due: ${inr(ledger.closingBalance)}*\n`;
  msg += `--------------------------------\n`;

  const recent = ledger.entries.slice(-8);
  if(recent.length){
    msg += `*Recent Entries:*\n`;
    recent.forEach(e => {
      const dt = fmtDate(e.date);
      const sTag = e.site ? `[${e.site}] ` : "";
      if(e.type === "debit"){
        msg += `• ${dt} ${sTag}${e.ref}: +${inr(e.debit)}\n`;
      } else {
        msg += `• ${dt} ${sTag}Received (${e.mode||"Pay"}): -${inr(e.credit)}\n`;
      }
    });
    msg += `--------------------------------\n`;
  }

  if(ledger.closingBalance > 0){
    msg += `Please arrange payment of *${inr(ledger.closingBalance)}* at your earliest convenience.\n`;
    if(S.settings?.upi) msg += `Pay via UPI: *${S.settings.upi}*\n`;
  } else {
    msg += `Account is completely clear. Thank you for your business!\n`;
  }

  const ph = (c.phone||"").replace(/\D/g,"");
  const num = ph.length===10 ? "91"+ph : ph;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}

async function makeClientLedgerPDF(clientId, siteFilter="all", periodFilter="all"){
  if(!window.jspdf){ toast("PDF tool did not load. Check internet and reopen."); return; }
  const c = S.clients.find(x => x.id === clientId);
  if(!c) return;

  toast("Generating statement PDF…");
  const ledger = buildClientLedger(c, siteFilter, periodFilter);
  const st = S.settings || {};
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"mm", format:"a4"});
  const W=210, H=297, M=13;
  const contentWidth = W - 2*M; // 184 mm

  const ORANGE = [232, 128, 42];
  const INK = [20, 20, 20];
  const BORDER = [35, 35, 35];
  const MUT = [90, 90, 90];
  const TH_BG = [238, 238, 238];
  const pdfSafe = t => String(t||"").replace(/[×]/g,"x").replace(/[–—]/g,"-").replace(/[^\x20-\x7E\n]/g,"");

  let y = 10;

  let logo = null;
  if(st.logoId) logo = await loadImg(st.logoId);
  if(!logo) logo = await loadImg("/icons/the_wooden_art_logo.png");

  let logoBottom = y;
  if(logo && logo.w && logo.h){
    const maxH = 16, maxW = 55;
    const ratio = logo.w / logo.h;
    let lh = maxH, lw = lh * ratio;
    if(lw > maxW){ lw = maxW; lh = lw / ratio; }
    doc.addImage(logo.data, logo.fmt, M, y, lw, lh);
    logoBottom = y + maxH;
  } else {
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(...INK);
    doc.text((st.name || "THE WOODEN ART").toUpperCase(), M, y + 6.5);
    logoBottom = y + 11;
  }

  // Right Side: Company Details
  let coY = y;
  doc.setFont("helvetica","bold"); doc.setFontSize(10.5); doc.setTextColor(...INK);
  doc.text(pdfSafe(st.name || "THE WOODEN ART").toUpperCase(), W - M, coY + 3.2, {align:"right"});
  coY += 4.2;

  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...MUT);
  const addrParts = [];
  if(st.address && st.address.trim()) addrParts.push(st.address.trim());
  const cs = [st.city, st.state].filter(Boolean).map(s => String(s).trim()).join(", ");
  if(cs) addrParts.push(cs);
  addrParts.forEach(part => {
    const lines = doc.splitTextToSize(pdfSafe(part), 105);
    lines.forEach(l => {
      doc.text(l, W - M, coY + 2.8, {align:"right"});
      coY += 3.3;
    });
  });

  const contactParts = [];
  if(st.phone) contactParts.push("Mo: " + pdfSafe(st.phone));
  if(st.email) contactParts.push("Email: " + pdfSafe(st.email));
  if(contactParts.length){ doc.text(contactParts.join("  |  "), W - M, coY + 2.8, {align:"right"}); coY += 3.3; }

  const regParts = [];
  if(st.gstin) regParts.push("GSTIN: " + pdfSafe(st.gstin));
  if(st.pan) regParts.push("PAN: " + pdfSafe(st.pan));
  if(regParts.length){ doc.text(regParts.join("  |  "), W - M, coY + 2.8, {align:"right"}); coY += 3.3; }

  y = Math.max(28, Math.max(logoBottom, coY) + 2.5);
  doc.setFillColor(...ORANGE);
  doc.rect(M, y, contentWidth, 3, "F");
  y += 5.5;

  doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(...INK);
  doc.text("CLIENT KHATA STATEMENT", W/2, y + 4, {align:"center"});
  y += 7;

  const siteText = siteFilter && siteFilter !== "all" ? siteFilter : "All Sites";
  const periodText = periodFilter === "this_month" ? "This Month" : (periodFilter === "last_month" ? "Last Month" : (periodFilter === "last_90" ? "Last 90 Days" : "Complete Statement"));

  doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.rect(M, y, contentWidth, 18, "S");
  doc.line(M + 100, y, M + 100, y + 18);

  doc.setFontSize(8.5); doc.setFont("helvetica","bold"); doc.setTextColor(...INK);
  doc.text("STATEMENT FOR:", M + 3, y + 4.5);
  doc.setFont("helvetica","normal");
  doc.text(pdfSafe(c.name), M + 3, y + 8.5);
  doc.text(pdfSafe([c.phone, c.gstin ? "GSTIN: "+c.gstin : ""].filter(Boolean).join("  ·  ")), M + 3, y + 12.5);
  if(c.address) doc.text(pdfSafe(c.address).slice(0, 50), M + 3, y + 16.5);

  doc.setFont("helvetica","bold");
  doc.text("STATEMENT DETAILS:", M + 103, y + 4.5);
  doc.setFont("helvetica","normal");
  doc.text("Date: " + fmtDate(today()), M + 103, y + 8.5);
  doc.text("Site: " + pdfSafe(siteText), M + 103, y + 12.5);
  doc.text("Period: " + pdfSafe(periodText), M + 103, y + 16.5);

  y += 21;

  const cw = contentWidth / 3;
  doc.rect(M, y, contentWidth, 12, "S");
  doc.line(M + cw, y, M + cw, y + 12);
  doc.line(M + 2*cw, y, M + 2*cw, y + 12);

  doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(...MUT);
  doc.text("TOTAL BILLED", M + cw/2, y + 4, {align:"center"});
  doc.text("TOTAL RECEIVED", M + cw + cw/2, y + 4, {align:"center"});
  doc.text("BALANCE DUE", M + 2*cw + cw/2, y + 4, {align:"center"});

  doc.setFontSize(10.5); doc.setTextColor(...INK);
  doc.text("Rs. " + pdfAmt(ledger.totalDebit), M + cw/2, y + 9.5, {align:"center"});
  doc.setTextColor(22, 126, 63);
  doc.text("Rs. " + pdfAmt(ledger.totalCredit), M + cw + cw/2, y + 9.5, {align:"center"});
  doc.setTextColor(ledger.closingBalance > 0 ? 190 : 22, ledger.closingBalance > 0 ? 40 : 126, ledger.closingBalance > 0 ? 29 : 63);
  doc.text("Rs. " + pdfAmt(ledger.closingBalance), M + 2*cw + cw/2, y + 9.5, {align:"center"});

  y += 16;

  const cols = [
    { name: "Date", w: 22, align: "left" },
    { name: "Site", w: 34, align: "left" },
    { name: "Particulars / Description", w: 60, align: "left" },
    { name: "Debit (Rs)", w: 22, align: "right" },
    { name: "Credit (Rs)", w: 22, align: "right" },
    { name: "Balance (Rs)", w: 24, align: "right" }
  ];

  function drawTableHeader(curY){
    doc.setFillColor(...TH_BG);
    doc.rect(M, curY, contentWidth, 7, "F");
    doc.rect(M, curY, contentWidth, 7, "S");
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...INK);
    let x = M;
    cols.forEach(col => {
      const tx = col.align === "right" ? x + col.w - 2 : x + 2;
      doc.text(col.name, tx, curY + 4.8, {align: col.align});
      x += col.w;
    });
  }

  drawTableHeader(y);
  y += 7;

  if(ledger.openingBalance !== 0){
    doc.setFillColor(245, 245, 245);
    doc.rect(M, y, contentWidth, 6, "F");
    doc.rect(M, y, contentWidth, 6, "S");
    doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(...MUT);
    doc.text("Opening Balance", M + 2, y + 4.2);
    doc.setFont("helvetica","bold"); doc.setTextColor(...INK);
    doc.text(pdfAmt(ledger.openingBalance), M + contentWidth - 2, y + 4.2, {align:"right"});
    y += 6;
  }

  doc.setFontSize(8);
  ledger.entries.forEach(e => {
    if(y > H - 30){
      doc.addPage();
      y = 15;
      drawTableHeader(y);
      y += 7;
    }

    doc.rect(M, y, contentWidth, 6.5, "S");
    doc.setFont("helvetica","normal"); doc.setTextColor(...INK);

    let x = M;
    doc.text(fmtDate(e.date), x + 2, y + 4.4);
    x += cols[0].w;

    doc.text(pdfSafe(e.site || "—").slice(0, 18), x + 2, y + 4.4);
    x += cols[1].w;

    doc.text(pdfSafe(e.desc || e.ref || "—").slice(0, 32), x + 2, y + 4.4);
    x += cols[2].w;

    if(e.debit > 0){
      doc.setFont("helvetica","bold");
      doc.text(pdfAmt(e.debit), x + cols[3].w - 2, y + 4.4, {align:"right"});
    } else {
      doc.text("—", x + cols[3].w - 2, y + 4.4, {align:"right"});
    }
    x += cols[3].w;

    if(e.credit > 0){
      doc.setFont("helvetica","bold"); doc.setTextColor(22, 126, 63);
      doc.text(pdfAmt(e.credit), x + cols[4].w - 2, y + 4.4, {align:"right"});
      doc.setTextColor(...INK);
    } else {
      doc.text("—", x + cols[4].w - 2, y + 4.4, {align:"right"});
    }
    x += cols[4].w;

    doc.setFont("helvetica","bold");
    doc.text(pdfAmt(e.balance), x + cols[5].w - 2, y + 4.4, {align:"right"});

    y += 6.5;
  });

  if(y > H - 25){ doc.addPage(); y = 15; }
  doc.setFillColor(...TH_BG);
  doc.rect(M, y, contentWidth, 7, "F");
  doc.rect(M, y, contentWidth, 7, "S");
  doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...INK);
  doc.text("NET CLOSING BALANCE", M + 2, y + 4.8);
  doc.text("Rs. " + pdfAmt(ledger.totalDebit), M + cols[0].w + cols[1].w + cols[2].w + cols[3].w - 2, y + 4.8, {align:"right"});
  doc.setTextColor(22, 126, 63);
  doc.text("Rs. " + pdfAmt(ledger.totalCredit), M + cols[0].w + cols[1].w + cols[2].w + cols[3].w + cols[4].w - 2, y + 4.8, {align:"right"});
  doc.setTextColor(ledger.closingBalance > 0 ? 190 : 22, ledger.closingBalance > 0 ? 40 : 126, ledger.closingBalance > 0 ? 29 : 63);
  doc.text("Rs. " + pdfAmt(ledger.closingBalance), M + contentWidth - 2, y + 4.8, {align:"right"});
  y += 11;

  if(st.bankName || st.upi){
    if(y > H - 25){ doc.addPage(); y = 15; }
    doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.setTextColor(...MUT);
    doc.text("Bank & Payment Details:", M, y);
    y += 3.5;
    if(st.bankName) doc.text(`Bank: ${st.bankName} | A/C: ${st.bankAccount||""} | IFSC: ${st.bankIfsc||""}`, M, y);
    if(st.upi) doc.text(`UPI ID: ${st.upi}`, M, y + (st.bankName ? 3.5 : 0));
  }

  const cleanName = (c.name||"client").replace(/[^\w]+/g,"_").slice(0,30);
  const pdfBlob = doc.output("blob");
  const filename = `Statement_${cleanName}_${today()}.pdf`;

  if(S.dl && S.dl.save){
    await S.dl.save({filename, data: pdfBlob});
  } else {
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  toast("Statement PDF downloaded");
}

function exportClientLedgerCSV(clientId, siteFilter="all", periodFilter="all"){
  const c = S.clients.find(x => x.id === clientId);
  if(!c) return;
  const ledger = buildClientLedger(c, siteFilter, periodFilter);
  const rows = [
    ["Date", "Site", "Type", "Ref", "Description", "Debit (Work Billed)", "Credit (Received)", "Running Balance"]
  ];
  if(ledger.openingBalance !== 0){
    rows.push(["", "", "Opening Balance", "", "Opening Balance", "", "", ledger.openingBalance]);
  }
  ledger.entries.forEach(e => {
    rows.push([
      e.date,
      e.site || "",
      e.type === "debit" ? "Debit (Work)" : "Credit (Payment)",
      e.ref || "",
      e.desc || "",
      e.debit || 0,
      e.credit || 0,
      e.balance
    ]);
  });
  rows.push(["", "", "Closing Balance", "", "Net Total", ledger.totalDebit, ledger.totalCredit, ledger.closingBalance]);
  const cleanName = (c.name||"client").replace(/[^\w]+/g,"_").slice(0,30);
  saveText(`Statement_${cleanName}_${today()}.csv`, csv(rows));
}

/* ---------- BUSINESS FINANCIAL STATEMENT / BANK PASSBOOK ---------- */
function getStatementDateRange(period, customStart, customEnd) {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1-12
  const pad = n => String(n).padStart(2, "0");

  if(period === "this_month") {
    const start = `${y}-${pad(m)}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${pad(m)}-${pad(lastDay)}`;
    return { start, end, label: `1 Month (Current - ${MON[m-1]} ${y})`, periodName: `Month_${MON[m-1]}_${y}` };
  }

  if(period === "last_month") {
    const prevDate = new Date(y, m - 2, 1);
    const py = prevDate.getFullYear();
    const pm = prevDate.getMonth() + 1;
    const start = `${py}-${pad(pm)}-01`;
    const lastDay = new Date(py, pm, 0).getDate();
    const end = `${py}-${pad(pm)}-${pad(lastDay)}`;
    return { start, end, label: `1 Month (Last Month - ${MON[pm-1]} ${py})`, periodName: `LastMonth_${MON[pm-1]}_${py}` };
  }

  if(period === "6_months") {
    const sixAgo = new Date(y, m - 6, 1);
    const sy = sixAgo.getFullYear();
    const sm = sixAgo.getMonth() + 1;
    const start = `${sy}-${pad(sm)}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${pad(m)}-${pad(lastDay)}`;
    return { start, end, label: `6 Months (${MON[sm-1]} ${sy} to ${MON[m-1]} ${y})`, periodName: `6Months_${sy}_${y}` };
  }

  if(period === "fy_current") {
    const baseStartYear = m >= 4 ? y : y - 1;
    const start = `${baseStartYear}-04-01`;
    const end = `${baseStartYear + 1}-03-31`;
    const code = `FY_${baseStartYear}-${String(baseStartYear + 1).slice(-2)}`;
    return { start, end, label: `Financial Year FY ${baseStartYear}-${String(baseStartYear + 1).slice(-2)}`, periodName: code };
  }

  if(period === "fy_prev") {
    const baseStartYear = (m >= 4 ? y : y - 1) - 1;
    const start = `${baseStartYear}-04-01`;
    const end = `${baseStartYear + 1}-03-31`;
    const code = `FY_${baseStartYear}-${String(baseStartYear + 1).slice(-2)}`;
    return { start, end, label: `Financial Year FY ${baseStartYear}-${String(baseStartYear + 1).slice(-2)} (Previous)`, periodName: code };
  }

  // Custom
  const start = customStart || `${y}-${pad(m)}-01`;
  const end = customEnd || today();
  return { start, end, label: `Custom Range (${fmtDate(start)} to ${fmtDate(end)})`, periodName: `Custom_${start}_${end}` };
}

function buildBusinessStatement(opts = {}) {
  const period = opts.period || "this_month";
  const { start, end, label, periodName } = getStatementDateRange(period, opts.customStart, opts.customEnd);
  const modeFilter = opts.mode || "all";
  const typeFilter = opts.type || "all";

  const all = ledger();

  // Opening Balance: sum of all transactions strictly before start date
  const beforeEntries = all.filter(x => (x.date || "") < start);
  const openingCredits = sum(beforeEntries.filter(x => x.type === "income"), x => x.amount);
  const openingDebits = sum(beforeEntries.filter(x => x.type === "expense"), x => x.amount);
  const openingBalance = openingCredits - openingDebits;

  // Period entries
  let inPeriod = all.filter(x => {
    const d = x.date || "";
    return d >= start && d <= end;
  });

  if(typeFilter !== "all") {
    inPeriod = inPeriod.filter(x => x.type === typeFilter);
  }
  if(modeFilter !== "all") {
    inPeriod = inPeriod.filter(x => (x.mode || "").toLowerCase() === modeFilter.toLowerCase());
  }

  // Sort chronological (oldest to newest)
  inPeriod.sort((a, b) => {
    const cmp = (a.date || "").localeCompare(b.date || "");
    if(cmp !== 0) return cmp;
    return (a.id || "").localeCompare(b.id || "");
  });

  let running = openingBalance;
  const rows = inPeriod.map((x, idx) => {
    const isCr = x.type === "income";
    const credit = isCr ? x.amount : 0;
    const debit = !isCr ? x.amount : 0;
    running = running + credit - debit;
    return {
      sr: idx + 1,
      key: x.key,
      src: x.src,
      id: x.id,
      date: x.date,
      party: x.party || (isCr ? "Client Receipt" : "Expense"),
      cat: x.cat || (isCr ? "Income" : "Expense"),
      note: x.note || "",
      mode: x.mode || "—",
      type: x.type,
      debit,
      credit,
      runningBalance: running
    };
  });

  const totalCredits = sum(rows, r => r.credit);
  const totalDebits = sum(rows, r => r.debit);
  const netChange = totalCredits - totalDebits;
  const closingBalance = openingBalance + netChange;

  return {
    period,
    start,
    end,
    label,
    periodName,
    modeFilter,
    typeFilter,
    openingBalance,
    totalCredits,
    totalDebits,
    netChange,
    closingBalance,
    rows
  };
}

function openBankStatementSheet(filterOpts = {}) {
  if(filterOpts.period) S._stmtPeriod = filterOpts.period;
  if(!S._stmtPeriod) S._stmtPeriod = "this_month";
  if(filterOpts.customStart !== undefined) S._stmtCustomStart = filterOpts.customStart;
  if(filterOpts.customEnd !== undefined) S._stmtCustomEnd = filterOpts.customEnd;
  if(filterOpts.mode) S._stmtMode = filterOpts.mode;
  if(!S._stmtMode) S._stmtMode = "all";
  if(filterOpts.type) S._stmtType = filterOpts.type;
  if(!S._stmtType) S._stmtType = "all";

  const period = S._stmtPeriod;
  const stmt = buildBusinessStatement({
    period,
    customStart: S._stmtCustomStart,
    customEnd: S._stmtCustomEnd,
    mode: S._stmtMode,
    type: S._stmtType
  });

  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const baseStartYear = m >= 4 ? y : y - 1;
  const curFyLabel = `FY ${baseStartYear}-${String(baseStartYear+1).slice(-2)}`;
  const prevFyLabel = `FY ${baseStartYear-1}-${String(baseStartYear).slice(-2)}`;

  const periods = [
    { id: "this_month", label: "1 Month (Current)" },
    { id: "last_month", label: "Last Month" },
    { id: "6_months", label: "6 Months" },
    { id: "fy_current", label: curFyLabel },
    { id: "fy_prev", label: prevFyLabel },
    { id: "custom", label: "Custom Range" }
  ];

  const html = `
    <div class="stmt-wrap">
      <div class="legend-s" style="margin-top:0">Select Statement Period</div>
      <div class="stmt-periods">
        ${periods.map(p => `
          <button type="button" class="stmt-period-chip ${p.id === period ? "active" : ""}" data-act="stmtPeriod" data-period="${p.id}">${p.label}</button>
        `).join("")}
      </div>

      ${period === "custom" ? `
        <div class="stmt-custom-dates" style="display:flex;gap:8px;align-items:flex-end;margin:8px 0 12px;flex-wrap:wrap;background:var(--surface-2);padding:10px;border-radius:var(--r-sm);border:1px solid var(--line)">
          <label class="f" style="flex:1;min-width:130px;margin:0">
            <span>From Date</span>
            <input type="date" id="stmtCustomStart" value="${esc(stmt.start)}">
          </label>
          <label class="f" style="flex:1;min-width:130px;margin:0">
            <span>To Date</span>
            <input type="date" id="stmtCustomEnd" value="${esc(stmt.end)}">
          </label>
          <button type="button" class="btn sm pri" data-act="applyStmtCustom" style="height:38px">Apply</button>
        </div>
      ` : ""}

      <div style="display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap">
        <label class="f" style="flex:1;min-width:140px;margin:0">
          <span>Payment Mode</span>
          <select id="stmtModeFilter">
            <option value="all" ${S._stmtMode==="all"?"selected":""}>All Modes</option>
            <option value="Cash" ${S._stmtMode==="Cash"?"selected":""}>Cash Only</option>
            <option value="Bank" ${S._stmtMode==="Bank"?"selected":""}>Bank Transfer</option>
            <option value="UPI" ${S._stmtMode==="UPI"?"selected":""}>UPI Only</option>
            <option value="Cheque" ${S._stmtMode==="Cheque"?"selected":""}>Cheque</option>
          </select>
        </label>
        <label class="f" style="flex:1;min-width:140px;margin:0">
          <span>Type</span>
          <select id="stmtTypeFilter">
            <option value="all" ${S._stmtType==="all"?"selected":""}>All Transactions</option>
            <option value="income" ${S._stmtType==="income"?"selected":""}>Income (Credits Only)</option>
            <option value="expense" ${S._stmtType==="expense"?"selected":""}>Expense (Debits Only)</option>
          </select>
        </label>
      </div>

      <div style="display:flex;gap:10px;margin:14px 0 16px;flex-wrap:wrap">
        <button type="button" class="btn pri" data-act="downloadStmtPdf" style="flex:1;min-width:180px;height:44px;font-size:14px">
          ${svg("doc")} Download PDF Statement
        </button>
        <button type="button" class="btn" data-act="downloadStmtExcel" style="flex:1;min-width:180px;height:44px;font-size:14px">
          ${svg("dl")} Export to Excel (.CSV)
        </button>
      </div>

      <div class="legend-s" style="margin-top:8px">Financial Summary (${esc(stmt.label)})</div>
      <div class="stmt-summary-grid">
        <div class="stmt-kpi-card">
          <div class="lbl">Opening Balance</div>
          <div class="val num">${inr(stmt.openingBalance)}</div>
        </div>
        <div class="stmt-kpi-card" style="border-left:3px solid var(--good)">
          <div class="lbl" style="color:var(--good)">Total Credits (+)</div>
          <div class="val num" style="color:var(--good)">+${inr(stmt.totalCredits)}</div>
        </div>
        <div class="stmt-kpi-card" style="border-left:3px solid var(--bad)">
          <div class="lbl" style="color:var(--bad)">Total Debits (−)</div>
          <div class="val num" style="color:var(--bad)">−${inr(stmt.totalDebits)}</div>
        </div>
        <div class="stmt-kpi-card" style="border-left:3px solid ${stmt.netChange>=0?"var(--good)":"var(--bad)"}">
          <div class="lbl">Net Cash Flow</div>
          <div class="val num" style="color:${stmt.netChange>=0?"var(--good)":"var(--bad)"}">${stmt.netChange>=0?"+":""}${inr(stmt.netChange)}</div>
        </div>
        <div class="stmt-kpi-card" style="background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 40%,var(--line))">
          <div class="lbl" style="color:var(--accent)">Closing Balance</div>
          <div class="val num" style="color:var(--accent)">${inr(stmt.closingBalance)}</div>
        </div>
      </div>

      <div class="legend-s" style="margin-top:14px">Passbook Statement (${stmt.rows.length} entries)</div>
      <div class="stmt-table-wrap">
        <table class="stmt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Particulars</th>
              <th>Mode</th>
              <th style="text-align:right">Debit (Dr)</th>
              <th style="text-align:right">Credit (Cr)</th>
              <th style="text-align:right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:var(--surface-2);font-weight:600">
              <td class="mono">${fmtDate(stmt.start)}</td>
              <td colspan="4"><i>OPENING BALANCE B/F</i></td>
              <td style="text-align:right" class="mono"><b>${inr(stmt.openingBalance)}</b></td>
            </tr>
            ${stmt.rows.length === 0 ? `
              <tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No transactions found in this date range.</td></tr>
            ` : stmt.rows.map(r => `
              <tr>
                <td class="mono" style="white-space:nowrap">${fmtDate(r.date)}</td>
                <td>
                  <div style="font-weight:600">${esc(r.party)}</div>
                  <div class="small muted">${esc(r.note || r.cat)}</div>
                </td>
                <td><span class="chip in" style="font-size:9.5px">${esc(r.mode)}</span></td>
                <td style="text-align:right;color:var(--bad);white-space:nowrap" class="mono">${r.debit ? "− " + inr(r.debit) : "—"}</td>
                <td style="text-align:right;color:var(--good);white-space:nowrap" class="mono">${r.credit ? "+ " + inr(r.credit) : "—"}</td>
                <td style="text-align:right;font-weight:600;white-space:nowrap" class="mono">${inr(r.runningBalance)}</td>
              </tr>
            `).join("")}
            <tr style="background:var(--surface-2);font-weight:700;border-top:2px solid var(--line)">
              <td>TOTAL</td>
              <td>Closing Balance</td>
              <td>—</td>
              <td style="text-align:right;color:var(--bad);white-space:nowrap" class="mono">− ${inr(stmt.totalDebits)}</td>
              <td style="text-align:right;color:var(--good);white-space:nowrap" class="mono">+ ${inr(stmt.totalCredits)}</td>
              <td style="text-align:right;color:var(--accent);white-space:nowrap" class="mono">${inr(stmt.closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  openSheet("Bank Statement / Financial Report", html);
}

async function makeBankStatementPDF(filterOpts = {}) {
  if(!window.jspdf){ toast("PDF tool did not load. Check internet and reopen."); return; }
  toast("Generating statement PDF…");
  const stmt = buildBusinessStatement(filterOpts);
  const st = S.settings || {};
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"mm", format:"a4"});
  const W=210, H=297, M=12;
  const contentWidth = W - 2*M; // 186 mm

  const ORANGE = [232, 128, 42];
  const INK = [20, 20, 20];
  const BORDER = [40, 40, 40];
  const MUT = [90, 90, 90];
  const TH_BG = [238, 238, 238];
  const GRAND_BG = [247, 222, 199];
  const GOOD = [34, 150, 80];
  const BAD = [215, 45, 45];
  const pdfSafe = t => String(t||"").replace(/[×]/g,"x").replace(/[–—]/g,"-").replace(/[^\x20-\x7E\n]/g,"");

  let logo = null;
  if(st.logoId) logo = await loadImg(st.logoId);
  if(!logo) logo = await loadImg("/icons/the_wooden_art_logo.png");

  let pageNum = 1;
  const colW = [20, 56, 26, 18, 22, 22, 22]; // Sum = 186 mm
  const colHeaders = ["Date", "Particulars / Party", "Category", "Mode", "Debit (Dr)", "Credit (Cr)", "Balance"];

  function drawHeader(){
    let y = 10;
    let logoBottom = y;
    if(logo && logo.w && logo.h){
      const maxH = 16, maxW = 50;
      const ratio = logo.w / logo.h;
      let lh = maxH, lw = lh * ratio;
      if(lw > maxW){ lw = maxW; lh = lw / ratio; }
      doc.addImage(logo.data, logo.fmt, M, y + (maxH - lh)/2, lw, lh);
      logoBottom = y + maxH;
    } else {
      doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(...INK);
      doc.text((st.name || "THE WOODEN ART").toUpperCase(), M, y + 6);
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...MUT);
      doc.text("Interior & Exterior Hub", M, y + 10.5);
      logoBottom = y + 12;
    }

    let coY = y;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(pdfSafe(st.name || "THE WOODEN ART").toUpperCase(), W - M, coY + 3.2, {align:"right"});
    coY += 4.5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUT);

    const addrParts = [];
    if(st.address && st.address.trim()) addrParts.push(st.address.trim());
    const cs = [st.city, st.state].filter(Boolean).map(s => String(s).trim()).join(", ");
    if(cs) addrParts.push(cs);

    addrParts.forEach(p => {
      const lines = doc.splitTextToSize(pdfSafe(p), 105);
      lines.forEach(l => {
        doc.text(l, W - M, coY + 2.8, {align:"right"});
        coY += 3.3;
      });
    });

    const contactParts = [];
    if(st.phone) contactParts.push("Mo: " + pdfSafe(st.phone));
    if(st.email) contactParts.push("Email: " + pdfSafe(st.email));
    if(contactParts.length){ doc.text(contactParts.join("  |  "), W - M, coY + 2.8, {align:"right"}); coY += 3.3; }

    const regParts = [];
    if(st.gstin) regParts.push("GSTIN: " + pdfSafe(st.gstin));
    if(st.pan) regParts.push("PAN: " + pdfSafe(st.pan));
    if(regParts.length){ doc.text(regParts.join("  |  "), W - M, coY + 2.8, {align:"right"}); coY += 3.3; }

    y = Math.max(28, Math.max(logoBottom, coY) + 2.5);
    doc.setFillColor(...ORANGE);
    doc.rect(M, y, contentWidth, 3.2, "F");
    y += 5.5;

    doc.setFont("helvetica","bold"); doc.setFontSize(12.5); doc.setTextColor(...INK);
    doc.text("BUSINESS FINANCIAL STATEMENT / PASSBOOK", W/2, y + 4.5, {align:"center"});
    y += 8;

    return y;
  }

  function drawTableHeader(y){
    doc.setFillColor(...TH_BG);
    doc.rect(M, y, contentWidth, 7, "F");
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(M, y, contentWidth, 7, "S");

    let cx = M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...INK);

    colHeaders.forEach((th, idx) => {
      const w = colW[idx];
      if(idx > 0) doc.line(cx, y, cx, y + 7);
      if(idx >= 4){
        doc.text(th, cx + w - 1.8, y + 4.8, {align:"right"});
      } else if(idx === 0 || idx === 3){
        doc.text(th, cx + w/2, y + 4.8, {align:"center"});
      } else {
        doc.text(th, cx + 1.8, y + 4.8);
      }
      cx += w;
    });

    return y + 7;
  }

  let y = drawHeader();

  // Sub-header details grid
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(M, y, contentWidth, 12, "S");
  doc.line(M + contentWidth/2, y, M + contentWidth/2, y + 12);

  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...INK);
  doc.text("Period:", M + 2.5, y + 4.2);
  doc.setFont("helvetica", "normal");
  doc.text(pdfSafe(stmt.label), M + 16, y + 4.2);

  doc.setFont("helvetica", "bold");
  doc.text("Dates:", M + 2.5, y + 9.2);
  doc.setFont("helvetica", "normal");
  doc.text(`${fmtDate(stmt.start)}  to  ${fmtDate(stmt.end)}`, M + 16, y + 9.2);

  doc.setFont("helvetica", "bold");
  doc.text("Generated On:", M + contentWidth/2 + 2.5, y + 4.2);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(today()), M + contentWidth/2 + 26, y + 4.2);

  doc.setFont("helvetica", "bold");
  doc.text("Total Entries:", M + contentWidth/2 + 2.5, y + 9.2);
  doc.setFont("helvetica", "normal");
  doc.text(`${stmt.rows.length} transactions`, M + contentWidth/2 + 26, y + 9.2);

  y += 15;

  // 5 KPI Summary boxes
  const boxGap = 2;
  const boxW = (contentWidth - 4 * boxGap) / 5;
  const boxH = 13.5;

  const kpis = [
    { label: "Opening Bal", val: pdfAmt(stmt.openingBalance), col: INK, bg: [245, 245, 245] },
    { label: "Total Credits (+)", val: "+" + pdfAmt(stmt.totalCredits), col: GOOD, bg: [238, 248, 242] },
    { label: "Total Debits (-)", val: "-" + pdfAmt(stmt.totalDebits), col: BAD, bg: [253, 239, 239] },
    { label: "Net Cashflow", val: (stmt.netChange>=0?"+":"-") + pdfAmt(Math.abs(stmt.netChange)), col: stmt.netChange>=0?GOOD:BAD, bg: [245, 245, 245] },
    { label: "Closing Bal", val: pdfAmt(stmt.closingBalance), col: INK, bg: GRAND_BG }
  ];

  kpis.forEach((kpi, idx) => {
    const bx = M + idx * (boxW + boxGap);
    doc.setFillColor(...kpi.bg);
    doc.rect(bx, y, boxW, boxH, "F");
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(bx, y, boxW, boxH, "S");

    doc.setFont("helvetica", "bold"); doc.setFontSize(6.8); doc.setTextColor(...MUT);
    doc.text(kpi.label.toUpperCase(), bx + boxW/2, y + 4.2, {align:"center"});

    doc.setFont("helvetica", "bold"); doc.setFontSize(8.2); doc.setTextColor(...kpi.col);
    doc.text(pdfSafe(kpi.val), bx + boxW/2, y + 9.8, {align:"center"});
  });

  y += boxH + 4;

  y = drawTableHeader(y);

  function printTableRow(rowVals, isBold = false, bg = null){
    const rowH = 6.2;
    if(y + rowH > H - 16){
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUT);
      doc.text(`Page ${pageNum} · Khata Desk Statement`, W/2, H - 7, {align:"center"});
      doc.addPage();
      pageNum++;
      let ny = 12;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...INK);
      doc.text(`Financial Statement - Continued (Page ${pageNum})`, M, ny);
      ny += 4.5;
      y = drawTableHeader(ny);
    }

    if(bg){
      doc.setFillColor(...bg);
      doc.rect(M, y, contentWidth, rowH, "F");
    }

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.rect(M, y, contentWidth, rowH, "S");

    let cx = M;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(7.5);

    rowVals.forEach((val, idx) => {
      const w = colW[idx];
      if(idx > 0) doc.line(cx, y, cx, y + rowH);

      doc.setTextColor(...(val.col || INK));
      if(idx >= 4){
        doc.text(pdfSafe(val.text), cx + w - 1.8, y + 4.2, {align:"right"});
      } else if(idx === 0 || idx === 3){
        doc.text(pdfSafe(val.text), cx + w/2, y + 4.2, {align:"center"});
      } else {
        doc.text(pdfSafe(val.text), cx + 1.8, y + 4.2);
      }
      cx += w;
    });

    y += rowH;
  }

  // Row 1: Opening Balance
  printTableRow([
    { text: fmtDate(stmt.start) },
    { text: "OPENING BALANCE B/F" },
    { text: "Balance" },
    { text: "—" },
    { text: "—" },
    { text: "—" },
    { text: pdfAmt(stmt.openingBalance) }
  ], true, [248, 248, 248]);

  // Transaction Rows
  stmt.rows.forEach(r => {
    const partyText = (r.party || "Entry").slice(0, 32);
    const catText = (r.cat || "—").slice(0, 16);
    const modeText = (r.mode || "—").slice(0, 10);
    const debitText = r.debit ? pdfAmt(r.debit) : "—";
    const creditText = r.credit ? pdfAmt(r.credit) : "—";
    const balText = pdfAmt(r.runningBalance);

    printTableRow([
      { text: fmtDate(r.date) },
      { text: partyText },
      { text: catText },
      { text: modeText },
      { text: debitText, col: r.debit ? BAD : MUT },
      { text: creditText, col: r.credit ? GOOD : MUT },
      { text: balText }
    ], false);
  });

  // Final Summary Row
  printTableRow([
    { text: "TOTAL" },
    { text: "CLOSING BALANCE" },
    { text: "—" },
    { text: "—" },
    { text: pdfAmt(stmt.totalDebits), col: BAD },
    { text: pdfAmt(stmt.totalCredits), col: GOOD },
    { text: pdfAmt(stmt.closingBalance) }
  ], true, GRAND_BG);

  // Footer for last page
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUT);
  doc.text(`Page ${pageNum} · Khata Desk Statement`, W/2, H - 7, {align:"center"});

  const pdfBlob = doc.output("blob");
  const cleanPeriod = (stmt.periodName || "statement").replace(/[^\w]+/g, "_");
  const filename = `Statement_${cleanPeriod}_${stmt.start}_to_${stmt.end}.pdf`;

  if(S.dl && S.dl.save){
    await S.dl.save({filename, data: pdfBlob});
  } else {
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  toast("Statement PDF downloaded");
}

function downloadBankStatementExcel(filterOpts = {}) {
  const stmt = buildBusinessStatement(filterOpts);
  const st = S.settings || {};
  const rows = [];

  rows.push([st.name || "Khata Desk Business Account"]);
  const fullAddr = [st.address, st.city, st.state].filter(Boolean).join(", ");
  if(fullAddr) rows.push([fullAddr]);
  rows.push([
    st.phone ? "Phone: " + st.phone : "",
    st.email ? "Email: " + st.email : "",
    st.gstin ? "GSTIN: " + st.gstin : "",
    st.pan ? "PAN: " + st.pan : ""
  ].filter(Boolean));
  rows.push(["BUSINESS FINANCIAL STATEMENT / PASSBOOK"]);
  rows.push(["Statement Period", stmt.label, "From", stmt.start, "To", stmt.end]);
  rows.push(["Generated Date", today(), "Mode Filter", stmt.modeFilter, "Type Filter", stmt.typeFilter]);
  rows.push([]);

  rows.push(["FINANCIAL SUMMARY"]);
  rows.push(["Opening Balance (Rs.)", stmt.openingBalance.toFixed(2)]);
  rows.push(["Total Credits / Inflow (Rs.)", stmt.totalCredits.toFixed(2)]);
  rows.push(["Total Debits / Outflow (Rs.)", stmt.totalDebits.toFixed(2)]);
  rows.push(["Net Cashflow / P&L (Rs.)", stmt.netChange.toFixed(2)]);
  rows.push(["Closing Balance (Rs.)", stmt.closingBalance.toFixed(2)]);
  rows.push([]);

  rows.push([
    "Sr No.",
    "Date",
    "Particulars / Party",
    "Category",
    "Payment Mode",
    "Debit / Outflow (Rs.)",
    "Credit / Inflow (Rs.)",
    "Running Balance (Rs.)",
    "Reference / Note"
  ]);

  rows.push([
    "—",
    stmt.start,
    "OPENING BALANCE B/F",
    "Balance",
    "—",
    "",
    "",
    stmt.openingBalance.toFixed(2),
    "Opening Balance"
  ]);

  stmt.rows.forEach(r => {
    rows.push([
      r.sr,
      r.date,
      r.party,
      r.cat,
      r.mode,
      r.debit ? r.debit.toFixed(2) : "",
      r.credit ? r.credit.toFixed(2) : "",
      r.runningBalance.toFixed(2),
      r.note
    ]);
  });

  rows.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    stmt.totalDebits.toFixed(2),
    stmt.totalCredits.toFixed(2),
    stmt.closingBalance.toFixed(2),
    "CLOSING BALANCE"
  ]);

  const cleanPeriod = (stmt.periodName || "statement").replace(/[^\w]+/g, "_");
  const filename = `Statement_${cleanPeriod}_${stmt.start}_to_${stmt.end}.csv`;
  return saveText(filename, csv(rows));
}

function clientForm(c, after){
  c=c||{}; S._afterClient = after||null;
  const sites = getClientSites(c);
  const sitesStr = (c.sites && Array.isArray(c.sites)) ? c.sites.join(", ") : (c.site || "");
  openSheet(c.id?"Edit client":"Add client", `<form id="cliForm" data-form="cli" data-id="${c.id||""}"><div class="fg">
    <label class="f full"><span>Client / Party name</span><input name="name" required value="${esc(c.name||"")}" placeholder="e.g. Ar. Rajesh Sharma, Pappu Mistry"></label>
    <label class="f full"><span>Primary / Default Site name</span><input name="site" value="${esc(c.site||"")}" placeholder="e.g. Villa 101, Living Room"></label>
    <label class="f full"><span>All Sites / Sides (comma-separated)</span><input name="sites" value="${esc(sitesStr)}" placeholder="e.g. Villa 101, Flat 402, Skyline Tower"><span class="small muted">Clients like Architects & Mistries usually have multiple active sites</span></label>
    <label class="f"><span>Phone</span><input name="phone" type="tel" inputmode="tel" value="${esc(c.phone||"")}"></label>
    <label class="f"><span>GSTIN</span><input name="gstin" maxlength="15" style="text-transform:uppercase" value="${esc(c.gstin||"")}"></label>
    <label class="f full"><span>Address</span><input name="address" value="${esc(c.address||"")}"></label>
    <label class="f full"><span>State</span><select name="state"><option value="">Select state</option>${STATES.map(s=>`<option ${s===(c.state||S.settings.state)?"selected":""}>${s}</option>`).join("")}</select></label>
    <label class="f full"><span>Notes / Profession</span><input name="notes" value="${esc(c.notes||"")}" placeholder="e.g. Architect, Interior Designer, Contractor, Mistry"></label>
  </div></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit" form="cliForm">Save</button>`);
}

async function saveCli(form){
  const id=form.dataset.id;
  const rawSites = (form.sites ? form.sites.value : "").split(",").map(s=>s.trim()).filter(Boolean);
  const primarySite = form.site ? form.site.value.trim() : "";
  if(primarySite && !rawSites.some(s => s.toLowerCase() === primarySite.toLowerCase())) {
    rawSites.unshift(primarySite);
  }
  const sites = Array.from(new Set(rawSites));

  const c={
    name:form.name.value.trim(),
    site: primarySite || (sites[0] || ""),
    sites,
    phone:form.phone.value.trim(),
    gstin:form.gstin.value.trim().toUpperCase(),
    address:form.address.value.trim(),
    state:form.state.value,
    notes:form.notes.value.trim(),
    updatedAt:Date.now()
  };
  if(!c.name){ toast("Enter a client name."); return; }
  let ref;
  const ok = await write(async()=>{
    if(id){ ref=S.db.collection("clients").doc(id); await ref.update(c); }
    else { ref=S.db.collection("clients").doc(); await ref.set({...c, createdAt:Date.now(), ...uidMeta()}); }
  }, "Client saved");
  if(!ok) return;
  if(!id && !S.clients.some(x=>x.id===ref.id)) S.clients.push({id:ref.id, ...c});
  else if(id){
    const idx = S.clients.findIndex(x=>x.id===id);
    if(idx !== -1) Object.assign(S.clients[idx], c);
  }
  if(S._afterClient){ const f=S._afterClient; S._afterClient=null; f(ref.id); }
  else { closeSheet(); dClient(ref.id); }
}

function dClient(id, refresh){
  const c=S.clients.find(x=>x.id===id); if(!c){ missing("client",id,refresh); return; }
  const cName = (c.name || "").trim().toLowerCase();

  S.cliState = S.cliState || {};
  const cs = (S.cliState[id] = S.cliState[id] || { tab: "ledger", site: "all", period: "all", q: "" });

  const allSites = getClientSites(c);
  const ledger = buildClientLedger(c, cs.site, cs.period, cs.q);

  const invs = S.invoices.filter(i=>(i.client?.id===id) || (i.client?.name && i.client.name.trim().toLowerCase()===cName)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const quotes = S.quotes.filter(q=>(q.client?.id===id) || (q.client?.name && q.client.name.trim().toLowerCase()===cName)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));

  const ph = (c.phone||"").replace(/\D/g,""); const num = ph.length===10 ? "91"+ph : ph;
  const isDue = ledger.closingBalance > 0.01;

  let b = `
  <div class="cli-header-card">
    <div class="cli-header-top">
      <div>
        <h3 class="cli-name-title">${esc(c.name)} ${c.notes ? `<span class="chip" style="font-size:11px;font-weight:600">${esc(c.notes)}</span>` : ""}</h3>
        <div class="small muted" style="margin-top:3px">${esc([c.gstin && ("GSTIN: " + c.gstin), c.state, c.address].filter(Boolean).join(" · ")||"No address added")}</div>
      </div>
      <div class="cli-contact-links">
        ${c.phone ? `<a href="tel:${esc(c.phone)}" class="btn sm">${svg("wa",1.8)} Call</a><a href="https://wa.me/${num}" target="_blank" rel="noopener" class="btn sm">${svg("wa",1.8)} WhatsApp</a>` : ""}
      </div>
    </div>
    ${allSites.length ? `
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px">
        <span class="small muted">Sites (${allSites.length}):</span>
        ${allSites.map(s => `<span class="chip-site" style="cursor:pointer" data-act="filterToSite" data-id="${id}" data-site="${esc(s)}">${esc(s)}</span>`).join("")}
      </div>
    ` : ""}
  </div>

  <div class="cli-stat-grid">
    <div class="cli-stat-card">
      <div class="cli-stat-k">Total Billed</div>
      <div class="cli-stat-v">${inrShort(ledger.totalDebit)}</div>
      <div class="cli-stat-sub">${cs.site!=="all" ? esc(cs.site) : "All sites"} · ${ledger.entries.filter(e=>e.type==='debit').length} jobs</div>
    </div>
    <div class="cli-stat-card">
      <div class="cli-stat-k">Total Received</div>
      <div class="cli-stat-v" style="color:var(--good)">${inrShort(ledger.totalCredit)}</div>
      <div class="cli-stat-sub">${ledger.entries.filter(e=>e.type==='credit').length} payment${ledger.entries.filter(e=>e.type==='credit').length===1?"":"s"}</div>
    </div>
    <div class="cli-stat-card ${isDue ? 'due-card' : 'clear-card'}">
      <div class="cli-stat-k">${isDue ? 'Balance Due' : (ledger.closingBalance < -0.01 ? 'Advance Balance' : 'Account Balance')}</div>
      <div class="cli-stat-v" style="color:${isDue ? 'var(--bad)' : 'var(--good)'}">${inr(Math.abs(ledger.closingBalance))}</div>
      <div class="cli-stat-sub" style="color:${isDue ? 'var(--bad)' : 'var(--good)'}">${isDue ? "Pending from client" : (ledger.closingBalance < -0.01 ? "Advance with workshop" : "Clear")}</div>
    </div>
  </div>

  <div class="cli-quick-acts">
    ${S.canWrite ? `<button class="btn pri" data-act="clientPay" data-id="${id}" data-site="${esc(cs.site!=="all"?cs.site:"")}">${svg("down")}Receive Payment</button>` : ""}
    ${S.canWrite ? `<button class="btn" data-act="newInvoiceForClient" data-id="${id}" data-site="${esc(cs.site!=="all"?cs.site:"")}">${svg("plus")}New Invoice</button>` : ""}
    <button class="btn" data-act="waClientLedger" data-id="${id}" data-site="${esc(cs.site)}" data-period="${esc(cs.period)}">${svg("wa")}Share Statement</button>
    <button class="btn" data-act="pdfClientLedger" data-id="${id}" data-site="${esc(cs.site)}" data-period="${esc(cs.period)}">${svg("dl")}PDF Statement</button>
    <button class="btn sm" data-act="exportClientLedger" data-id="${id}" data-site="${esc(cs.site)}" data-period="${esc(cs.period)}">${svg("dl")}CSV</button>
  </div>

  <div class="seg" role="group" style="margin-bottom:12px">
    <button data-act="cliTab" data-id="${id}" data-tab="ledger" aria-pressed="${cs.tab==='ledger'}">Khata Ledger</button>
    <button data-act="cliTab" data-id="${id}" data-tab="sites" aria-pressed="${cs.tab==='sites'}">Sites (${allSites.length})</button>
    <button data-act="cliTab" data-id="${id}" data-tab="invoices" aria-pressed="${cs.tab==='invoices'}">Invoices (${invs.length})</button>
    <button data-act="cliTab" data-id="${id}" data-tab="quotes" aria-pressed="${cs.tab==='quotes'}">Quotations (${quotes.length})</button>
    <button data-act="cliTab" data-id="${id}" data-tab="profile" aria-pressed="${cs.tab==='profile'}">Profile</button>
  </div>
  `;

  if(cs.tab === "ledger"){
    b += `
    <div class="cli-toolbar">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--muted)">
        Site:
        <select class="cli-filter-select" data-act="cliSiteFilter" data-id="${id}">
          <option value="all" ${cs.site==="all"?"selected":""}>All Sites (${allSites.length})</option>
          ${allSites.map(s => {
            const st = ledger.sitesSummary[s] || {};
            return `<option value="${esc(s)}" ${cs.site===s?"selected":""}>${esc(s)} (${st.invCount||0} inv · ${inr(st.due||0)} due)</option>`;
          }).join("")}
        </select>
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--muted)">
        Period:
        <select class="cli-filter-select" data-act="cliPeriodFilter" data-id="${id}">
          <option value="all" ${cs.period==="all"?"selected":""}>All Time</option>
          <option value="this_month" ${cs.period==="this_month"?"selected":""}>This Month</option>
          <option value="last_month" ${cs.period==="last_month"?"selected":""}>Last Month</option>
          <option value="last_90" ${cs.period==="last_90"?"selected":""}>Last 90 Days</option>
        </select>
      </label>
      ${cs.site!=="all" || cs.period!=="all" ? `<button class="btn sm" data-act="filterToSite" data-id="${id}" data-site="all" style="padding:4px 8px">Clear filters</button>` : ""}
    </div>
    `;

    if(!ledger.entries.length){
      b += `<div class="card" style="text-align:center;padding:26px 14px;color:var(--muted)">
        <p style="margin:0 0 10px;font-size:14px">No work or payment entries match this selection.</p>
        <button class="btn sm pri" data-act="newInvoiceForClient" data-id="${id}" data-site="${esc(cs.site!=="all"?cs.site:"")}">+ New Invoice</button>
        <button class="btn sm" data-act="clientPay" data-id="${id}" data-site="${esc(cs.site!=="all"?cs.site:"")}" style="margin-left:6px">+ Receive Payment</button>
      </div>`;
    } else {
      b += `
      <div class="cli-tbl-wrap">
        <table class="cli-tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Site / Side</th>
              <th>Particulars</th>
              <th class="r">Debit (Work)</th>
              <th class="r">Credit (Paid)</th>
              <th class="r">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${ledger.openingBalance !== 0 ? `
              <tr class="row-opening">
                <td>${fmtDate(today())}</td>
                <td>—</td>
                <td><i>Opening Balance (${cs.period})</i></td>
                <td class="r">—</td>
                <td class="r">—</td>
                <td class="amt-bal">${inr(ledger.openingBalance)}</td>
              </tr>
            ` : ""}
            ${ledger.entries.map(e => {
              const isDebit = e.type === "debit";
              const rowAct = e.src === "invoice" ? `data-act="openInvoice" data-id="${e.id}" style="cursor:pointer"` :
                             (e.src === "inv_pay" ? `data-act="openInvoice" data-id="${e.invId}" style="cursor:pointer"` :
                             (e.src === "txn" ? `data-act="openTxn" data-id="${e.id}" style="cursor:pointer"` : ""));
              const balClass = e.balance > 0 ? "bal-pos" : (e.balance < 0 ? "bal-adv" : "bal-zero");
              return `
                <tr class="${isDebit ? "row-debit" : "row-credit"}" ${rowAct}>
                  <td>${fmtDate(e.date)}</td>
                  <td>${e.site ? `<span class="chip-site">${esc(e.site)}</span>` : `<span class="muted">—</span>`}</td>
                  <td>
                    <div style="font-weight:600;color:var(--ink)">${esc(e.desc)}</div>
                    ${e.notes ? `<div class="small muted">${esc(e.notes)}</div>` : ""}
                  </td>
                  <td class="amt-debit">${e.debit > 0 ? inr(e.debit) : '<span class="muted">—</span>'}</td>
                  <td class="amt-credit">${e.credit > 0 ? inr(e.credit) : '<span class="muted">—</span>'}</td>
                  <td class="amt-bal ${balClass}">${inr(e.balance)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
          <tfoot>
            <tr style="background:var(--surface-2);font-weight:700">
              <td colspan="3"><b>Net Total (${ledger.entries.length} entr${ledger.entries.length===1?"y":"ies"})</b></td>
              <td class="amt-debit">${inr(ledger.totalDebit)}</td>
              <td class="amt-credit">${inr(ledger.totalCredit)}</td>
              <td class="amt-bal ${ledger.closingBalance>0?"bal-pos":"bal-zero"}">${inr(ledger.closingBalance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="small muted" style="margin:8px 0 0">💡 Tap on any invoice or payment row to view its details or receipt.</p>
      `;
    }
  } else if(cs.tab === "sites"){
    b += `
    <div class="card" style="margin-bottom:12px;padding:12px">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px">Register new site for ${esc(c.name)}</div>
      <div style="display:flex;gap:8px">
        <input id="addSiteInput_${id}" placeholder="e.g. Bungalow 402, Sharma Residence" style="flex:1">
        <button class="btn pri sm" data-act="addClientSite" data-id="${id}">+ Add Site</button>
      </div>
      <p class="small muted" style="margin:6px 0 0">Added sites will automatically appear in suggestions whenever you make an invoice or quote.</p>
    </div>
    `;

    if(!allSites.length){
      b += `<p class="muted">No sites registered yet. Add a site above, or create an invoice with a site name.</p>`;
    } else {
      b += `<div class="cli-site-list">${allSites.map(s => {
        const st = ledger.sitesSummary[s] || { billed: 0, received: 0, due: 0, invCount: 0 };
        const isSiteDue = st.due > 0.01;
        return `
        <div class="cli-site-card">
          <div class="cli-site-hd">
            <div class="cli-site-name"><span class="chip-site" style="font-size:13px">${esc(s)}</span></div>
            <span class="chip ${isSiteDue ? 'overdue' : 'ok'}">${isSiteDue ? inr(st.due) + ' due' : 'clear'}</span>
          </div>
          <div class="cli-site-metrics">
            <div><span class="muted">Billed:</span> <b>${inr(st.billed)}</b></div>
            <div><span class="muted">Received:</span> <b style="color:var(--good)">${inr(st.received)}</b></div>
            <div><span class="muted">Invoices:</span> <b>${st.invCount}</b></div>
          </div>
          <div class="cli-site-actions">
            <button class="btn sm" data-act="filterToSite" data-id="${id}" data-site="${esc(s)}">View Site Ledger</button>
            ${S.canWrite ? `<button class="btn sm pri" data-act="newInvoiceForClient" data-id="${id}" data-site="${esc(s)}">+ Invoice for Site</button>` : ""}
            ${S.canWrite && isSiteDue ? `<button class="btn sm" data-act="clientPay" data-id="${id}" data-site="${esc(s)}">Receive Site Pay</button>` : ""}
          </div>
        </div>
        `;
      }).join("")}</div>`;
    }
  } else if(cs.tab === "invoices"){
    const filteredInvs = cs.site && cs.site !== "all" ? invs.filter(i => (i.site||i.client?.site||"").trim().toLowerCase() === cs.site.toLowerCase()) : invs;
    b += filteredInvs.length ? `<div class="list">${filteredInvs.map(i=>{
      const st=invStatus(i);
      const sSite = i.site || i.client?.site;
      return `<button class="row" data-act="openInvoice" data-id="${i.id}"><div class="av n">${svg("doc")}</div><div class="main"><div class="t"><span class="mono">${esc(i.no)}</span>${sSite ? ` <span class="chip-site">${esc(sSite)}</span>` : ""}</div><div class="s">${fmtDate(i.date)}${i.gstMode==="gst"?" · GST":""}</div></div><div class="amt"><b>${inr(i.total)}</b><span class="chip ${st}">${st}</span></div></button>`;
    }).join("")}</div>` : `<p class="small muted">No invoices found for this client ${cs.site!=="all"?`on site “${esc(cs.site)}”`:""}.</p>`;
  } else if(cs.tab === "quotes"){
    b += quotes.length ? `<div class="list">${quotes.map(q=>{
      const st=q.status||"sent";
      const sSite = q.site || q.client?.site;
      return `<button class="row" data-act="openQuote" data-id="${q.id}"><div class="av n">${svg("quote")}</div><div class="main"><div class="t"><span class="mono">${esc(q.no)}</span>${sSite ? ` <span class="chip-site">${esc(sSite)}</span>` : ""}</div><div class="s">${fmtDate(q.date)}</div></div><div class="amt"><b>${inr(q.total)}</b><span class="chip ${st}">${st}</span></div></button>`;
    }).join("")}</div>` : `<p class="small muted">No quotations for this client yet.</p>`;
  } else if(cs.tab === "profile"){
    b += `
    <dl class="dl" style="margin-top:12px">
      ${c.site?`<dt>Primary Site</dt><dd style="font-weight:600;color:var(--brand)">${esc(c.site)}</dd>`:""}
      ${allSites.length?`<dt>All Sites</dt><dd>${esc(allSites.join(", "))}</dd>`:""}
      ${c.phone?`<dt>Phone</dt><dd>${esc(c.phone)}</dd>`:""}
      ${c.gstin?`<dt>GSTIN</dt><dd class="mono">${esc(c.gstin)}</dd>`:""}
      ${c.state?`<dt>State</dt><dd>${esc(c.state)}</dd>`:""}
      ${c.address?`<dt>Address</dt><dd>${esc(c.address)}</dd>`:""}
      ${c.notes?`<dt>Notes</dt><dd>${esc(c.notes)}</dd>`:""}
    </dl>
    ${S.canWrite ? `<div class="actions" style="margin-top:18px"><button class="btn" data-act="editClient" data-id="${id}">${svg("edit")}Edit Client</button><button class="btn danger" data-act="delClient" data-id="${id}">${svg("trash")}Delete Client</button></div>` : ""}
    `;
  }

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
  const data = (/\.csv$/.test(filename) ? "\ufeff" : "") + text;
  if(S.dl && S.dl.save){
    try{ await S.dl.save({filename, data}); return; }
    catch(e){ if(e?.code==="declined") return; }
  }
  try{
    const mime = /\.csv$/.test(filename) ? "text/csv;charset=utf-8;" : (/\.json$/.test(filename) ? "application/json" : "text/plain");
    const blob = new Blob([data], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
  }catch(e){
    console.error("saveText failed:", e);
    toast("Could not save file.");
  }
}
const EXPORTS = {
  exportInvoices: ()=> saveText(`invoices_${today()}.csv`, csv([["Invoice no","Date","Client","Site","Client GSTIN","Type","Total sq.ft","Taxable","Discount","Round off","Tax","Total","Received","Balance","Status","Due date"], ...[...S.invoices].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(i=>{ const ci=calc(i); return [i.no,i.date,i.client?.name,i.site||i.client?.site||"",i.client?.gstin,i.gstMode==="gst"?"GST":"Simple",ci.area,ci.sub,ci.discount||0,ci.roundOff||0,ci.tax,ci.total,paidOf(i),r2(ci.total-paidOf(i)),invStatus(i),i.dueDate]; })])),
  exportClients: ()=> saveText(`clients_${today()}.csv`, csv([["Client name","Phone","Email","GSTIN","PAN","State","Address","Total Billed","Total Received","Balance Due"], ...[...S.clients].sort((a,b)=>(a.name||"").localeCompare(b.name||"")).map(c=>{ const invs=S.invoices.filter(i=>(i.client?.id===c.id)||(i.client?.name&&i.client.name.trim().toLowerCase()===(c.name||"").trim().toLowerCase())); const billed=sum(invs,i=>+i.total||0); const received=sum(invs,paidOf); const due=Math.max(0,billed-received); return [c.name,c.phone,c.email,c.gstin,c.pan,c.state,c.address,billed,received,due]; })])),
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
    case "toggleTheme": toggleTheme(); break;
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
      const sitePref = el.dataset.site || c?.site || "";
      if(c){
        docForm("invoice", {
          site: sitePref,
          client: {
            id: c.id,
            name: c.name,
            site: sitePref,
            phone: c.phone || "",
            gstin: c.gstin || "",
            address: c.address || "",
            state: c.state || ""
          }
        });
      }
      break;
    }
    case "newQuoteForClient": {
      const c = S.clients.find(x=>x.id===id);
      const sitePref = el.dataset.site || c?.site || "";
      if(c){
        docForm("quote", {
          site: sitePref,
          client: {
            id: c.id,
            name: c.name,
            site: sitePref,
            phone: c.phone || "",
            gstin: c.gstin || "",
            address: c.address || "",
            state: c.state || ""
          }
        });
      }
      break;
    }
    case "pickDocSite": {
      const f = $("#docForm");
      if(!f) break;
      const site = el.dataset.site || "";
      if(f.csite) f.csite.value = site;
      if(f.csiteSelect){
        const matching = Array.from(f.csiteSelect.options).find(o => o.value && o.value.toLowerCase() === site.toLowerCase());
        if(matching) f.csiteSelect.value = matching.value;
        else if(site) f.csiteSelect.value = "__custom";
        else f.csiteSelect.value = "";
      }
      $$("#csiteChips button").forEach(b => b.classList.toggle("active", (b.dataset.site||"").toLowerCase() === site.toLowerCase()));
      break;
    }
    case "cliTab": {
      const cId = el.dataset.id;
      if(cId){
        S.cliState = S.cliState || {};
        S.cliState[cId] = S.cliState[cId] || {};
        S.cliState[cId].tab = el.dataset.tab;
        dClient(cId, true);
      }
      break;
    }
    case "filterToSite": {
      const cId = el.dataset.id;
      const site = el.dataset.site || "all";
      if(cId){
        S.cliState = S.cliState || {};
        S.cliState[cId] = S.cliState[cId] || {};
        S.cliState[cId].site = site;
        S.cliState[cId].tab = "ledger";
        dClient(cId, true);
      }
      break;
    }
    case "clientPay": clientPayForm(id, el.dataset.site||""); break;
    case "waClientLedger": shareClientLedgerWhatsApp(id, el.dataset.site||"all", el.dataset.period||"all"); break;
    case "pdfClientLedger": makeClientLedgerPDF(id, el.dataset.site||"all", el.dataset.period||"all"); break;
    case "exportClientLedger": exportClientLedgerCSV(id, el.dataset.site||"all", el.dataset.period||"all"); break;
    case "openBankStatement": openBankStatementSheet(); break;
    case "stmtPeriod": {
      S._stmtPeriod = el.dataset.period;
      openBankStatementSheet({ period: S._stmtPeriod });
      break;
    }
    case "applyStmtCustom": {
      const cs = $("#stmtCustomStart")?.value;
      const ce = $("#stmtCustomEnd")?.value;
      if(!cs || !ce) { toast("Please select both From and To dates."); break; }
      S._stmtCustomStart = cs;
      S._stmtCustomEnd = ce;
      openBankStatementSheet({ period: "custom", customStart: cs, customEnd: ce });
      break;
    }
    case "downloadStmtPdf": {
      el.disabled = true;
      await makeBankStatementPDF({
        period: S._stmtPeriod || "this_month",
        customStart: S._stmtCustomStart,
        customEnd: S._stmtCustomEnd,
        mode: S._stmtMode || "all",
        type: S._stmtType || "all"
      });
      el.disabled = false;
      break;
    }
    case "downloadStmtExcel": {
      downloadBankStatementExcel({
        period: S._stmtPeriod || "this_month",
        customStart: S._stmtCustomStart,
        customEnd: S._stmtCustomEnd,
        mode: S._stmtMode || "all",
        type: S._stmtType || "all"
      });
      break;
    }
    case "addClientSite": {
      const cId = el.dataset.id;
      const c = S.clients.find(x=>x.id===cId);
      if(!c) break;
      const inEl = $(`#addSiteInput_${cId}`);
      const newSite = inEl ? inEl.value.trim() : "";
      if(!newSite){ toast("Enter a site name."); break; }
      const existingSites = getClientSites(c);
      if(!existingSites.some(s => s.toLowerCase() === newSite.toLowerCase())){
        existingSites.push(newSite);
        c.sites = existingSites;
        if(!c.site) c.site = newSite;
        await write(() => S.db.collection("clients").doc(cId).update({ sites: existingSites, site: c.site, updatedAt: Date.now() }), `Site "${newSite}" added`);
        dClient(cId, true);
      } else {
        toast(`Site "${newSite}" already exists.`);
      }
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
    case "pickTripType": {
      const r = el.closest(".item");
      if(!r) break;
      const type = el.dataset.type;
      const qtyIn = $("[name=qty]", r);
      const unitIn = $("[name=unit]", r);
      const descIn = $("[name=desc]", r);
      const rateIn = $("[name=rate]", r);

      r.dataset.pricing = "unit";
      const pIn = $("[name=pricing]", r); if(pIn) pIn.value = "unit";
      $$("[data-act=pricing]", r).forEach(b => b.setAttribute("aria-pressed", b.dataset.v === "unit"));
      const pseg = $(".pseg", r); if(pseg) pseg.hidden = true;
      const qlbl = $(".qlbl", r); if(qlbl) qlbl.textContent = "No. of Trips";
      const rlbl = $(".rlbl", r); if(rlbl) rlbl.textContent = "Rate / Trip (₹)";

      if(type === "single"){
        if(qtyIn) qtyIn.value = 1;
        if(unitIn) unitIn.value = "Trip";
        if(descIn) descIn.value = "Transportation - Single Trip (Material Pickup)";
      } else if(type === "dual"){
        if(qtyIn) qtyIn.value = 2;
        if(unitIn) unitIn.value = "Trips";
        if(descIn) descIn.value = "Transportation - Dual Trip (Pickup & Delivery)";
      } else if(type === "custom"){
        if(unitIn) unitIn.value = "Trip";
        if(qtyIn) { qtyIn.focus(); qtyIn.select(); }
      }

      $$("[data-act=pickTripType]", r).forEach(b => b.classList.toggle("active", b.dataset.type === type));
      if(rateIn && !rateIn.value){
        rateIn.focus();
      }
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
  const gst = d.gstMode ? d.gstMode==="gst" : (S.settings.defaultMode ? S.settings.defaultMode==="gst" : !!S.settings.gstin);
  f.gstMode.value=gst?"gst":"none";
  $$("[data-act=mode]",f).forEach(b=>b.setAttribute("aria-pressed", (b.dataset.v==="gst")===gst));
  $$(".gstonly",f).forEach(x=>x.hidden=!gst);
  const cl=d.client||{};
  f.cname.value=cl.name||"";
  const siteVal = d.site || cl.site || "";
  if(f.csite) f.csite.value=siteVal;
  updateDocSiteOptions(cl.name || "", siteVal);
  f.cphone.value=cl.phone||"";
  f.caddress.value=cl.address||"";
  f.cgstin.value=cl.gstin||"";
  if(cl.state) f.cstate.value=cl.state;
  if(f.discount) f.discount.value=(d.discount!==undefined&&d.discount!==null&&+d.discount>0)?d.discount:"";
  if(f.roundOff) f.roundOff.value=(d.hasManualRoundOff&&d.roundOff!==undefined&&d.roundOff!==null)?d.roundOff:"";
  $("#items").innerHTML=(d.items||[{}]).map(it=>itemRow(it,gst)).join("");
  f.notes.value=d.notes||"";
  recalcForm();
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
    if(t.name==="cname"){
      const c = clientNames().get(t.value) || S.clients.find(x => (x.name||"").trim().toLowerCase() === t.value.trim().toLowerCase());
      if(c){
        const f=t.form;
        ["phone","address","gstin"].forEach(k=>{ if(!f["c"+k].value) f["c"+k].value=c[k]||""; });
        if(c.state && !f.cstate.value) f.cstate.value=c.state;
        const targetSite = f.csite?.value || c.site || "";
        updateDocSiteOptions(c.name, targetSite);
        if(f.csite && !f.csite.value && c.site) f.csite.value=c.site;
      } else {
        updateDocSiteOptions(t.value, t.form?.csite?.value || "");
      }
    }
    if(t.id==="csiteInput" || t.name==="csite"){
      const f = t.form || $("#docForm");
      const val = t.value.trim().toLowerCase();
      if(f && f.csiteSelect){
        const matching = Array.from(f.csiteSelect.options).find(o => o.value && o.value.toLowerCase() === val);
        if(matching){
          f.csiteSelect.value = matching.value;
        } else if(t.value.trim()){
          f.csiteSelect.value = "__custom";
        } else {
          f.csiteSelect.value = "";
        }
      }
      $$("#csiteChips button").forEach(b => b.classList.toggle("active", (b.dataset.site||"").toLowerCase() === val));
    }
    if(t.name==="qty"){
      const r = t.closest(".item");
      if(r && $("[name=material]", r)?.value === "Transportation"){
        const num = +t.value;
        const unitIn = $("[name=unit]", r);
        if(unitIn) unitIn.value = num === 2 ? "Trips" : "Trip";
        $$("[data-act=pickTripType]", r).forEach(b => {
          b.classList.toggle("active", (b.dataset.type === "single" && num === 1) || (b.dataset.type === "dual" && num === 2));
        });
      }
    }
    if(t.name==="date" && !t.form.dataset.id){ const isQ=t.form.dataset.kind==="quote"; const nn=nextNo(isQ?S.quotes:S.invoices, isQ?(S.settings.quotePrefix||"QT"):(S.settings.invPrefix||"INV"), t.value); if(/\/\d{2}-\d{2}\/\d+$/.test(t.form.no.value)) t.form.no.value=nn.no; }
    recalcForm();
  }
});
document.addEventListener("change", async e => {
  const t=e.target;
  if(t.id==="stmtModeFilter"){
    S._stmtMode = t.value;
    openBankStatementSheet({ mode: S._stmtMode });
    return;
  }
  if(t.id==="stmtTypeFilter"){
    S._stmtType = t.value;
    openBankStatementSheet({ type: S._stmtType });
    return;
  }
  if(t.id==="csiteSelect" || t.name==="csiteSelect"){
    const f = t.form || $("#docForm");
    if(f){
      if(t.value === "__custom"){
        if(f.csite){
          f.csite.focus();
          f.csite.select();
        }
        $$("#csiteChips button").forEach(b => b.classList.remove("active"));
      } else {
        if(f.csite) f.csite.value = t.value;
        $$("#csiteChips button").forEach(b => b.classList.toggle("active", (b.dataset.site||"").toLowerCase() === (t.value||"").toLowerCase()));
      }
    }
    return;
  }
  if(t.name==="cname" && t.closest("#docForm")){
    const c = clientNames().get(t.value) || S.clients.find(x => (x.name||"").trim().toLowerCase() === t.value.trim().toLowerCase());
    if(c){
      const f=t.form;
      ["phone","address","gstin"].forEach(k=>{ if(!f["c"+k].value) f["c"+k].value=c[k]||""; });
      if(c.state && !f.cstate.value) f.cstate.value=c.state;
      const targetSite = f.csite?.value || c.site || "";
      updateDocSiteOptions(c.name, targetSite);
      if(f.csite && !f.csite.value && c.site) f.csite.value=c.site;
    } else {
      updateDocSiteOptions(t.value, t.form?.csite?.value || "");
    }
  }
  if(t.dataset.act==="cliSiteFilter"){
    const cId = t.dataset.id;
    if(cId){
      S.cliState = S.cliState || {};
      S.cliState[cId] = S.cliState[cId] || {};
      S.cliState[cId].site = t.value;
      dClient(cId, true);
    }
    return;
  }
  if(t.dataset.act==="cliPeriodFilter"){
    const cId = t.dataset.id;
    if(cId){
      S.cliState = S.cliState || {};
      S.cliState[cId] = S.cliState[cId] || {};
      S.cliState[cId].period = t.value;
      dClient(cId, true);
    }
    return;
  }
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
  const fn = {doc:saveDoc, pay:savePay, txn:saveTxn, mat:saveMat, move:saveMove, ven:saveVen, bill:saveBill, cli:saveCli, set:saveSettings, user:saveUser, pass:savePass, reset:saveReset, clientPay:saveClientPay}[f.dataset.form];
  if(!fn) return;
  await fn(f);
});
document.addEventListener("keydown", e => { if(e.key==="Escape"){ if($(".viewer")) $("#toastHost").innerHTML=""; else if(S.sheet) closeSheet(); } });

boot();
})();
