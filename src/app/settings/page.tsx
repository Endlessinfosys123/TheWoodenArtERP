'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { updateDynamicSupabaseConfig } from '@/lib/supabase/client';
import { 
  Settings, 
  Building2, 
  Users, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  Database,
  Lock,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Wrench,
  Receipt,
  KeyRound,
  Sliders,
  Check,
  AlertTriangle,
  RefreshCw,
  QrCode
} from 'lucide-react';

export default function SettingsPage() {
  const { companySettings, updateCompanySettings, currentUser, lockErp, resetToFreshInstance } = useErp();
  
  const [activeTab, setActiveTab] = useState<'company' | 'security' | 'cnc' | 'invoice' | 'supabase'>('company');
  const [formData, setFormData] = useState(companySettings);
  const [isSaved, setIsSaved] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Custom Supabase Keys State
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState(
    formData.supabase_url || (typeof window !== 'undefined' ? localStorage.getItem('cnc_erp_supabase_url') || '' : '')
  );
  const [customSupabaseKey, setCustomSupabaseKey] = useState(
    formData.supabase_anon_key || (typeof window !== 'undefined' ? localStorage.getItem('cnc_erp_supabase_key') || '' : '')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update dynamic Supabase config if custom URL/Key provided
    updateDynamicSupabaseConfig(customSupabaseUrl, customSupabaseKey);

    updateCompanySettings({
      ...formData,
      supabase_url: customSupabaseUrl,
      supabase_anon_key: customSupabaseKey,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            System Control Panel & Granular Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure company branding, GST master, 4-Digit Security PIN, CNC machine defaults, invoice rules, and Supabase database multi-tenancy.
          </p>
        </div>

        <button
          type="button"
          onClick={lockErp}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-semibold text-xs hover:bg-amber-500/20 transition self-start sm:self-auto shadow-sm"
        >
          <Lock className="w-4 h-4" />
          <span>Lock Screen (PIN Protection)</span>
        </button>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> System settings updated successfully & saved to database!
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border overflow-x-auto text-xs font-semibold select-none no-scrollbar">
        {[
          { id: 'company', label: '🏢 Company & Logo Branding', icon: Building2 },
          { id: 'security', label: '🔒 Passcode PIN & Security', icon: ShieldCheck },
          { id: 'cnc', label: '⚙️ CNC Machine & Shop-Floor', icon: Wrench },
          { id: 'invoice', label: '🧾 Invoices & Bank Ledger', icon: Receipt },
          { id: 'supabase', label: '🔌 Supabase Database Multi-Tenant', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-sm space-y-6 text-xs">
        
        {/* TAB 1: COMPANY PROFILE & LOGO BRANDING */}
        {activeTab === 'company' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Logo Upload Section */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
                <ImageIcon className="w-4 h-4 text-amber-500" /> Company Logo & Visual Identity
              </h3>

              <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-card border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Company Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white font-extrabold text-xl">
                      {formData.company_name ? formData.company_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'ERP'}
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <label className="font-bold text-foreground block">Upload Custom Logo</label>
                  <p className="text-[11px] text-muted-foreground">
                    Supported formats: PNG, JPG, SVG, WEBP. This logo appears in the top-left sidebar and printed documents.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {formData.logo_url && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                        className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 font-semibold hover:bg-rose-500/10 transition"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>

                  <div className="pt-1">
                    <span className="text-[11px] text-muted-foreground block mb-1">Or Paste Image Web URL</span>
                    <input
                      type="text"
                      value={formData.logo_url || ''}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full p-2 bg-card border border-border rounded-lg text-foreground font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Registration & Details */}
            <div className="space-y-4 pt-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Building2 className="w-4 h-4 text-primary" /> Legal Company Master & GST Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold block mb-1">Company Legal Registered Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Trade / Brand Name</label>
                  <input
                    type="text"
                    value={formData.trade_name || ''}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                    placeholder="e.g. The Wooden Art"
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    value={formData.pan_number || ''}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                    placeholder="AAACP9988C"
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">State Code (GST)</label>
                  <input
                    type="text"
                    value={formData.state_code}
                    onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">State Name</label>
                  <input
                    type="text"
                    value={formData.state_name}
                    onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Phone Number(s)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Official Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Full Factory / Works Address</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SECURITY & 4-DIGIT PASSCODE PIN */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> 4-Digit Quick Passcode Lock & Security
              </h3>
              <p className="text-xs text-muted-foreground">
                Protect shop-floor screens and administrative ledgers with a 4-digit numeric passcode PIN.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-foreground">Enable Passcode PIN Lock</h4>
                  <p className="text-[11px] text-muted-foreground">Require 4-digit PIN to access ERP or unlock screen.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.passcode_enabled ?? true}
                    onChange={(e) => setFormData({ ...formData, passcode_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                <div>
                  <label className="font-semibold block mb-1">4-Digit Passcode PIN *</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={formData.passcode_pin || '1234'}
                    onChange={(e) => setFormData({ ...formData, passcode_pin: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="1234"
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-foreground font-mono font-bold tracking-widest text-center text-lg"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">Default PIN is 1234</span>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Auto-Lock Inactivity Timer</label>
                  <select
                    value={formData.auto_lock_timer ?? 0}
                    onChange={(e) => setFormData({ ...formData, auto_lock_timer: Number(e.target.value) })}
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-foreground"
                  >
                    <option value={0}>Disabled (Manual Lock Only)</option>
                    <option value={1}>Auto-Lock After 1 Minute</option>
                    <option value={5}>Auto-Lock After 5 Minutes</option>
                    <option value={15}>Auto-Lock After 15 Minutes</option>
                    <option value={30}>Auto-Lock After 30 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={lockErp}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-amber-500 transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Test Lock Screen Now</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CNC MACHINE & SHOP-FLOOR SETTINGS */}
        {activeTab === 'cnc' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Wrench className="w-4 h-4 text-cyan-500" /> CNC Machine & Shop-Floor Operational Defaults
              </h3>
              <p className="text-xs text-muted-foreground">
                Set baseline hourly machining rates, shift hours, and material waste margins for cost estimation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Standard Hourly Machining Rate (₹/Hour)</label>
                <input
                  type="number"
                  value={formData.hourly_machining_rate ?? 850}
                  onChange={(e) => setFormData({ ...formData, hourly_machining_rate: Number(e.target.value) })}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Factory Working Shift Hours per Day</label>
                <input
                  type="number"
                  value={formData.shift_hours_per_day ?? 16}
                  onChange={(e) => setFormData({ ...formData, shift_hours_per_day: Number(e.target.value) })}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Material Cutting Waste Margin %</label>
                <input
                  type="number"
                  value={formData.waste_margin_percent ?? 5}
                  onChange={(e) => setFormData({ ...formData, waste_margin_percent: Number(e.target.value) })}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border col-span-2 sm:col-span-1">
                <div>
                  <span className="font-bold text-foreground block">Shop-Floor QR Scan Auto-Confirm</span>
                  <span className="text-[10px] text-muted-foreground">Automatically advance job stage upon scanning QR code.</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.qr_auto_confirm ?? false}
                  onChange={(e) => setFormData({ ...formData, qr_auto_confirm: e.target.checked })}
                  className="w-4 h-4 rounded text-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INVOICES & BANK LEDGER SETTINGS */}
        {activeTab === 'invoice' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Receipt className="w-4 h-4 text-emerald-500" /> Invoice Numbering & Bank Payment Details
              </h3>
              <p className="text-xs text-muted-foreground">
                Set invoice numbering prefix and bank account details for client payments.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Invoice Number Prefix Format</label>
                <input
                  type="text"
                  value={formData.invoice_prefix || 'TWA/INV/2026-27/'}
                  onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                  placeholder="INV/2026-27/"
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Default HSN Code for Cutting Job Work</label>
                <input
                  type="text"
                  value={formData.hsn_default || '4411'}
                  onChange={(e) => setFormData({ ...formData, hsn_default: e.target.value })}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.account_holder || ''}
                  onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                  placeholder="e.g. The Wooden Art"
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Account Type</label>
                <input
                  type="text"
                  value={formData.account_type || ''}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  placeholder="e.g. Current Account / Savings Account"
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.account_no || ''}
                  onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={formData.ifsc_code || ''}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Branch Name</label>
                <input
                  type="text"
                  value={formData.branch || ''}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                />
              </div>
            </div>

            {/* Payment QR Code Image Upload Box */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 rounded-xl bg-white border-2 border-emerald-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                {formData.payment_qr_url ? (
                  <img src={formData.payment_qr_url} alt="Payment QR Code" className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <QrCode className="w-8 h-8 mx-auto" />
                    <span className="text-[9px] block mt-1 font-bold">No QR Code</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 w-full text-xs">
                <label className="font-bold text-foreground block">Payment UPI / Bank QR Code Image</label>
                <p className="text-[11px] text-muted-foreground">
                  Upload your GPay / PhonePe / Paytm / Bank QR Code image to be printed on every client invoice.
                </p>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1.5 hover:bg-emerald-500 transition shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload QR Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData(prev => ({ ...prev, payment_qr_url: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {formData.payment_qr_url && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, payment_qr_url: '' }))}
                      className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 font-semibold hover:bg-rose-500/10 transition"
                    >
                      Remove QR
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUPABASE MULTI-TENANT & SYSTEM RESET */}
        {activeTab === 'supabase' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Database className="w-4 h-4 text-purple-500" /> Supabase Multi-Tenant Database Setup
              </h3>
              <p className="text-xs text-muted-foreground">
                Connect a custom Supabase PostgreSQL project for each client company or deployment instance.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                  <Database className="w-4 h-4 text-purple-500" />
                  <span>Dynamic Company Database Connection</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  🟢 Supabase API Active
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-semibold block mb-1">Custom Supabase Project URL</label>
                  <input
                    type="text"
                    value={customSupabaseUrl}
                    onChange={(e) => setCustomSupabaseUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-foreground font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Custom Supabase Anon / Publishable Key</label>
                  <input
                    type="text"
                    value={customSupabaseKey}
                    onChange={(e) => setCustomSupabaseKey(e.target.value)}
                    placeholder="sb_publishable_..."
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-foreground font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Product Setup & Reset Banner */}
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Multi-Company Deployment & Product Setup
                </h4>
                <a
                  href="/setup"
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-500 transition shadow-sm"
                >
                  Launch Setup Wizard
                </a>
              </div>
              <p className="text-muted-foreground">
                Deploying for a new client? Use the 3-step onboarding wizard to initialize company branding, admin superuser, and fresh database instance.
              </p>
            </div>

            {/* Reset Database Button */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs">
              <div>
                <h4 className="font-bold text-rose-400">Clear Instance Mock Data</h4>
                <p className="text-[11px] text-muted-foreground">Purge demo records and start with a 100% clean slate.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 font-bold hover:bg-rose-500/20 transition"
              >
                Clear Demo Data
              </button>
            </div>
          </div>
        )}

        {/* Form Action Controls */}
        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition transform hover:scale-105"
          >
            <Save className="w-4 h-4" /> Save System Settings
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Reset */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-foreground">Clear Instance Demo Data?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This action will reset demo clients, job orders, and invoices to start a fresh ERP workspace. Are you sure you want to proceed?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToFreshInstance('clean');
                  setIsResetModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition shadow-md"
              >
                Yes, Start Clean Slate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
