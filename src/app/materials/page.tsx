'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { 
  Material, 
  MaterialInward, 
  StockLedgerType, 
  MaterialSourceType,
  MaterialCategory,
  MaterialUnit,
  ThicknessUnit,
  DimensionUnit
} from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase/db';
import { 
  Boxes, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  X, 
  Tag, 
  Bell, 
  ArrowDownRight, 
  ShieldCheck,
  Send,
  Database,
  Layers,
  Ruler,
  Maximize2
} from 'lucide-react';

export default function MaterialsPage() {
  const { materials, materialInwards, clients, jobOrders, addMaterial, addStockLedgerEntry } = useErp();
  const [activeTab, setActiveTab] = useState<'stock_pools' | 'stock_ledger'>('stock_pools');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [notifySimulated, setNotifySimulated] = useState(false);
  const isDbConfigured = isSupabaseConfigured();

  // Modals
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);

  // Advanced CNC Material Form State
  const [matForm, setMatForm] = useState<{
    name: string;
    category: MaterialCategory;
    grade: string;
    unit: MaterialUnit;
    hsn_code: string;
    thickness: number;
    thickness_unit: ThicknessUnit;
    sheet_length: number;
    sheet_width: number;
    dimension_unit: DimensionUnit;
    reorder_level: number;
    unit_cost: number;
    batch_tracking_enabled: boolean;
  }>({
    name: '',
    category: 'MDF',
    grade: 'HDMR Exterior Grade',
    unit: 'sq_ft',
    hsn_code: '4411',
    thickness: 18,
    thickness_unit: 'mm',
    sheet_length: 8,
    sheet_width: 4,
    dimension_unit: 'ft',
    reorder_level: 160,
    unit_cost: 85,
    batch_tracking_enabled: true,
  });

  // Calculate SqFt per sheet dynamically
  const computeSqFtPerSheet = (length: number, width: number, unit: DimensionUnit): number => {
    if (unit === 'ft') {
      return Number((length * width).toFixed(2));
    } else if (unit === 'inch') {
      return Number(((length * width) / 144).toFixed(2));
    } else if (unit === 'mm') {
      return Number(((length * width) / 92903.04).toFixed(2));
    }
    return 32;
  };

  const calculatedSqFt = computeSqFtPerSheet(matForm.sheet_length, matForm.sheet_width, matForm.dimension_unit);

  // Auto-fill suggested material name when category/thickness changes
  const handleCategoryChange = (cat: MaterialCategory) => {
    let suggestedGrade = 'Standard Grade';
    let suggestedHsn = '4411';
    let defaultUnit: MaterialUnit = 'sq_ft';

    if (cat === 'MDF') {
      suggestedGrade = 'HDMR Exterior Grade';
      suggestedHsn = '4411';
      defaultUnit = 'sq_ft';
    } else if (cat === 'Wooden') {
      suggestedGrade = 'Teak Wood / BWP Plywood 710';
      suggestedHsn = '4412';
      defaultUnit = 'sq_ft';
    } else if (cat === 'Corian') {
      suggestedGrade = 'Polymer Acrylic Solid Surface';
      suggestedHsn = '3920';
      defaultUnit = 'sq_ft';
    } else if (cat === 'MS') {
      suggestedGrade = 'CRCA IS 513 Sheet';
      suggestedHsn = '7209';
      defaultUnit = 'kg';
    } else if (cat === 'SS') {
      suggestedGrade = 'SS304 2B Finish Sheet';
      suggestedHsn = '7219';
      defaultUnit = 'kg';
    } else if (cat === 'Acrylic') {
      suggestedGrade = 'Cast PMMA Clear Sheet';
      suggestedHsn = '3920';
      defaultUnit = 'sq_ft';
    } else if (cat === 'Aluminium') {
      suggestedGrade = 'Aluminium Alloy 6061-T6';
      suggestedHsn = '7606';
      defaultUnit = 'kg';
    }

    setMatForm(prev => ({
      ...prev,
      category: cat,
      grade: suggestedGrade,
      hsn_code: suggestedHsn,
      unit: defaultUnit
    }));
  };

  // Stock Ledger Entry Form
  const [ledgerForm, setLedgerForm] = useState({
    ledger_type: 'grn_inward' as StockLedgerType,
    material_id: materials[0]?.id || '',
    source_type: 'own_stock' as MaterialSourceType,
    client_id: '',
    job_order_id: '',
    batch_no: '',
    heat_no: '',
    dimensions: '',
    qty: 32, // Default 1 sheet = 32 sq.ft
    unit_rate: 85,
    inward_date: new Date().toISOString().split('T')[0],
    challan_no: '',
    notes: '',
  });

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.hsn_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredLedger = materialInwards.filter(l =>
    (l.material_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.challan_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.batch_no || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clientSuppliedEntries = materialInwards.filter(i => i.source_type === 'client_supplied');
  const ownStockValuation = materials.reduce((acc, m) => acc + (m.current_stock * m.unit_cost), 0);

  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matForm.name) return;

    const sqft = computeSqFtPerSheet(matForm.sheet_length, matForm.sheet_width, matForm.dimension_unit);

    await addMaterial({
      name: matForm.name,
      category: matForm.category,
      grade: matForm.grade || 'Standard Grade',
      unit: matForm.unit,
      hsn_code: matForm.hsn_code || '4411',
      thickness: Number(matForm.thickness) || 18,
      thickness_unit: matForm.thickness_unit || 'mm',
      sheet_length: Number(matForm.sheet_length) || 8,
      sheet_width: Number(matForm.sheet_width) || 4,
      dimension_unit: matForm.dimension_unit || 'ft',
      sqft_per_sheet: sqft || 32,
      reorder_level: Number(matForm.reorder_level) || 50,
      unit_cost: Number(matForm.unit_cost) || 0,
      batch_tracking_enabled: matForm.batch_tracking_enabled,
    });

    setIsAddMaterialOpen(false);
  };

  const handleLedgerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerForm.material_id || ledgerForm.qty <= 0) return;

    addStockLedgerEntry({
      ...ledgerForm,
      qty: Number(ledgerForm.qty),
      unit_rate: Number(ledgerForm.unit_rate),
    });

    setIsInwardModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Database Connection Warning / Status Banner */}
      {!isDbConfigured && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 text-amber-400 font-medium">
            <Database className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Local Offline Demo Mode Active:</strong> Supabase environment keys (`NEXT_PUBLIC_SUPABASE_URL`) missing in `.env.local`. Data changes will save in local memory. Add `.env.local` keys to persist live data directly into Supabase PostgreSQL.
            </span>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold shrink-0">
            Offline Demo
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            CNC Job Work Material Master & Inventory Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Support for <strong>MDF, Wooden, Corian, MS, SS, Acrylic & Aluminium</strong> with Thickness (mm/inch), Sheet Dimensions (8x4 ft) & Sq.Ft calculation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInwardModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow-md hover:bg-emerald-700 transition"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>GRN Inward / Issue Entry</span>
          </button>
          <button
            onClick={() => setIsAddMaterialOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Material Master</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h4 className="font-bold text-amber-500 text-sm">Low-Stock Automated Notification System Active</h4>
            <p className="text-muted-foreground mt-0.5">
              Monitors sheet thresholds (Sq.Ft / Sheets / Kg). Sends automatic alerts when raw material drops below reorder point.
            </p>
          </div>
        </div>

        <button
          onClick={() => setNotifySimulated(!notifySimulated)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            notifySimulated
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{notifySimulated ? 'Notification Sent to WhatsApp!' : 'Simulate Low Stock Alert'}</span>
        </button>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('stock_pools')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'stock_pools'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Stock Pools & Valuation</span>
          </button>
          <button
            onClick={() => setActiveTab('stock_ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'stock_ledger'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Stock Ledger (Inward / Issue / Scrap)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search MDF, Wooden, Corian, MS, SS, grade..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground font-semibold"
          >
            <option value="all">All CNC Categories</option>
            <option value="MDF">MDF</option>
            <option value="Wooden">Wooden</option>
            <option value="Corian">Corian</option>
            <option value="MS">MS (Mild Steel)</option>
            <option value="SS">SS (Stainless Steel)</option>
            <option value="Acrylic">Acrylic</option>
            <option value="Aluminium">Aluminium</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Stock Pools & Valuation */}
      {activeTab === 'stock_pools' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Own Stock Inventory Valuation</span>
              <div className="text-2xl font-extrabold text-emerald-500 mt-2">
                ₹{ownStockValuation.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Total valued stock in raw material warehouse</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Client Free-Issue Stock</span>
              <div className="text-2xl font-extrabold text-purple-400 mt-2">
                {clientSuppliedEntries.length} Inward Batches
              </div>
              <p className="text-[11px] text-purple-400 font-medium mt-1">Excluded from valuation (Job work material)</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Low Stock Threshold Alerts</span>
              <div className="text-2xl font-extrabold text-amber-500 mt-2">
                {materials.filter(m => m.current_stock <= m.reorder_level).length} Materials
              </div>
              <p className="text-[11px] text-amber-500 font-medium mt-1">Requires immediate supplier order</p>
            </div>
          </div>

          {/* Own Stock Table */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Company Own Raw Material Stock (MDF, Wooden, Corian, MS, SS)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-3">Material & Category</th>
                    <th className="p-3">Thickness</th>
                    <th className="p-3">Sheet Dimensions & Sq.Ft</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Reorder Point</th>
                    <th className="p-3">Unit Cost (₹)</th>
                    <th className="p-3">Valuation</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMaterials.map((mat) => {
                    const isLow = mat.current_stock <= mat.reorder_level;
                    const val = mat.current_stock * mat.unit_cost;
                    const categoryColors: Record<string, string> = {
                      MDF: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      Wooden: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                      Corian: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
                      MS: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
                      SS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      Acrylic: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                      Aluminium: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                    };

                    return (
                      <tr key={mat.id} className="hover:bg-muted/30 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${categoryColors[mat.category || 'MDF'] || 'bg-muted text-muted-foreground'}`}>
                              {mat.category || 'MDF'}
                            </span>
                            <div>
                              <p className="font-bold text-foreground">{mat.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">Grade: {mat.grade} | HSN: {mat.hsn_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-foreground">
                          <span className="px-2 py-1 rounded bg-muted/60 text-foreground font-mono border border-border">
                            {mat.thickness || 18} {mat.thickness_unit || 'mm'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-foreground">
                            {mat.sheet_length || 8} x {mat.sheet_width || 4} {mat.dimension_unit || 'ft'}
                          </span>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            ({mat.sqft_per_sheet || 32} sq.ft / sheet)
                          </span>
                        </td>
                        <td className="p-3 font-extrabold text-foreground">
                          {mat.current_stock} <span className="uppercase text-[10px] text-muted-foreground">{mat.unit.replace('_', ' ')}</span>
                          {mat.unit === 'sq_ft' && mat.sqft_per_sheet && (
                            <span className="text-[10px] text-muted-foreground block font-normal">
                              (~{(mat.current_stock / mat.sqft_per_sheet).toFixed(1)} sheets)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {mat.reorder_level} {mat.unit.replace('_', ' ')}
                        </td>
                        <td className="p-3 text-foreground font-semibold">
                          ₹{mat.unit_cost} / {mat.unit.replace('_', ' ')}
                        </td>
                        <td className="p-3 font-bold text-emerald-500">₹{val.toLocaleString('en-IN')}</td>
                        <td className="p-3">
                          {isLow ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Healthy
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Ledger Audit Trail */}
      {activeTab === 'stock_ledger' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
            <History className="w-4 h-4 text-primary" />
            Stock Ledger & Movement Audit Trail
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Type</th>
                  <th className="p-3">Material</th>
                  <th className="p-3">Source Pool</th>
                  <th className="p-3">Vendor / Client / Job</th>
                  <th className="p-3">Batch & Heat No</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Unit Rate</th>
                  <th className="p-3">Challan / Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        item.ledger_type === 'grn_inward' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        item.ledger_type === 'issue_to_job' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        item.ledger_type === 'return_to_stock' ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' :
                        'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {item.ledger_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-foreground">{item.material_name}</td>
                    <td className="p-3 capitalize text-muted-foreground">{item.source_type.replace('_', ' ')}</td>
                    <td className="p-3 text-foreground font-medium">
                      {item.vendor_name || item.client_name || item.job_no || 'Internal Store'}
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {item.batch_no || 'N/A'} {item.heat_no ? `/ ${item.heat_no}` : ''}
                    </td>
                    <td className="p-3 font-bold text-foreground">{item.qty}</td>
                    <td className="p-3 text-foreground">₹{item.unit_rate}</td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {item.challan_no} <span className="block text-[10px]">{item.inward_date}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Material Master Modal */}
      {isAddMaterialOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Boxes className="w-5 h-5 text-primary" /> Add CNC Raw Material Master
              </h3>
              <button onClick={() => setIsAddMaterialOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMaterialSubmit} className="space-y-4 text-xs">
              {/* Material Category Buttons */}
              <div>
                <label className="font-semibold block mb-1.5 text-foreground">Select Material Category *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['MDF', 'Wooden', 'Corian', 'MS', 'SS', 'Acrylic', 'Aluminium', 'Brass'] as MaterialCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`py-2 px-2 rounded-lg font-bold text-xs border transition text-center ${
                        matForm.category === cat
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  value={matForm.name}
                  onChange={(e) => setMatForm({ ...matForm, name: e.target.value })}
                  placeholder="e.g. HDMR MDF Sheet 18mm (8ft x 4ft)"
                  className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Grade / Specification *</label>
                <input
                  type="text"
                  required
                  value={matForm.grade}
                  onChange={(e) => setMatForm({ ...matForm, grade: e.target.value })}
                  placeholder="e.g. HDMR Exterior / SS304 2B / BWP 710"
                  className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                />
              </div>

              {/* Thickness Section */}
              <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" /> Thickness Measurement (mm / inch)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">Thickness Value</span>
                    <input
                      type="number"
                      step="0.1"
                      value={matForm.thickness}
                      onChange={(e) => setMatForm({ ...matForm, thickness: Number(e.target.value) })}
                      placeholder="e.g. 18 or 0.75"
                      className="w-full p-2 bg-card border border-border rounded-lg text-foreground font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">Thickness Unit</span>
                    <div className="grid grid-cols-2 gap-1 bg-card p-1 border border-border rounded-lg">
                      <button
                        type="button"
                        onClick={() => setMatForm({ ...matForm, thickness_unit: 'mm' })}
                        className={`py-1 rounded font-bold text-xs ${matForm.thickness_unit === 'mm' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        mm
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatForm({ ...matForm, thickness_unit: 'inch' })}
                        className={`py-1 rounded font-bold text-xs ${matForm.thickness_unit === 'inch' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        Inch (in)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sheet Dimensions Section */}
              <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4 text-emerald-500" /> Sheet Size & Sq.Ft Calculator
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">Length</span>
                    <input
                      type="number"
                      value={matForm.sheet_length}
                      onChange={(e) => setMatForm({ ...matForm, sheet_length: Number(e.target.value) })}
                      placeholder="8"
                      className="w-full p-2 bg-card border border-border rounded-lg text-foreground font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">Width</span>
                    <input
                      type="number"
                      value={matForm.sheet_width}
                      onChange={(e) => setMatForm({ ...matForm, sheet_width: Number(e.target.value) })}
                      placeholder="4"
                      className="w-full p-2 bg-card border border-border rounded-lg text-foreground font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">Dimension Unit</span>
                    <select
                      value={matForm.dimension_unit}
                      onChange={(e) => setMatForm({ ...matForm, dimension_unit: e.target.value as DimensionUnit })}
                      className="w-full p-2 bg-card border border-border rounded-lg text-foreground font-semibold"
                    >
                      <option value="ft">Feet (ft)</option>
                      <option value="inch">Inch (in)</option>
                      <option value="mm">mm</option>
                    </select>
                  </div>
                </div>

                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-400 font-bold text-xs mt-1">
                  <span>Calculated Area per Sheet:</span>
                  <span className="text-sm font-extrabold">{calculatedSqFt} Sq.Ft / Sheet</span>
                </div>
              </div>

              {/* Pricing & Units */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Stock & Pricing Unit *</label>
                  <select
                    value={matForm.unit}
                    onChange={(e) => setMatForm({ ...matForm, unit: e.target.value as MaterialUnit })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  >
                    <option value="sq_ft">Square Feet (sq_ft)</option>
                    <option value="sheet">Full Sheet (sheet)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="meter">Meter (m)</option>
                    <option value="sq_m">Square Meter (sq_m)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={matForm.hsn_code}
                    onChange={(e) => setMatForm({ ...matForm, hsn_code: e.target.value })}
                    placeholder="4411"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Reorder Point Threshold</label>
                  <input
                    type="number"
                    value={matForm.reorder_level}
                    onChange={(e) => setMatForm({ ...matForm, reorder_level: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Unit Cost (₹ / {matForm.unit.replace('_', ' ')})</label>
                  <input
                    type="number"
                    value={matForm.unit_cost}
                    onChange={(e) => setMatForm({ ...matForm, unit_cost: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-extrabold text-emerald-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddMaterialOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
                >
                  Save Material Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Ledger Entry Modal */}
      {isInwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-emerald-500" /> Stock Movement / GRN Inward Entry
              </h3>
              <button onClick={() => setIsInwardModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLedgerSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Transaction Type *</label>
                  <select
                    value={ledgerForm.ledger_type}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, ledger_type: e.target.value as StockLedgerType })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  >
                    <option value="grn_inward">GRN Goods Inward (Purchase)</option>
                    <option value="issue_to_job">Issue to Job Order (Production)</option>
                    <option value="return_to_stock">Return to Store Stock</option>
                    <option value="scrap_entry">Scrap / Wastage Entry</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Stock Pool</label>
                  <select
                    value={ledgerForm.source_type}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, source_type: e.target.value as MaterialSourceType })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  >
                    <option value="own_stock">Company Own Stock (Valued)</option>
                    <option value="client_supplied">Client-Supplied Free Issue (No GST on mat)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Select Material *</label>
                  <select
                    value={ledgerForm.material_id}
                    onChange={(e) => {
                      const sel = materials.find(m => m.id === e.target.value);
                      setLedgerForm({ 
                        ...ledgerForm, 
                        material_id: e.target.value,
                        unit_rate: sel ? sel.unit_cost : ledgerForm.unit_rate
                      });
                    }}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-semibold"
                  >
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.category || 'MDF'}] {m.name} ({m.thickness || 18}{m.thickness_unit || 'mm'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Quantity (Sq.Ft / Sheets / Kg) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={ledgerForm.qty}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, qty: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  />
                </div>

                {ledgerForm.source_type === 'client_supplied' && (
                  <div>
                    <label className="font-semibold block mb-1">Tag to Client</label>
                    <select
                      value={ledgerForm.client_id}
                      onChange={(e) => setLedgerForm({ ...ledgerForm, client_id: e.target.value })}
                      className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                    >
                      <option value="">-- Select Client --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-semibold block mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={ledgerForm.batch_no}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, batch_no: e.target.value })}
                    placeholder="e.g. BAT-2026-081"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Heat Number / Mill TC</label>
                  <input
                    type="text"
                    value={ledgerForm.heat_no}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, heat_no: e.target.value })}
                    placeholder="e.g. HEAT-9982"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Unit Rate (₹)</label>
                  <input
                    type="number"
                    value={ledgerForm.unit_rate}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, unit_rate: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Challan / Invoice Reference</label>
                  <input
                    type="text"
                    value={ledgerForm.challan_no}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, challan_no: e.target.value })}
                    placeholder="e.g. INV-99812"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700"
                >
                  Record Stock Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
