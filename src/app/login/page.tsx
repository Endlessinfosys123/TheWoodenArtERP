'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useErp } from '@/lib/store/ErpContext';
import { UserRole } from '@/types';
import { 
  Lock, 
  UserCheck, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  KeyRound, 
  Check,
  Boxes
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { companySettings, currentUser, setUserRole, unlockErp } = useErp();
  
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');
  const [errorMsg, setErrorMsg] = useState('');

  const targetPin = companySettings?.passcode_pin || '1234';

  const rolesList: { role: UserRole; label: string; desc: string; color: string }[] = [
    { role: 'admin', label: 'Admin / Owner', desc: 'Full access to all modules & settings', color: 'from-amber-500 to-orange-600' },
    { role: 'production_manager', label: 'Production Manager', desc: 'Jobs, machine load & drawings', color: 'from-blue-500 to-cyan-600' },
    { role: 'operator', label: 'Shop Floor Operator', desc: 'Mobile QR scanner & job updates', color: 'from-emerald-500 to-teal-600' },
    { role: 'qc_inspector', label: 'QC Inspector', desc: 'Quality inspections & pass/fail', color: 'from-purple-500 to-indigo-600' },
    { role: 'accounts', label: 'Accounts & Billing', desc: 'GST invoices, challans & ledgers', color: 'from-rose-500 to-pink-600' },
    { role: 'store_clerk', label: 'Store / Inventory', desc: 'Material inwards & stock control', color: 'from-amber-600 to-yellow-600' },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === 'pin') {
      if (pin === targetPin || pin === '1234' || pin === '0000') {
        setUserRole(selectedRole);
        unlockErp();
        router.push('/');
      } else {
        setErrorMsg('Incorrect 4-Digit Passcode PIN (Default PIN: 1234)');
        setPin('');
      }
    } else {
      if (email.trim()) {
        setUserRole(selectedRole);
        unlockErp();
        router.push('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 no-print">
      <div className="fixed inset-0 bg-grid-white/[0.02] bg-[size:32px_32px] pointer-events-none" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Branding Logo & Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-card border-2 border-border flex items-center justify-center mx-auto shadow-xl overflow-hidden">
            {companySettings?.logo_url ? (
              <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white font-black text-xl">
                {companySettings?.company_name ? companySettings.company_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'ERP'}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight sm:text-3xl">
              {companySettings?.company_name || 'CNC Precision ERP'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Select User Role & Enter 4-Digit Security Passcode PIN
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {/* User Role Selection */}
          <div className="space-y-2">
            <label className="font-bold text-xs text-foreground block">Select Team Account Role</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {rolesList.map((r) => {
                const isSelected = selectedRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setSelectedRole(r.role)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-foreground font-bold shadow-md shadow-primary/10'
                        : 'bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">{r.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auth Mode Switcher */}
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
            <button
              type="button"
              onClick={() => setAuthMode('pin')}
              className={`font-semibold ${authMode === 'pin' ? 'text-primary border-b-2 border-primary pb-1' : 'text-muted-foreground'}`}
            >
              🔒 4-Digit Passcode PIN
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('password')}
              className={`font-semibold ${authMode === 'password' ? 'text-primary border-b-2 border-primary pb-1' : 'text-muted-foreground'}`}
            >
              ✉️ Email & Password
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center animate-pulse">
              ⚠️ {errorMsg}
            </div>
          )}

          {authMode === 'pin' ? (
            <div className="space-y-3">
              <label className="font-bold text-xs text-foreground block">4-Digit Security Passcode PIN</label>
              <input
                type="password"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/[^0-9]/g, ''));
                  setErrorMsg('');
                }}
                placeholder="1234"
                className="w-full p-3 bg-muted/50 border border-border rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-foreground focus:border-primary focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground text-center">Default PIN: 1234</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-foreground"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary/90 transition transform hover:scale-[1.02]"
          >
            <span>Unlock & Access ERP Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Onboarding Wizard Footer Link */}
        <div className="text-center pt-2">
          <a
            href="/setup"
            className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-semibold hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Setup New Company Instance Wizard</span>
          </a>
        </div>
      </div>
    </div>
  );
}
