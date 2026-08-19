'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useErp } from '@/lib/store/ErpContext';
import { updateDynamicSupabaseConfig } from '@/lib/supabase/client';
import { 
  Building2, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Wrench, 
  Users, 
  ShieldCheck, 
  Boxes, 
  Sparkles,
  Database,
  Check
} from 'lucide-react';

export default function SetupWizardPage() {
  const router = useRouter();
  const { companySettings, updateCompanySettings, resetToFreshInstance } = useErp();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);

  // Form State
  const [setupForm, setSetupForm] = useState({
    // Company Profile
    company_name: companySettings?.company_name || 'My CNC Engineering Works',
    logo_url: companySettings?.logo_url || '',
    gstin: companySettings?.gstin || '',
    state_code: companySettings?.state_code || '27',
    state_name: companySettings?.state_name || 'Maharashtra',
    address: companySettings?.address || '',
    phone: companySettings?.phone || '',
    email: companySettings?.email || '',
    bank_name: companySettings?.bank_name || '',
    account_no: companySettings?.account_no || '',
    ifsc_code: companySettings?.ifsc_code || '',
    branch: companySettings?.branch || '',

    // Super Admin User & 4-Digit Security PIN
    admin_name: 'Admin Superuser',
    admin_email: 'admin@company.com',
    admin_phone: '+91 98000 00000',
    admin_pin: '1234',

    // Supabase Multi-Tenant Database Project
    supabase_url: '',
    supabase_anon_key: '',

    // Setup Preset Mode
    preset_mode: 'cnc_preset' as 'clean' | 'cnc_preset',
  });

  const handleNext = () => {
    if (currentStep === 1 && !setupForm.company_name.trim()) return;
    setCurrentStep(prev => Math.min(3, prev + 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleFinishSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    // 0. Update dynamic Supabase credentials if provided
    if (setupForm.supabase_url && setupForm.supabase_anon_key) {
      updateDynamicSupabaseConfig(setupForm.supabase_url, setupForm.supabase_anon_key);
    }
    
    // 1. Save company settings to DB
    await updateCompanySettings({
      company_name: setupForm.company_name,
      logo_url: setupForm.logo_url,
      gstin: setupForm.gstin || '27URP0000000000',
      state_code: setupForm.state_code,
      state_name: setupForm.state_name,
      address: setupForm.address || 'Works Address Not Specified',
      phone: setupForm.phone || '+91 00000 00000',
      email: setupForm.email || 'info@company.com',
      bank_name: setupForm.bank_name || 'Bank Account',
      account_no: setupForm.account_no || '00000000000',
      ifsc_code: setupForm.ifsc_code || 'IFSC0000000',
      branch: setupForm.branch || 'Main Branch',
      passcode_enabled: true,
      passcode_pin: setupForm.admin_pin || '1234',
      supabase_url: setupForm.supabase_url,
      supabase_anon_key: setupForm.supabase_anon_key,
    });

    // 2. Reset database/state according to selected preset mode
    resetToFreshInstance(setupForm.preset_mode);

    // 3. Mark completed
    setIsCompleted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 no-print">
      {/* Background Motifs */}
      <div className="fixed inset-0 bg-grid-white/[0.02] bg-[size:32px_32px] pointer-events-none" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-3xl space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Product Deployment & Onboarding Wizard</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Setup New Company Instance
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Configure your client company branding, GST master, admin superuser, and choose your initial database setup preference.
          </p>
        </div>

        {!isCompleted ? (
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-between border-b border-border pb-6">
              {[
                { step: 1, label: 'Company Profile & Logo', icon: Building2 },
                { step: 2, label: 'Super Admin User', icon: ShieldCheck },
                { step: 3, label: 'Database Presets', icon: Database },
              ].map((s) => {
                const Icon = s.icon;
                const isActive = currentStep === s.step;
                const isDone = currentStep > s.step;

                return (
                  <div key={s.step} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isDone ? 'bg-emerald-500 text-white' :
                      isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' :
                      'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {isDone ? <Check className="w-4 h-4" /> : s.step}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className={`text-xs font-bold leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Step {s.step} of 3</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 1: Company Profile & Branding */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Company Legal Profile & Logo Branding
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    This company name and logo will be printed on Invoices, Delivery Challans, and Sidebar.
                  </p>
                </div>

                {/* Logo Upload Section */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-card border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {setupForm.logo_url ? (
                      <img src={setupForm.logo_url} alt="Company Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white font-extrabold text-xl">
                        {setupForm.company_name ? setupForm.company_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'ERP'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1 w-full text-xs">
                    <label className="font-bold text-foreground block">Company Logo Image</label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setSetupForm(prev => ({ ...prev, logo_url: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {setupForm.logo_url && (
                        <button
                          type="button"
                          onClick={() => setSetupForm(prev => ({ ...prev, logo_url: '' }))}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="font-semibold block mb-1">Company Registered Name *</label>
                    <input
                      type="text"
                      required
                      value={setupForm.company_name}
                      onChange={(e) => setSetupForm({ ...setupForm, company_name: e.target.value })}
                      placeholder="e.g. Acme Precision Engineering Works"
                      className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">GSTIN Number (Optional)</label>
                    <input
                      type="text"
                      value={setupForm.gstin}
                      onChange={(e) => setSetupForm({ ...setupForm, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 27AAAAA0000A1Z5 or Leave Blank"
                      className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={setupForm.phone}
                      onChange={(e) => setSetupForm({ ...setupForm, phone: e.target.value })}
                      placeholder="+91 98220 00000"
                      className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Official Email Address</label>
                    <input
                      type="email"
                      value={setupForm.email}
                      onChange={(e) => setSetupForm({ ...setupForm, email: e.target.value })}
                      placeholder="operations@company.com"
                      className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="font-semibold block mb-1">Full Factory / Works Address</label>
                    <textarea
                      rows={2}
                      value={setupForm.address}
                      onChange={(e) => setSetupForm({ ...setupForm, address: e.target.value })}
                      placeholder="Plot 101, Industrial Estate, MIDC Bhosari, Pune - 411026"
                      className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Super Admin Account Setup */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    System Super Admin Account Setup
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    This primary admin account will have full access to User Management, Settings, and Master Ledger configuration.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>
                    Role <strong>`admin`</strong> grants full permissions across all 11 core ERP modules including Invoices, Shop-Floor Operator QR Scan, and Financial Reports.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="font-semibold block mb-1">Admin Full Name *</label>
                    <input
                      type="text"
                      required
                      value={setupForm.admin_name}
                      onChange={(e) => setSetupForm({ ...setupForm, admin_name: e.target.value })}
                      className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Admin Email Address *</label>
                    <input
                      type="email"
                      required
                      value={setupForm.admin_email}
                      onChange={(e) => setSetupForm({ ...setupForm, admin_email: e.target.value })}
                      className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Admin Phone Number</label>
                    <input
                      type="text"
                      value={setupForm.admin_phone}
                      onChange={(e) => setSetupForm({ ...setupForm, admin_phone: e.target.value })}
                      className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">User Role</label>
                    <input
                      type="text"
                      disabled
                      value="System Super Admin (Full Control)"
                      className="w-full p-2.5 bg-muted/30 border border-border rounded-xl text-muted-foreground font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Database Presets & Mode */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Database className="w-5 h-5 text-cyan-500" />
                    Choose Initial Database Setup Mode
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select how you want to initialize the database for this new company setup.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Preset Option A: CNC Material Presets */}
                  <div
                    onClick={() => setSetupForm({ ...setupForm, preset_mode: 'cnc_preset' })}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-3 ${
                      setupForm.preset_mode === 'cnc_preset'
                        ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                        : 'bg-card border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                        <Boxes className="w-5 h-5" />
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        setupForm.preset_mode === 'cnc_preset' ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
                      }`}>
                        {setupForm.preset_mode === 'cnc_preset' && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Standard CNC Material Presets (Recommended)</h4>
                      <p className="text-muted-foreground mt-1 leading-relaxed">
                        Initializes 6 standard CNC Raw Materials (MDF 18mm, Corian 12mm, Plywood 19mm, MS 2mm, SS 3mm, Acrylic 6mm) with zero dummy clients, zero vendors, and zero dummy job orders.
                      </p>
                    </div>
                  </div>

                  {/* Preset Option B: Completely Clean Slate */}
                  <div
                    onClick={() => setSetupForm({ ...setupForm, preset_mode: 'clean' })}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-3 ${
                      setupForm.preset_mode === 'clean'
                        ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                        : 'bg-card border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        setupForm.preset_mode === 'clean' ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
                      }`}>
                        {setupForm.preset_mode === 'clean' && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">100% Clean Slate Database</h4>
                      <p className="text-muted-foreground mt-1 leading-relaxed">
                        Starts with a completely blank database (0 clients, 0 vendors, 0 materials, 0 job orders, 0 invoices). Ideal for selling a totally fresh ERP setup.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous Step</span>
                </button>
              ) : <div />}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 flex items-center gap-2 transition"
                >
                  <span>Continue to Step {currentStep + 1}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishSetup}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 flex items-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Setup & Initialize ERP</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Celebration Banner */
          <div className="bg-card border border-emerald-500/40 rounded-2xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">
                🎉 ERP Setup Successfully Initialized!
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                <strong>{setupForm.company_name}</strong> is now fully configured with custom branding, super admin permissions, and a fresh database structure.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push('/')}
                className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/30 hover:bg-primary/90 flex items-center gap-2 mx-auto transition transform hover:scale-105"
              >
                <span>Launch {setupForm.company_name} Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
