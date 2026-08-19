'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { Invoice, Payment, InvoiceType, InvoiceItem } from '@/types';
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
  ArrowUpRight,
  Upload,
  QrCode,
  Trash2
} from 'lucide-react';

export default function InvoicesPage() {
  const { invoices, payments, clients, jobOrders, companySettings, updateCompanySettings, createInvoice, recordPayment } = useErp();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'aging'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Dynamic Line Items for Create Invoice Form
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([
    { description: 'HDMR MDF 18mm CNC Router 2D Design Cutting Job', sqft: 32, rate: 85, amount: 2720, qty: 5, total: 13600 },
    { description: 'Acrylic 6mm Laser Engraving & Letter Cutting Work', sqft: 16, rate: 120, amount: 1920, qty: 3, total: 5760 },
  ]);

  // Invoice Form State
  const [invForm, setInvForm] = useState({
    client_id: clients[0]?.id || '',
    job_order_id: jobOrders[0]?.id || '',
    order_no: jobOrders[0]?.job_no || 'JOB-2026-001',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    hsn_sac_code: companySettings?.hsn_default || '4411',
  });

  // Selected Client Quick Object
  const selectedClient = clients.find(c => c.id === invForm.client_id) || clients[0];

  // Payment Form
  const [payForm, setPayForm] = useState({
    invoice_id: invoices[0]?.id || '',
    amount: 15000,
    mode: 'bank_transfer' as Payment['mode'],
    reference_no: '',
    paid_date: new Date().toISOString().split('T')[0],
    notes: 'Payment received via UPI / NEFT',
  });

  // Calculate totals
  const totalJobQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const subTotalAmount = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const grandTotalAmount = subTotalAmount;

  // Add Item Row
  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      { description: 'CNC Machining / Cutting Work', sqft: 32, rate: 85, amount: 2720, qty: 1, total: 2720 }
    ]);
  };

  // Remove Item Row
  const handleRemoveItemRow = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update Item Row
  const handleUpdateItem = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: any) => {
    setItems(prev => {
      const next = [...prev];
      const current = { ...next[index], [field]: value };

      const sqft = Number(current.sqft) || 0;
      const rate = Number(current.rate) || 0;
      const qty = Number(current.qty) || 0;

      current.amount = sqft * rate;
      current.total = current.amount * qty;

      next[index] = current;
      return next;
    });
  };

  // Submit Invoice Creation
  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.client_id) return;

    createInvoice({
      client_id: invForm.client_id,
      client_name: selectedClient?.company_name || 'Client',
      client_phone: selectedClient?.phone || '+91 98000 00000',
      client_address: `${selectedClient?.billing_address || ''}, ${selectedClient?.city || ''}`,
      client_gstin: selectedClient?.gstin || '',
      job_order_id: invForm.job_order_id,
      job_no: invForm.order_no,
      invoice_type: 'material_and_labour',
      hsn_sac_code: invForm.hsn_sac_code,
      labour_amount: subTotalAmount,
      material_amount: 0,
      subtotal: subTotalAmount,
      is_interstate: false,
      cgst_rate: 0,
      cgst_amount: 0,
      sgst_rate: 0,
      sgst_amount: 0,
      igst_rate: 0,
      igst_amount: 0,
      total_amount: grandTotalAmount,
      paid_amount: 0,
      status: 'unpaid',
      invoice_date: invForm.invoice_date,
      due_date: invForm.due_date,
      items: items.map((it, idx) => ({ ...it, id: `item-${idx}` })),
    });

    setIsInvoiceModalOpen(false);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find(i => i.id === payForm.invoice_id);
    if (!inv) return;

    recordPayment({
      invoice_id: payForm.invoice_id,
      invoice_no: inv.invoice_no,
      client_id: inv.client_id,
      client_name: inv.client_name,
      amount: Number(payForm.amount),
      mode: payForm.mode,
      reference_no: payForm.reference_no,
      paid_date: payForm.paid_date,
      notes: payForm.notes,
    });

    setIsPaymentModalOpen(false);
  };

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Invoices & Client Billing Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate clean, professional invoices with custom payment QR codes, Sq/Ft line items, and bank transfer details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold text-xs hover:bg-emerald-500/20 transition shadow-sm"
          >
            <DollarSign className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Total Invoiced Amount</span>
          <p className="text-2xl font-black text-foreground">₹{totalInvoiced.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-500 font-semibold">Across all billing ledgers</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium font-mono">Total Collected</span>
          <p className="text-2xl font-black text-emerald-500">₹{totalCollected.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-muted-foreground font-semibold">Bank transfers & UPI payments</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Total Outstanding Receivables</span>
          <p className="text-2xl font-black text-rose-500">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-rose-400 font-semibold">Pending client collections</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Search & Filter Controls */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice no, client or job..."
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
            >
              <option value="all">All Payment Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Fully Paid</option>
            </select>
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="p-3.5">Invoice No</th>
                  <th className="p-3.5">Client & Order</th>
                  <th className="p-3.5">Invoice Date</th>
                  <th className="p-3.5 text-right">Total Amount</th>
                  <th className="p-3.5 text-right">Balance Due</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.map((inv) => {
                  const balanceDue = inv.total_amount - inv.paid_amount;
                  return (
                    <tr key={inv.id} className="hover:bg-muted/20 transition">
                      <td className="p-3.5 font-bold font-mono text-primary">{inv.invoice_no}</td>
                      <td className="p-3.5">
                        <p className="font-bold text-foreground">{inv.client_name}</p>
                        <p className="text-[10px] text-muted-foreground">{inv.job_no || 'Standard Job'}</p>
                      </td>
                      <td className="p-3.5 text-muted-foreground">{inv.invoice_date}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-foreground">₹{inv.total_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-400">
                        {balanceDue > 0 ? `₹${balanceDue.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          inv.status === 'partially_paid' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted font-semibold text-[11px] flex items-center gap-1.5 ml-auto transition"
                        >
                          <Printer className="w-3.5 h-3.5 text-primary" />
                          <span>View & Print</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE NEW INVOICE MODAL (Matching User's Sample Layout) */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" /> Create New Customer Invoice
                </h3>
                <p className="text-xs text-muted-foreground">Fill client details, line items with Sq/Ft and Rate, and bank payment QR code.</p>
              </div>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-6 text-xs">
              {/* Header Info Block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
                <div>
                  <label className="font-bold text-foreground block mb-1">Customer / Client *</label>
                  <select
                    value={invForm.client_id}
                    onChange={(e) => setInvForm({ ...invForm, client_id: e.target.value })}
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-foreground font-bold"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name} ({c.city})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Order No / Job Ref *</label>
                  <input
                    type="text"
                    required
                    value={invForm.order_no}
                    onChange={(e) => setInvForm({ ...invForm, order_no: e.target.value })}
                    placeholder="e.g. ORDER-2026-101"
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-foreground font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Customer Phone Number</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedClient?.phone || '+91 98000 00000'}
                    className="w-full p-2.5 bg-muted border border-border rounded-xl text-muted-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={invForm.invoice_date}
                    onChange={(e) => setInvForm({ ...invForm, invoice_date: e.target.value })}
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Billing / Delivery Address</label>
                  <input
                    type="text"
                    readOnly
                    value={`${selectedClient?.billing_address || ''}, ${selectedClient?.city || ''}`}
                    className="w-full p-2.5 bg-muted border border-border rounded-xl text-muted-foreground"
                  />
                </div>
              </div>

              {/* Line Items Table Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" /> Invoice Line Items
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-bold text-xs flex items-center gap-1 hover:bg-primary/20 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item Row</span>
                  </button>
                </div>

                <div className="border border-border rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 w-20 text-right">Sq/Ft</th>
                        <th className="p-3 w-24 text-right">Rate</th>
                        <th className="p-3 w-24 text-right">Amount</th>
                        <th className="p-3 w-20 text-right">Qty</th>
                        <th className="p-3 w-28 text-right">Total</th>
                        <th className="p-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/10">
                          <td className="p-3 font-bold text-center text-muted-foreground">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              value={item.description}
                              onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                              placeholder="Cutting / Machining Details"
                              className="w-full p-2 bg-muted/30 border border-border rounded-lg text-foreground font-medium"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              required
                              min={0}
                              step="0.01"
                              value={item.sqft}
                              onChange={(e) => handleUpdateItem(idx, 'sqft', e.target.value)}
                              className="w-full p-2 bg-muted/30 border border-border rounded-lg text-foreground font-mono text-right font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              required
                              min={0}
                              value={item.rate}
                              onChange={(e) => handleUpdateItem(idx, 'rate', e.target.value)}
                              className="w-full p-2 bg-muted/30 border border-border rounded-lg text-foreground font-mono text-right font-bold"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-right text-foreground">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              required
                              min={1}
                              value={item.qty}
                              onChange={(e) => handleUpdateItem(idx, 'qty', e.target.value)}
                              className="w-full p-2 bg-muted/30 border border-border rounded-lg text-foreground font-mono text-right font-bold"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-right text-primary">
                            ₹{item.total.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-center">
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1.5 text-rose-400 hover:text-rose-500 rounded hover:bg-rose-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Summary & Payment Details Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Bank Details & Payment QR Code */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Payment Bank & UPI Details</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Printed on Invoice</span>
                  </h4>

                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white rounded-xl border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                      {companySettings?.payment_qr_url ? (
                        <img src={companySettings.payment_qr_url} alt="QR" className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="text-center p-1 text-slate-400">
                          <QrCode className="w-6 h-6 mx-auto" />
                          <span className="text-[8px] font-bold block mt-0.5">Upload QR</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] space-y-1 font-mono text-muted-foreground flex-1">
                      <p><strong className="text-foreground">Bank:</strong> {companySettings?.bank_name || 'HDFC Bank Ltd'}</p>
                      <p><strong className="text-foreground">A/C No:</strong> {companySettings?.account_no || '50200049811204'}</p>
                      <p><strong className="text-foreground">Holder:</strong> {companySettings?.account_holder || companySettings?.company_name}</p>
                      <p><strong className="text-foreground">IFSC:</strong> {companySettings?.ifsc_code || 'HDFC0000241'}</p>
                    </div>
                  </div>
                </div>

                {/* Amount Summary */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2.5 font-semibold text-xs">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Total Job Quantity:</span>
                    <span className="font-bold text-foreground font-mono">{totalJobQty} Pcs</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Sub Total:</span>
                    <span className="font-bold text-foreground font-mono">₹{subTotalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold bg-primary/10 border border-primary/30 p-2.5 rounded-xl text-primary">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{grandTotalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 flex items-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Generate Invoice</span>
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
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-bold"
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
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Payment Mode</label>
                  <select
                    value={payForm.mode}
                    onChange={(e) => setPayForm({ ...payForm, mode: e.target.value as any })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-bold"
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
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE DOCUMENT (100% MATCHING USER'S SAMPLE IMAGE) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 no-print my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" /> Invoice Document Print Preview
                </h3>
                <p className="text-xs text-muted-foreground">Standardized 1-to-1 invoice layout for client billing and PDF export.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* PRINTABLE BOXED LAYOUT (MATCHING SAMPLE IMAGE) */}
            <div className="p-6 bg-white text-black rounded-xl border-2 border-black space-y-0 text-xs font-sans">
              
              {/* COMPANY BRANDING & LOGO HEADER BLOCK */}
              <div className="border-2 border-b-0 border-black p-4 flex items-center justify-between gap-4 bg-white">
                {/* Left: Company Logo Image */}
                <div className="w-24 h-20 flex items-center justify-center shrink-0 overflow-hidden">
                  {companySettings?.logo_url ? (
                    <img src={companySettings.logo_url} alt="Company Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-20 h-16 bg-slate-900 text-white font-black text-xl rounded flex items-center justify-center shadow-sm">
                      {companySettings?.company_name ? companySettings.company_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'ERP'}
                    </div>
                  )}
                </div>

                {/* Center: Company Details */}
                <div className="text-center flex-1 space-y-0.5">
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {companySettings?.company_name || 'THE WOODEN ART'}
                  </h1>
                  {companySettings?.trade_name && (
                    <p className="text-[11px] font-bold text-slate-700 italic">({companySettings.trade_name})</p>
                  )}
                  <p className="text-[11px] text-slate-800 font-semibold max-w-md mx-auto leading-tight">{companySettings?.address}</p>
                  <p className="text-[11px] text-slate-800">
                    Phone: <strong>{companySettings?.phone}</strong> | Email: <strong>{companySettings?.email}</strong>
                  </p>
                  <p className="text-[11px] font-bold text-slate-900">
                    GSTIN: <span className="font-mono">{companySettings?.gstin}</span> | State: {companySettings?.state_name} ({companySettings?.state_code})
                  </p>
                </div>

                {/* Right: Tax Invoice Badge & Invoice Serial */}
                <div className="text-right text-[11px] shrink-0 border-l-2 border-black pl-4 py-1 space-y-1">
                  <span className="inline-block px-2.5 py-1 bg-slate-900 text-white font-black text-xs uppercase rounded">
                    TAX INVOICE
                  </span>
                  <p className="font-mono font-bold text-xs text-slate-900 mt-1">INV: {selectedInvoice.invoice_no}</p>
                  <p className="text-slate-700 font-semibold">{selectedInvoice.financial_year}</p>
                </div>
              </div>

              {/* TOP HEADER: INVOICE */}
              <div className="border-2 border-black text-center py-1.5 text-lg font-black uppercase tracking-wider bg-slate-100">
                INVOICE
              </div>

              {/* CUSTOMER & ORDER INFO GRID */}
              <div className="border-x-2 border-b-2 border-black grid grid-cols-2 divide-x-2 divide-black text-xs font-semibold">
                <div className="p-2 border-b-2 border-black flex gap-2">
                  <span className="font-bold w-20">Customer:</span>
                  <span className="font-extrabold uppercase">{selectedInvoice.client_name}</span>
                </div>
                <div className="p-2 border-b-2 border-black flex gap-2">
                  <span className="font-bold w-20">Order No:</span>
                  <span className="font-mono font-bold">{selectedInvoice.job_no || selectedInvoice.invoice_no}</span>
                </div>
                <div className="p-2 border-b-2 border-black flex gap-2">
                  <span className="font-bold w-20">Phone:</span>
                  <span>{selectedInvoice.client_phone || '+91 98000 00000'}</span>
                </div>
                <div className="p-2 border-b-2 border-black flex gap-2">
                  <span className="font-bold w-20">Date:</span>
                  <span className="font-mono">{selectedInvoice.invoice_date}</span>
                </div>
                <div className="p-2 col-span-2 flex gap-2">
                  <span className="font-bold w-20">Address:</span>
                  <span>{selectedInvoice.client_address || 'MIDC Industrial Area, Pune'}</span>
                </div>
              </div>

              {/* LINE ITEMS TABLE GRID */}
              <div className="border-x-2 border-b-2 border-black overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-200 border-b-2 border-black font-extrabold text-black">
                      <th className="p-2 border-r-2 border-black text-center w-10">#</th>
                      <th className="p-2 border-r-2 border-black text-left">Description</th>
                      <th className="p-2 border-r-2 border-black text-center w-16">Sq/Ft</th>
                      <th className="p-2 border-r-2 border-black text-right w-20">Rate</th>
                      <th className="p-2 border-r-2 border-black text-right w-24">Amount</th>
                      <th className="p-2 border-r-2 border-black text-center w-16">Qty</th>
                      <th className="p-2 text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black">
                    {(selectedInvoice.items && selectedInvoice.items.length > 0 ? selectedInvoice.items : [
                      { id: '1', description: 'HDMR MDF 18mm CNC Router 2D Design Cutting Job', sqft: 32, rate: 85, amount: 2720, qty: 5, total: 13600 },
                      { id: '2', description: 'Acrylic 6mm Laser Engraving & Letter Cutting Work', sqft: 16, rate: 120, amount: 1920, qty: 3, total: 5760 },
                    ]).map((item, idx) => (
                      <tr key={item.id} className="font-semibold text-black">
                        <td className="p-2.5 border-r-2 border-black text-center font-bold">{idx + 1}</td>
                        <td className="p-2.5 border-r-2 border-black font-bold">{item.description}</td>
                        <td className="p-2.5 border-r-2 border-black text-center font-mono">{item.sqft}</td>
                        <td className="p-2.5 border-r-2 border-black text-right font-mono">₹{item.rate}</td>
                        <td className="p-2.5 border-r-2 border-black text-right font-mono">₹{item.amount.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 border-r-2 border-black text-center font-mono font-bold">{item.qty}</td>
                        <td className="p-2.5 text-right font-mono font-bold">₹{item.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {/* Blank Padding Rows if fewer items */}
                    {Array.from({ length: Math.max(0, 4 - (selectedInvoice.items?.length || 2)) }).map((_, i) => (
                      <tr key={`blank-${i}`} className="h-10 border-b-2 border-black">
                        <td className="border-r-2 border-black"></td>
                        <td className="border-r-2 border-black"></td>
                        <td className="border-r-2 border-black"></td>
                        <td className="border-r-2 border-black"></td>
                        <td className="border-r-2 border-black"></td>
                        <td className="border-r-2 border-black"></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM PAYMENT DETAILS & AMOUNT SUMMARY GRID */}
              <div className="border-x-2 border-b-2 border-black grid grid-cols-12 divide-x-2 divide-black text-xs">
                
                {/* PAYMENT DETAILS BLOCK (LEFT 8 COLUMNS) */}
                <div className="col-span-7 flex flex-col justify-between">
                  <div className="bg-slate-200 border-b-2 border-black p-1.5 font-bold uppercase tracking-wide">
                    Payment Details
                  </div>
                  
                  <div className="p-3 flex items-center justify-between gap-3">
                    {/* Bank Info */}
                    <div className="space-y-1 text-[11px] font-semibold flex-1">
                      <div className="flex gap-2">
                        <span className="font-bold w-28">Account Number:</span>
                        <span className="font-mono font-bold">{companySettings?.account_no || '50200049811204'}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold w-28">Bank Name:</span>
                        <span>{companySettings?.bank_name || 'HDFC Bank Ltd'}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold w-28">Account Type:</span>
                        <span>{companySettings?.account_type || 'Current Account'}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold w-28">Account Holder:</span>
                        <span>{companySettings?.account_holder || companySettings?.company_name}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold w-28">IFSC Code:</span>
                        <span className="font-mono font-bold">{companySettings?.ifsc_code || 'HDFC0000241'}</span>
                      </div>
                    </div>

                    {/* PAYMENT QR CODE IMAGE */}
                    <div className="w-24 h-24 bg-white border-2 border-black rounded flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      {companySettings?.payment_qr_url ? (
                        <img src={companySettings.payment_qr_url} alt="Payment QR Code" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center text-[9px] text-slate-500 font-bold p-1">
                          <QrCode className="w-8 h-8 mx-auto text-slate-800" />
                          <span>Scan UPI QR</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AMOUNT SUMMARY BLOCK (RIGHT 5 COLUMNS) */}
                <div className="col-span-5 flex flex-col justify-between">
                  <div className="bg-slate-200 border-b-2 border-black p-1.5 font-bold uppercase tracking-wide text-right">
                    Amount Summary
                  </div>

                  <div className="divide-y-2 divide-black text-xs font-semibold">
                    <div className="p-2 flex justify-between">
                      <span>Total Job Qty</span>
                      <span className="font-mono font-bold text-sm">
                        {selectedInvoice.items?.reduce((s, i) => s + i.qty, 0) || 8} Pcs
                      </span>
                    </div>
                    <div className="p-2 flex justify-between">
                      <span>Sub Total</span>
                      <span className="font-mono font-bold">
                        ₹{selectedInvoice.subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-2 flex justify-between bg-slate-200 text-sm font-black text-black">
                      <span>Grand Total</span>
                      <span className="font-mono">
                        ₹{selectedInvoice.total_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* PAYMENT TERMS AND INFO & INSTRUCTIONS */}
              <div className="border-x-2 border-b-2 border-black p-3 space-y-1 text-[11px] bg-slate-50">
                <p className="font-bold text-black uppercase">Payment terms and info & instructions</p>
                <ul className="space-y-0.5 text-slate-800 pl-1">
                  <li>• 100% payment is required before delivery. Delivery will be scheduled after payment confirmation.</li>
                  <li>• Goods once delivered will not be returned or exchanged, except in case of manufacturing defects.</li>
                  <li>• Please verify all order details before payment.</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
