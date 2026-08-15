'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { Invoice, Payment, InvoiceType } from '@/types';
import { 
  Receipt, 
  Plus, 
  Search, 
  Printer, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  Building2, 
  FileText, 
  Calendar,
  CreditCard,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export default function InvoicesPage() {
  const { invoices, payments, clients, jobOrders, companySettings, createInvoice, recordPayment } = useErp();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'aging'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Invoice Form
  const [invForm, setInvForm] = useState({
    client_id: clients[0]?.id || '',
    job_order_id: jobOrders[0]?.id || '',
    invoice_type: 'labour_only' as InvoiceType,
    hsn_sac_code: '9988',
    labour_amount: 35000,
    material_amount: 0,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Payment Form
  const [payForm, setPayForm] = useState({
    invoice_id: invoices[0]?.id || '',
    amount: 15000,
    mode: 'bank_transfer' as Payment['mode'],
    reference_no: '',
    paid_date: new Date().toISOString().split('T')[0],
    notes: 'Payment received via NEFT / UPI',
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.job_no || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || inv.invoice_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalInvoiced = invoices.reduce((acc, i) => acc + i.total_amount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.paid_amount, 0);
  const totalOutstanding = clients.reduce((acc, c) => acc + c.outstanding_balance, 0);

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.client_id) return;

    createInvoice({
      ...invForm,
      labour_amount: Number(invForm.labour_amount),
      material_amount: Number(invForm.material_amount),
      status: 'unpaid',
      paid_amount: 0,
      subtotal: Number(invForm.labour_amount) + Number(invForm.material_amount),
      is_interstate: false,
      cgst_rate: 9,
      cgst_amount: (Number(invForm.labour_amount) + Number(invForm.material_amount)) * 0.09,
      sgst_rate: 9,
      sgst_amount: (Number(invForm.labour_amount) + Number(invForm.material_amount)) * 0.09,
      igst_rate: 0,
      igst_amount: 0,
      total_amount: (Number(invForm.labour_amount) + Number(invForm.material_amount)) * 1.18,
    });

    setIsInvoiceModalOpen(false);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find(i => i.id === payForm.invoice_id);
    if (!inv || payForm.amount <= 0) return;

    recordPayment({
      ...payForm,
      client_id: inv.client_id,
      amount: Number(payForm.amount),
    });

    setIsPaymentModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            GST Invoicing & Payments Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Support for <strong>Labour-Only (Job Work)</strong> vs <strong>Material+Labour</strong> Invoices, auto CGST/SGST vs IGST calculation, & aging receivables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow-md hover:bg-emerald-700 transition"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Invoiced (FY 26-27)</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">₹{totalInvoiced.toLocaleString('en-IN')}</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Payment Collected</span>
          <div className="text-2xl font-extrabold text-emerald-500 mt-1">₹{totalCollected.toLocaleString('en-IN')}</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Client Outstanding</span>
          <div className="text-2xl font-extrabold text-rose-500 mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Filter & Tabs Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Tax Invoices</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'payments'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Records ({payments.length})</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice no, client name, job no..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      {/* Tab 1: Invoices List */}
      {activeTab === 'invoices' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Job No</th>
                  <th className="p-3">Subtotal</th>
                  <th className="p-3">GST Breakup</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Paid / Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition">
                    <td className="p-3 font-extrabold text-primary font-mono">{inv.invoice_no}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        inv.invoice_type === 'labour_only'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {inv.invoice_type === 'labour_only' ? 'Labour Only' : 'Material + Labour'}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-foreground">{inv.client_name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{inv.job_no || 'N/A'}</td>
                    <td className="p-3 text-foreground font-semibold">₹{inv.subtotal.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-[11px] text-muted-foreground">
                      {inv.is_interstate ? (
                        <span>IGST (18%): ₹{inv.igst_amount.toLocaleString('en-IN')}</span>
                      ) : (
                        <span>CGST+SGST (18%): ₹{(inv.cgst_amount + inv.sgst_amount).toLocaleString('en-IN')}</span>
                      )}
                    </td>
                    <td className="p-3 font-extrabold text-foreground">₹{inv.total_amount.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <p className="font-semibold text-emerald-500">Paid: ₹{inv.paid_amount.toLocaleString('en-IN')}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        inv.status === 'partially_paid' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-primary text-xs font-semibold flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Tax Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Payment Records */}
      {activeTab === 'payments' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Payment Ref / Date</th>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Amount Received</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-muted/30 transition">
                    <td className="p-3">
                      <p className="font-bold text-foreground font-mono">{pay.reference_no || 'REF-N/A'}</p>
                      <p className="text-[10px] text-muted-foreground">{pay.paid_date}</p>
                    </td>
                    <td className="p-3 font-mono text-primary font-semibold">{pay.invoice_no}</td>
                    <td className="p-3 font-medium text-foreground">{pay.client_name}</td>
                    <td className="p-3 uppercase font-bold text-muted-foreground">{pay.mode.replace('_', ' ')}</td>
                    <td className="p-3 font-extrabold text-emerald-500">₹{pay.amount.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-muted-foreground">{pay.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" /> Create GST Tax Invoice
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Select Client *</label>
                  <select
                    value={invForm.client_id}
                    onChange={(e) => setInvForm({ ...invForm, client_id: e.target.value })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Invoice Type *</label>
                  <select
                    value={invForm.invoice_type}
                    onChange={(e) => setInvForm({ ...invForm, invoice_type: e.target.value as InvoiceType })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  >
                    <option value="labour_only">Labour Only (Job Work — No Material GST)</option>
                    <option value="material_and_labour">Material + Labour (Full Value)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    value={invForm.hsn_sac_code}
                    onChange={(e) => setInvForm({ ...invForm, hsn_sac_code: e.target.value })}
                    placeholder="9988"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Job Work / Labour Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={invForm.labour_amount}
                    onChange={(e) => setInvForm({ ...invForm, labour_amount: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  />
                </div>

                {invForm.invoice_type === 'material_and_labour' && (
                  <div>
                    <label className="font-semibold block mb-1">Material Value Amount (₹)</label>
                    <input
                      type="number"
                      value={invForm.material_amount}
                      onChange={(e) => setInvForm({ ...invForm, material_amount: Number(e.target.value) })}
                      className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="font-semibold block mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={invForm.due_date}
                    onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" /> Record Client Payment
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Select Invoice to Settle *</label>
                <select
                  value={payForm.invoice_id}
                  onChange={(e) => setPayForm({ ...payForm, invoice_id: e.target.value })}
                  className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                >
                  {invoices.filter(i => i.status !== 'paid').map(i => (
                    <option key={i.id} value={i.id}>{i.invoice_no} — {i.client_name} (Bal: ₹{i.total_amount - i.paid_amount})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Payment Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Payment Mode</label>
                  <select
                    value={payForm.mode}
                    onChange={(e) => setPayForm({ ...payForm, mode: e.target.value as any })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="upi">UPI / GPay</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Reference / UTR No</label>
                  <input
                    type="text"
                    value={payForm.reference_no}
                    onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })}
                    placeholder="HDFCR520260..."
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable GST Tax Invoice Document Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 no-print">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" /> GST Tax Invoice Document
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print Invoice
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Area */}
            <div className="p-8 bg-white text-slate-900 rounded-xl border-2 border-slate-900 space-y-6 text-xs font-sans">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">{companySettings.company_name}</h1>
                  <p className="text-slate-600 max-w-sm">{companySettings.address}</p>
                  <p className="text-slate-700 font-bold mt-1">GSTIN: {companySettings.gstin} | State: {companySettings.state_name} ({companySettings.state_code})</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black px-3 py-1 bg-slate-900 text-white rounded">TAX INVOICE</span>
                  <p className="font-mono font-bold text-sm text-slate-900 mt-2">INV NO: {selectedInvoice.invoice_no}</p>
                  <p className="text-slate-600">{selectedInvoice.financial_year} | Date: {selectedInvoice.invoice_date}</p>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
                <p className="font-bold text-slate-900 uppercase text-[10px]">Billed To (Client):</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedInvoice.client_name}</p>
                <p className="text-slate-700">GSTIN: <strong>{selectedInvoice.client_gstin || '27AAACA1234A1Z5'}</strong> | HSN/SAC Code: <strong>{selectedInvoice.hsn_sac_code}</strong></p>
              </div>

              {/* Invoice Breakdown */}
              <table className="w-full text-left border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-2 border border-slate-900">Particulars / Job Description</th>
                    <th className="p-2 border border-slate-900 text-right">Labour Charges</th>
                    <th className="p-2 border border-slate-900 text-right">Material Charges</th>
                    <th className="p-2 border border-slate-900 text-right">Subtotal Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2.5 border border-slate-900">
                      <p className="font-bold">{selectedInvoice.job_no} Manufacturing Charges</p>
                      <p className="text-[10px] text-slate-600">
                        {selectedInvoice.invoice_type === 'labour_only' ? 'Job work charges on client supplied material' : 'Material and machining combined charges'}
                      </p>
                    </td>
                    <td className="p-2.5 border border-slate-900 text-right font-mono">₹{selectedInvoice.labour_amount.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 border border-slate-900 text-right font-mono">₹{selectedInvoice.material_amount.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 border border-slate-900 text-right font-bold font-mono">₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              {/* Tax Calculations */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-right font-semibold">
                  <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</span></div>
                  {!selectedInvoice.is_interstate ? (
                    <>
                      <div className="flex justify-between text-slate-700"><span>CGST (9%):</span><span className="font-mono">₹{selectedInvoice.cgst_amount.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between text-slate-700"><span>SGST (9%):</span><span className="font-mono">₹{selectedInvoice.sgst_amount.toLocaleString('en-IN')}</span></div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-700"><span>IGST (18%):</span><span className="font-mono">₹{selectedInvoice.igst_amount.toLocaleString('en-IN')}</span></div>
                  )}
                  <div className="flex justify-between text-base font-black border-t-2 border-slate-900 pt-2 text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{selectedInvoice.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="pt-4 border-t border-slate-300 flex justify-between items-end">
                <div className="p-3 bg-slate-100 rounded border border-slate-300 text-[11px] space-y-0.5">
                  <p className="font-bold text-slate-900 uppercase">Bank Payment Details:</p>
                  <p>Bank: <strong>{companySettings.bank_name}</strong></p>
                  <p>A/C No: <strong>{companySettings.account_no}</strong> | IFSC: <strong>{companySettings.ifsc_code}</strong></p>
                </div>
                <div className="text-center">
                  <div className="w-36 h-10 border-b border-slate-400 mb-1" />
                  <p className="font-bold text-slate-800 text-[11px]">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
