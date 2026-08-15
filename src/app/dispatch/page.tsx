'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { Dispatch, JobOrder } from '@/types';
import { 
  Truck, 
  Plus, 
  Search, 
  Printer, 
  FileText, 
  CheckCircle2, 
  X, 
  Building2, 
  User, 
  Phone, 
  Calendar,
  Layers,
  Wrench
} from 'lucide-react';

export default function DispatchPage() {
  const { dispatches, jobOrders, clients, companySettings, createDispatch } = useErp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);

  // Ready for Dispatch Jobs
  const readyJobs = jobOrders.filter(j => j.status === 'Ready for Dispatch' || j.status === 'Quality Check');

  // Form
  const [dispatchForm, setDispatchForm] = useState({
    job_order_id: readyJobs[0]?.id || jobOrders[0]?.id || '',
    client_id: readyJobs[0]?.client_id || clients[0]?.id || '',
    dispatched_qty: 10,
    transporter: 'VRL Logistics',
    vehicle_no: 'MH 14 HG 4521',
    driver_phone: '+91 98221 00998',
    lr_no: 'VRL-PN-98211',
    eway_bill_no: '341098227651',
    dispatch_date: new Date().toISOString().split('T')[0],
    notes: 'Packed in wooden crate with anti-corrosion VCI bubble wrap.',
  });

  const filteredDispatches = dispatches.filter(d =>
    d.challan_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.part_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.vehicle_no || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchForm.job_order_id || !dispatchForm.client_id) return;

    createDispatch({
      ...dispatchForm,
      dispatched_qty: Number(dispatchForm.dispatched_qty),
    });

    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Dispatch & Delivery Challan (DC) Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-generate Indian GST-compliant Delivery Challans (DC) with e-Way Bill tracking, transporter LR numbers, & vehicle logs.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Delivery Challan</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search challan no, client name, vehicle no, e-Way bill..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      {/* Delivery Challans List Table */}
      <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-3">Challan No</th>
                <th className="p-3">Job No & Part Name</th>
                <th className="p-3">Client Name</th>
                <th className="p-3">Dispatched Qty</th>
                <th className="p-3">Transporter & Vehicle</th>
                <th className="p-3">e-Way Bill No</th>
                <th className="p-3">Dispatch Date</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDispatches.map((dsp) => (
                <tr key={dsp.id} className="hover:bg-muted/30 transition">
                  <td className="p-3 font-extrabold text-primary font-mono">{dsp.challan_no}</td>
                  <td className="p-3">
                    <p className="font-bold text-foreground">{dsp.part_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{dsp.job_no}</p>
                  </td>
                  <td className="p-3 font-medium text-foreground">{dsp.client_name}</td>
                  <td className="p-3 font-extrabold text-foreground">{dsp.dispatched_qty} Pcs</td>
                  <td className="p-3">
                    <p className="font-medium text-foreground">{dsp.transporter}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{dsp.vehicle_no}</p>
                  </td>
                  <td className="p-3 font-mono text-cyan-400 font-semibold">{dsp.eway_bill_no || 'N/A'}</td>
                  <td className="p-3 text-muted-foreground">{dsp.dispatch_date}</td>
                  <td className="p-3">
                    <button
                      onClick={() => setSelectedDispatch(dsp)}
                      className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-primary text-xs font-semibold flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print DC
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Delivery Challan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Create Delivery Challan (DC)
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Select Job Order ready for dispatch *</label>
                  <select
                    value={dispatchForm.job_order_id}
                    onChange={(e) => {
                      const j = jobOrders.find(job => job.id === e.target.value);
                      setDispatchForm({
                        ...dispatchForm,
                        job_order_id: e.target.value,
                        client_id: j?.client_id || dispatchForm.client_id,
                        dispatched_qty: j?.qty || 10,
                      });
                    }}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  >
                    {readyJobs.map(j => (
                      <option key={j.id} value={j.id}>{j.job_no} — {j.part_name} ({j.client_name} - {j.qty} pcs)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Dispatched Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={dispatchForm.dispatched_qty}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispatched_qty: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Dispatch Date</label>
                  <input
                    type="date"
                    value={dispatchForm.dispatch_date}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispatch_date: e.target.value })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Transporter Name</label>
                  <input
                    type="text"
                    value={dispatchForm.transporter}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, transporter: e.target.value })}
                    placeholder="e.g. VRL Logistics / Hand Delivery"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={dispatchForm.vehicle_no}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_no: e.target.value.toUpperCase() })}
                    placeholder="MH 14 HG 4521"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Transporter LR Number</label>
                  <input
                    type="text"
                    value={dispatchForm.lr_no}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, lr_no: e.target.value })}
                    placeholder="VRL-PN-98211"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">GST e-Way Bill Number</label>
                  <input
                    type="text"
                    value={dispatchForm.eway_bill_no}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, eway_bill_no: e.target.value })}
                    placeholder="341098227651"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono text-cyan-400"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Packing / Delivery Notes</label>
                  <textarea
                    rows={2}
                    value={dispatchForm.notes}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                    placeholder="Wooden crate packing details..."
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
                >
                  Generate Delivery Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Delivery Challan Document Modal */}
      {selectedDispatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 no-print">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" /> Delivery Challan (DC) Document
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print Challan
                </button>
                <button onClick={() => setSelectedDispatch(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="p-8 bg-white text-slate-900 rounded-xl border-2 border-slate-900 space-y-6 text-xs font-sans">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">{companySettings.company_name}</h1>
                  <p className="text-slate-600 max-w-sm">{companySettings.address}</p>
                  <p className="text-slate-700 font-bold mt-1">GSTIN: {companySettings.gstin} | State: {companySettings.state_name} ({companySettings.state_code})</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black px-3 py-1 bg-slate-900 text-white rounded">DELIVERY CHALLAN</span>
                  <p className="font-mono font-bold text-sm text-slate-900 mt-2">DC NO: {selectedDispatch.challan_no}</p>
                  <p className="text-slate-600">Date: {selectedDispatch.dispatch_date}</p>
                </div>
              </div>

              {/* Consignee & Transport Info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-100 rounded-lg border border-slate-300">
                <div>
                  <p className="font-bold text-slate-900 uppercase">Consignee / Consigned To:</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedDispatch.client_name}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 uppercase">Transport & Vehicle Details:</p>
                  <p><strong>Transporter:</strong> {selectedDispatch.transporter}</p>
                  <p><strong>Vehicle No:</strong> {selectedDispatch.vehicle_no}</p>
                  <p><strong>e-Way Bill No:</strong> {selectedDispatch.eway_bill_no || 'N/A'}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-2 border border-slate-900">S.No</th>
                    <th className="p-2 border border-slate-900">Job Order No</th>
                    <th className="p-2 border border-slate-900">Description of Manufactured Goods</th>
                    <th className="p-2 border border-slate-900 text-right">Quantity (Pcs)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2.5 border border-slate-900 font-mono">1</td>
                    <td className="p-2.5 border border-slate-900 font-mono font-bold">{selectedDispatch.job_no}</td>
                    <td className="p-2.5 border border-slate-900 font-bold">{selectedDispatch.part_name}</td>
                    <td className="p-2.5 border border-slate-900 font-extrabold text-right">{selectedDispatch.dispatched_qty}</td>
                  </tr>
                </tbody>
              </table>

              {/* Signature Footer */}
              <div className="pt-10 flex justify-between items-end border-t border-slate-300">
                <div className="text-center">
                  <div className="w-36 h-12 border-b border-slate-400 mb-1" />
                  <p className="font-bold text-slate-800">Receiver's Signature & Stamp</p>
                </div>
                <div className="text-center">
                  <div className="w-36 h-12 border-b border-slate-400 mb-1" />
                  <p className="font-bold text-slate-800">For {companySettings.company_name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
