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
  Lock
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
          Configure company GSTIN master, state code, bank details for invoice generation, and user role management.
        </p>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Company profile settings updated successfully!
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6 text-xs">
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
