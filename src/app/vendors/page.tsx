'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { Vendor, VendorRateHistory } from '@/types';
import { 
  Users, 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  TrendingUp, 
  Receipt, 
  History, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  DollarSign
} from 'lucide-react';

export default function VendorsPage() {
  const { vendors, vendorRates, materialInwards, addVendor, updateVendor, addVendorRate } = useErp();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Modals
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isAddRateOpen, setIsAddRateOpen] = useState(false);

  // New Vendor Form
  const [vendorForm, setVendorForm] = useState({
    vendor_name: '',
    gstin: '',
    category: 'raw_material' as Vendor['category'],
    contact_person: '',
    phone: '',
    email: '',
    city: '',
    state_code: '27',
    address: '',
  });

  // New Rate Form
  const [rateForm, setRateForm] = useState({
    material_name: '',
    rate_per_unit: 0,
    effective_date: new Date().toISOString().split('T')[0],
  });

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = 
      v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = categoryFilter === 'all' || v.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.vendor_name || !vendorForm.gstin) return;

    addVendor(vendorForm);
    setVendorForm({
      vendor_name: '',
      gstin: '',
      category: 'raw_material',
      contact_person: '',
      phone: '',
      email: '',
      city: '',
      state_code: '27',
      address: '',
    });
    setIsAddVendorOpen(false);
  };

  const handleAddRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !rateForm.material_name || rateForm.rate_per_unit <= 0) return;

    addVendorRate({
      vendor_id: selectedVendor.id,
      vendor_name: selectedVendor.vendor_name,
      material_name: rateForm.material_name,
      rate_per_unit: Number(rateForm.rate_per_unit),
      effective_date: rateForm.effective_date,
    });

    setRateForm({
      material_name: '',
      rate_per_unit: 0,
      effective_date: new Date().toISOString().split('T')[0],
    });
    setIsAddRateOpen(false);
  };

  // Selected Vendor Purchases (GRN Inward)
  const vendorInwards = selectedVendor 
    ? materialInwards.filter(i => i.vendor_id === selectedVendor.id)
    : [];

  const vendorRateLogs = selectedVendor 
    ? vendorRates.filter(r => r.vendor_id === selectedVendor.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Vendor & Supplier Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage raw material suppliers, heat treatment vendors, tooling suppliers, purchase ledger & rate histories.
          </p>
        </div>
        <button
          onClick={() => setIsAddVendorOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vendor</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendor name, GSTIN, city..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'raw_material', 'outsourced_process', 'tooling'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                categoryFilter === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 border-b border-border pb-3 mb-3">
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    vendor.category === 'raw_material' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    vendor.category === 'outsourced_process' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {vendor.category.replace('_', ' ')}
                  </span>
                  <h3 className="font-bold text-base text-foreground mt-1.5">{vendor.vendor_name}</h3>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">GSTIN: {vendor.gstin}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground font-medium">{vendor.contact_person}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span className="truncate">{vendor.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{vendor.city}, MH (State: {vendor.state_code})</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Outstanding Payable:</span>
                <span className="text-sm font-extrabold text-rose-500">₹{vendor.outstanding_payable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4 flex items-center justify-end">
              <button
                onClick={() => setSelectedVendor(vendor)}
                className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-primary flex items-center gap-1.5 transition"
              >
                <History className="w-3.5 h-3.5" />
                <span>View Purchase Ledger & Rates</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Vendor Modal */}
      {isAddVendorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Add New Vendor / Supplier
              </h3>
              <button onClick={() => setIsAddVendorOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVendorSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Vendor / Firm Name *</label>
                  <input
                    type="text"
                    required
                    value={vendorForm.vendor_name}
                    onChange={(e) => setVendorForm({ ...vendorForm, vendor_name: e.target.value })}
                    placeholder="e.g. Hindalco Metals Ltd"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">GSTIN Number *</label>
                  <input
                    type="text"
                    required
                    value={vendorForm.gstin}
                    onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AAACH8899A1Z1"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={vendorForm.category}
                    onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value as any })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  >
                    <option value="raw_material">Raw Material Supplier</option>
                    <option value="outsourced_process">Outsourced Process (Heat Treatment / Plating)</option>
                    <option value="tooling">Tooling & Inserts Supplier</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    value={vendorForm.contact_person}
                    onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                    placeholder="e.g. Subhash Mehta"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    placeholder="+91 98230 44112"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    placeholder="sales@vendor.com"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">City</label>
                  <input
                    type="text"
                    value={vendorForm.city}
                    onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                    placeholder="Pune"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">State Code (GST)</label>
                  <input
                    type="text"
                    value={vendorForm.state_code}
                    onChange={(e) => setVendorForm({ ...vendorForm, state_code: e.target.value })}
                    placeholder="27 (Maharashtra)"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Full Office / Gate Address</label>
                  <textarea
                    rows={2}
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    placeholder="Factory Address..."
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Vendor Drawer (Ledger & Rates) */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-card border-l border-border h-full w-full max-w-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">{selectedVendor.vendor_name}</h3>
                <p className="text-xs text-muted-foreground">GSTIN: {selectedVendor.gstin} | Category: <span className="capitalize text-primary font-semibold">{selectedVendor.category.replace('_', ' ')}</span></p>
              </div>
              <button onClick={() => setSelectedVendor(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Vendor Rate History Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-500" /> Material Rate History Comparison
                </h4>
                <button
                  onClick={() => setIsAddRateOpen(!isAddRateOpen)}
                  className="px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Material Rate
                </button>
              </div>

              {/* Add Rate Subform */}
              {isAddRateOpen && (
                <form onSubmit={handleAddRateSubmit} className="p-3 rounded-lg bg-muted/40 border border-border space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="font-semibold block mb-1">Material Name</label>
                      <input
                        type="text"
                        required
                        value={rateForm.material_name}
                        onChange={(e) => setRateForm({ ...rateForm, material_name: e.target.value })}
                        placeholder="e.g. Aluminium 6061"
                        className="w-full p-2 bg-card border border-border rounded text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Rate per Unit (₹)</label>
                      <input
                        type="number"
                        required
                        value={rateForm.rate_per_unit}
                        onChange={(e) => setRateForm({ ...rateForm, rate_per_unit: Number(e.target.value) })}
                        className="w-full p-2 bg-card border border-border rounded text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Effective Date</label>
                      <input
                        type="date"
                        value={rateForm.effective_date}
                        onChange={(e) => setRateForm({ ...rateForm, effective_date: e.target.value })}
                        className="w-full p-2 bg-card border border-border rounded text-foreground"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-1.5 bg-primary text-primary-foreground font-semibold rounded hover:bg-primary/90">
                    Save Rate Record
                  </button>
                </form>
              )}

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground font-semibold">
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5">Rate / Unit (₹)</th>
                      <th className="p-2.5">Effective Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {vendorRateLogs.map(rate => (
                      <tr key={rate.id} className="hover:bg-muted/20">
                        <td className="p-2.5 font-medium text-foreground">{rate.material_name}</td>
                        <td className="p-2.5 font-bold text-primary">₹{rate.rate_per_unit}</td>
                        <td className="p-2.5 text-muted-foreground">{rate.effective_date}</td>
                      </tr>
                    ))}
                    {vendorRateLogs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-muted-foreground italic">No rate log recorded for this vendor yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vendor Purchase History (GRN Inward Entries) */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-500" /> Purchase Ledger (GRN Goods Inward Records)
              </h4>
              <div className="space-y-2">
                {vendorInwards.map(inw => (
                  <div key={inw.id} className="p-3 rounded-lg bg-muted/30 border border-border text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{inw.material_name} ({inw.qty} units)</p>
                      <p className="text-[11px] text-muted-foreground">Challan: <span className="font-mono text-foreground">{inw.challan_no}</span> | Date: {inw.inward_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-500">₹{(inw.qty * inw.unit_rate).toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-muted-foreground">@ ₹{inw.unit_rate}/unit</p>
                    </div>
                  </div>
                ))}
                {vendorInwards.length === 0 && (
                  <p className="text-xs text-muted-foreground italic p-3 text-center border border-border rounded-lg">No GRN inward transactions for this vendor yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
