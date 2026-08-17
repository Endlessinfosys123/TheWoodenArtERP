'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { 
  Settings, 
  Building2, 
  Users, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  Database,
  Lock,
  Image,
  Upload
} from 'lucide-react';

export default function SettingsPage() {
  const { companySettings, updateCompanySettings, currentUser } = useErp();
  const [formData, setFormData] = useState(companySettings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Company Profile & System Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure company GSTIN master, state code, company logo branding, bank details, and user role management.
        </p>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Company profile & logo settings updated successfully!
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6 text-xs">
        {/* Company Branding & Logo Upload */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Image className="w-4 h-4 text-amber-500" /> Company Branding & Sidebar Logo
          </h3>

          <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row items-center gap-4">
            {/* Logo Preview */}
            <div className="w-20 h-20 rounded-2xl bg-card border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Company Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white font-extrabold text-xl">
                  {formData.company_name ? formData.company_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'WA'}
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1 w-full">
              <label className="font-bold text-foreground block">Upload Company Logo</label>
              <p className="text-[11px] text-muted-foreground">
                Upload your logo image (PNG, JPG, SVG, WEBP). This logo will appear at the top-left of the sidebar.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <label className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image File</span>
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
                    className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 font-semibold text-xs hover:bg-rose-500/10 transition"
                  >
                    Remove Custom Logo
                  </button>
                )}
              </div>

              <div className="pt-1">
                <span className="text-[11px] text-muted-foreground block mb-1">Or Paste Image URL</span>
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
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Building2 className="w-4 h-4 text-primary" /> Company GST & Legal Registration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="font-semibold block mb-1">Company Registered Name *</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-semibold"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">GSTIN Number *</label>
              <input
                type="text"
                required
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">State Code (India GST)</label>
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
              <label className="font-semibold block mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Email Address</label>
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

        {/* Bank Account Details */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Database className="w-4 h-4 text-emerald-500" /> Invoice Payment Bank Account Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold block mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Account Number</label>
              <input
                type="text"
                value={formData.account_no}
                onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">IFSC Code</label>
              <input
                type="text"
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-mono"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Branch Name</label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/90 transition"
          >
            <Save className="w-4 h-4" /> Save Profile Settings
          </button>
        </div>
      </form>
    </div>
  );
}
