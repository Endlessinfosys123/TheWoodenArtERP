'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { Material, MaterialInward, StockLedgerType, MaterialSourceType } from '@/types';
import { 
  Boxes, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Receipt, 
  History, 
  X, 
  Share2, 
  Bell, 
  Tag, 
  Layers, 
  ArrowDownRight, 
  ArrowUpRight,
  ShieldCheck,
  Send
} from 'lucide-react';

export default function MaterialsPage() {
  const { materials, materialInwards, clients, jobOrders, addMaterial, addStockLedgerEntry } = useErp();
  const [activeTab, setActiveTab] = useState<'stock_pools' | 'stock_ledger'>('stock_pools');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifySimulated, setNotifySimulated] = useState(false);

  // Modals
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);

  // Material Form
  const [matForm, setMatForm] = useState({
    name: '',
    grade: '',
    unit: 'kg' as Material['unit'],
    hsn_code: '7606',
    reorder_level: 50,
    unit_cost: 300,
    batch_tracking_enabled: true,
  });

  // Stock Ledger Entry Form (GRN Inward, Issue to Job, Return, Scrap)
  const [ledgerForm, setLedgerForm] = useState({
    ledger_type: 'grn_inward' as StockLedgerType,
    material_id: materials[0]?.id || '',
    source_type: 'own_stock' as MaterialSourceType,
    client_id: '',
    job_order_id: '',
    batch_no: '',
    heat_no: '',
    dimensions: '',
    qty: 10,
    unit_rate: 300,
    inward_date: new Date().toISOString().split('T')[0],
    challan_no: '',
    notes: '',
  });

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.hsn_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLedger = materialInwards.filter(l =>
    (l.material_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.challan_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.batch_no || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Client Supplied Free-Issue Stock Grouping
  const clientSuppliedEntries = materialInwards.filter(i => i.source_type === 'client_supplied');

  // Calculate Total Inventory Valuation (Own Stock ONLY)
  const ownStockValuation = materials.reduce((acc, m) => acc + (m.current_stock * m.unit_cost), 0);

  const handleAddMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matForm.name || !matForm.grade) return;

    addMaterial({
      ...matForm,
      reorder_level: Number(matForm.reorder_level),
      unit_cost: Number(matForm.unit_cost),
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            Material Stock & Inventory Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict separation of <strong>Company Own Stock</strong> (Valued) vs <strong>Client Free-Issue Stock</strong> (Job work), GRN Inwards, Scrap logs & Heat Number traceability.
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

      {/* Low Stock Threshold WhatsApp / Email Simulation Alert Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h4 className="font-bold text-amber-500 text-sm">Low-Stock Automated Notification System Active</h4>
            <p className="text-muted-foreground mt-0.5">
              Monitors reorder thresholds. Sends automatic WhatsApp / Email alerts to Store Manager when stock drops below threshold.
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

      {/* Tabs & Search Bar */}
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
            <span>Stock Ledger (GRN Inward / Issue / Scrap)</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search material name, grade, batch no, HSN..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      {/* Tab 1: Stock Pools & Valuation */}
      {activeTab === 'stock_pools' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Own Stock Valuation</span>
              <div className="text-2xl font-extrabold text-emerald-500 mt-2">
                ₹{ownStockValuation.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Valued raw material inventory in company store</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Client Free-Issue Material</span>
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
              <p className="text-[11px] text-amber-500 font-medium mt-1">Requires immediate PO reorder</p>
            </div>
          </div>

          {/* Own Stock Table */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Company Own Raw Material Stock (Valued Pool)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-3">Material Name & Grade</th>
                    <th className="p-3">HSN Code</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Reorder Threshold</th>
                    <th className="p-3">Unit Cost (₹)</th>
                    <th className="p-3">Total Valuation</th>
                    <th className="p-3">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMaterials.map((mat) => {
                    const isLow = mat.current_stock <= mat.reorder_level;
                    const val = mat.current_stock * mat.unit_cost;
                    return (
                      <tr key={mat.id} className="hover:bg-muted/30 transition">
                        <td className="p-3">
                          <p className="font-bold text-foreground">{mat.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">Grade: {mat.grade}</p>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{mat.hsn_code}</td>
                        <td className="p-3 font-extrabold text-foreground">{mat.current_stock} {mat.unit}</td>
                        <td className="p-3 text-muted-foreground">{mat.reorder_level} {mat.unit}</td>
                        <td className="p-3 text-foreground">₹{mat.unit_cost} / {mat.unit}</td>
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

          {/* Client Supplied Free-Issue Stock Section */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Tag className="w-4 h-4 text-purple-400" />
              Client-Supplied Free-Issue Material Stock (Tagged per Client & Job)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-3">Client Name</th>
                    <th className="p-3">Job Order</th>
                    <th className="p-3">Material & Dimensions</th>
                    <th className="p-3">Batch / Heat No</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Valuation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientSuppliedEntries.map((inw) => (
                    <tr key={inw.id} className="hover:bg-muted/30 transition">
                      <td className="p-3 font-bold text-purple-400">{inw.client_name || 'Client'}</td>
                      <td className="p-3 font-mono text-primary font-semibold">{inw.job_no || 'Free Issue'}</td>
                      <td className="p-3 text-foreground">{inw.material_name} <span className="text-[10px] text-muted-foreground block">{inw.dimensions}</span></td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {inw.batch_no || 'N/A'} {inw.heat_no ? `/ ${inw.heat_no}` : ''}
                      </td>
                      <td className="p-3 font-extrabold text-foreground">{inw.qty} Pcs</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          ₹0.00 (Client Material)
                        </span>
                      </td>
                    </tr>
                  ))}
                  {clientSuppliedEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground italic">No client-supplied free issue material in store.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Ledger (GRN Inward / Issue / Scrap) */}
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
                    <td className="p-3 font-extrabold text-foreground">{item.qty}</td>
                    <td className="p-3 text-emerald-500 font-semibold">₹{item.unit_rate}</td>
                    <td className="p-3">
                      <p className="font-mono text-foreground font-semibold">{item.challan_no}</p>
                      <p className="text-[10px] text-muted-foreground">{item.inward_date}</p>
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
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Boxes className="w-5 h-5 text-primary" /> Add Material Master
              </h3>
              <button onClick={() => setIsAddMaterialOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMaterialSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  value={matForm.name}
                  onChange={(e) => setMatForm({ ...matForm, name: e.target.value })}
                  placeholder="e.g. Stainless Steel Round Bar 316L"
                  className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Grade / Specification *</label>
                <input
                  type="text"
                  required
                  value={matForm.grade}
                  onChange={(e) => setMatForm({ ...matForm, grade: e.target.value })}
                  placeholder="e.g. SS316L"
                  className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Unit</label>
                  <select
                    value={matForm.unit}
                    onChange={(e) => setMatForm({ ...matForm, unit: e.target.value as any })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="mm">Millimeter (mm)</option>
                    <option value="sheet">Sheet</option>
                    <option value="meter">Meter</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={matForm.hsn_code}
                    onChange={(e) => setMatForm({ ...matForm, hsn_code: e.target.value })}
                    placeholder="7222"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Reorder Level Threshold</label>
                  <input
                    type="number"
                    value={matForm.reorder_level}
                    onChange={(e) => setMatForm({ ...matForm, reorder_level: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Unit Purchase Cost (₹)</label>
                  <input
                    type="number"
                    value={matForm.unit_cost}
                    onChange={(e) => setMatForm({ ...matForm, unit_cost: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
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

      {/* Stock Ledger Entry Modal (GRN Inward / Issue to Job) */}
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
                    onChange={(e) => setLedgerForm({ ...ledgerForm, material_id: e.target.value })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  >
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.grade})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Quantity *</label>
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
                  <label className="font-semibold block mb-1">Heat Number (Mill TC)</label>
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
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Challan / Invoice Ref</label>
                  <input
                    type="text"
                    value={ledgerForm.challan_no}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, challan_no: e.target.value })}
                    placeholder="e.g. DC-9981"
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
                  Post Stock Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
