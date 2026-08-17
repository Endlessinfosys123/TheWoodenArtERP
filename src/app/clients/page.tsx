'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { Client, ContactPerson } from '@/types';
import { 
  Users, 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Clock, 
  CreditCard, 
  History, 
  X, 
  FileText, 
  Wrench, 
  FileCode2, 
  UserPlus
} from 'lucide-react';

export default function ClientsPage() {
  const { clients, jobOrders, invoices, payments, addClient, updateClient, addContactPerson } = useErp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Client Form
  const [clientForm, setClientForm] = useState({
    company_name: '',
    gstin: '',
    contact_person: '',
    phone: '',
    email: '',
    billing_address: '',
    shipping_address: '',
    city: 'Pune',
    state_code: '27',
    state_name: 'Maharashtra',
    credit_terms: '30 Days Net',
    payment_due_days: 30,
    credit_limit: 500000,
    status: 'active' as 'active' | 'inactive',
    contact_persons: [] as ContactPerson[],
  });

  // Contact Person Form
  const [contactForm, setContactForm] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
  });

  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.gstin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.company_name) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await addClient({
        ...clientForm,
        gstin: clientForm.gstin || '27URP0000000000',
        contact_persons: clientForm.contact_person 
          ? [{ id: `cp-${Date.now()}`, name: clientForm.contact_person, designation: 'Primary Contact', phone: clientForm.phone || '+91 00000 00000', email: clientForm.email || 'info@client.com' }]
          : [],
      });

      setSuccessMsg(`Client "${clientForm.company_name}" added successfully and synced with Supabase!`);
      setTimeout(() => setSuccessMsg(''), 4000);

      setIsAddModalOpen(false);
      setClientForm({
        company_name: '',
        gstin: '',
        contact_person: '',
        phone: '',
        email: '',
        billing_address: '',
        shipping_address: '',
        city: 'Pune',
        state_code: '27',
        state_name: 'Maharashtra',
        credit_terms: '30 Days Net',
        payment_due_days: 30,
        credit_limit: 500000,
        status: 'active',
        contact_persons: [],
      });
    } catch (err: any) {
      console.error('Error adding client:', err);
      setErrorMsg(err?.message || 'Failed to save client to Supabase DB. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !contactForm.name) return;

    addContactPerson(selectedClient.id, contactForm);
    setContactForm({ name: '', designation: '', phone: '', email: '' });
    setIsContactModalOpen(false);
  };

  // Client Specific History Filters
  const clientInvoices = selectedClient ? invoices.filter(i => i.client_id === selectedClient.id) : [];
  const clientPayments = selectedClient ? payments.filter(p => p.client_id === selectedClient.id) : [];
  const clientJobs = selectedClient ? jobOrders.filter(j => j.client_id === selectedClient.id) : [];

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Client Directory & Master Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage customer accounts, GSTIN master data, multiple contact persons, credit limits, and client-wise financial ledgers.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Users className="w-4 h-4 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company name, GSTIN, city..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'active', 'inactive'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Client List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClients.map((client) => {
          const outstanding = client.outstanding_balance || 0;
          const limit = client.credit_limit || 0;
          const isOverCredit = outstanding > limit;
          return (
            <div
              key={client.id}
              className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-border pb-3 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-foreground leading-snug">{client.company_name || 'Unnamed Client'}</h3>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">GSTIN: {client.gstin || 'N/A'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    client.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    {client.status || 'active'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{client.contact_person || 'Primary Contact'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{client.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="truncate">{client.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{client.city || 'Pune'}, {client.state_name || 'Maharashtra'} ({client.state_code || '27'})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Credit Limit</span>
                    <span className="font-bold text-foreground">₹{limit.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Outstanding Balance</span>
                    <span className={`font-extrabold ${isOverCredit ? 'text-rose-500 animate-pulse' : 'text-primary'}`}>
                      ₹{outstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{client.contact_persons?.length || 1} Contact(s)</span>
                <button
                  onClick={() => setSelectedClient(client)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-primary flex items-center gap-1 transition"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View Ledger & Orders</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Add New Client Account
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Company / Client Name *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.company_name}
                    onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })}
                    placeholder="e.g. Apex AeroTech Solutions"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">GSTIN Number (Optional for Unregistered)</label>
                  <input
                    type="text"
                    value={clientForm.gstin}
                    onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 27AAACA1234A1Z5 or Leave Empty"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Primary Contact Person</label>
                  <input
                    type="text"
                    value={clientForm.contact_person}
                    onChange={(e) => setClientForm({ ...clientForm, contact_person: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="+91 98220 11223"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="rajesh@client.com"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">City</label>
                  <input
                    type="text"
                    value={clientForm.city}
                    onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                    placeholder="Pune"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">State Code (MH=27, GJ=24)</label>
                  <input
                    type="text"
                    value={clientForm.state_code}
                    onChange={(e) => setClientForm({ ...clientForm, state_code: e.target.value })}
                    placeholder="27"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={clientForm.credit_limit}
                    onChange={(e) => setClientForm({ ...clientForm, credit_limit: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Billing Address</label>
                  <textarea
                    rows={2}
                    value={clientForm.billing_address}
                    onChange={(e) => setClientForm({ ...clientForm, billing_address: e.target.value, shipping_address: e.target.value })}
                    placeholder="Plot 42, MIDC Bhosari, Pune..."
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Client Ledger Drawer */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-card border-l border-border h-full w-full max-w-3xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-xl text-foreground">{selectedClient.company_name}</h3>
                <p className="text-xs text-muted-foreground">GSTIN: {selectedClient.gstin} | State: {selectedClient.state_name} ({selectedClient.state_code})</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contact Persons List */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" /> Contact Persons Directory
                </h4>
                <button
                  onClick={() => setIsContactModalOpen(!isContactModalOpen)}
                  className="px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Contact
                </button>
              </div>

              {/* Add Contact Form Subdrawer */}
              {isContactModalOpen && (
                <form onSubmit={handleAddContactSubmit} className="p-3 rounded-lg bg-card border border-primary/30 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Name *"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="p-2 bg-muted/50 border border-border rounded text-foreground"
                    />
                    <input
                      type="text"
                      placeholder="Designation"
                      value={contactForm.designation}
                      onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
                      className="p-2 bg-muted/50 border border-border rounded text-foreground"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="p-2 bg-muted/50 border border-border rounded text-foreground"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="p-2 bg-muted/50 border border-border rounded text-foreground"
                    />
                  </div>
                  <button type="submit" className="w-full py-1.5 bg-primary text-primary-foreground font-semibold rounded">Save Contact</button>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedClient.contact_persons?.map(cp => (
                  <div key={cp.id} className="p-2.5 rounded-lg bg-card border border-border text-xs space-y-1">
                    <p className="font-bold text-foreground">{cp.name} <span className="text-[10px] text-muted-foreground">({cp.designation})</span></p>
                    <p className="text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3 text-emerald-500" /> {cp.phone}</p>
                    <p className="text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3 text-cyan-500" /> {cp.email}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Ledger Section (Invoices & Payments) */}
            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" /> Client Financial Ledger & Outstanding
              </h4>
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Total Outstanding Balance</span>
                  <p className="text-xl font-extrabold text-rose-500 mt-0.5">₹{selectedClient.outstanding_balance.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Credit Limit</span>
                  <p className="text-base font-bold text-foreground">₹{selectedClient.credit_limit.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Invoices List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Invoices Issued ({clientInvoices.length})</p>
                <div className="space-y-2">
                  {clientInvoices.map(inv => (
                    <div key={inv.id} className="p-3 rounded-lg bg-card border border-border text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-primary">{inv.invoice_no} ({inv.financial_year})</p>
                        <p className="text-[11px] text-muted-foreground">Type: <span className="capitalize">{inv.invoice_type.replace('_', ' ')}</span> | Due: {inv.due_date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">₹{inv.total_amount.toLocaleString('en-IN')}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                          inv.status === 'partially_paid' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-rose-500/10 text-rose-500'
                        }`}>
                          {inv.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Client Job History */}
            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-cyan-500" /> Job Order History ({clientJobs.length})
              </h4>
              <div className="space-y-2">
                {clientJobs.map(job => (
                  <div key={job.id} className="p-3 rounded-lg bg-card border border-border text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{job.job_no} — {job.part_name}</p>
                      <p className="text-[11px] text-muted-foreground">Qty: {job.qty} Pcs | Ref: {job.drawing_ref}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
