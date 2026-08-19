'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { UserRole } from '@/types';
import { 
  Search, 
  Bell, 
  Moon, 
  Sun, 
  UserCheck, 
  PlusCircle, 
  AlertTriangle,
  Clock,
  DollarSign,
  Database,
  Lock
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/db';

export default function Header() {
  const { 
    currentUser, 
    setUserRole, 
    lockErp,
    lowStockCount, 
    pendingJobsCount, 
    unpaidInvoicesCount 
  } = useErp();

  const [isDark, setIsDark] = useState<boolean>(true);
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const isDbLive = isSupabaseConfigured();

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Ensure default dark class on mount
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const rolesList: { role: UserRole; label: string; desc: string }[] = [
    { role: 'admin', label: 'Admin / Owner', desc: 'Full access to all 7 ERP modules & settings' },
    { role: 'production_manager', label: 'Production Manager', desc: 'Job orders, machine load & drawing approval' },
    { role: 'store_clerk', label: 'Store / Inventory', desc: 'Separate stock pools, GRN inward & issue' },
    { role: 'qc_inspector', label: 'QC Inspector', desc: 'Stage 5 inspections, pass/fail & rework loop' },
    { role: 'accounts', label: 'Accounts & Billing', desc: 'GST invoices, delivery challans & ledgers' },
    { role: 'operator', label: 'Shop Floor Operator', desc: 'Mobile QR scanner & quick stage update' },
  ];


  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 no-print">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-72">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search job no, client, part name..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Supabase Database Connection Status Indicator */}
        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
          isDbLive 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span>{isDbLive ? 'Supabase Live' : 'Demo Local Mode'}</span>
        </div>
        {/* Role Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Role: <strong className="capitalize">{currentUser.role.replace('_', ' ')}</strong></span>
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1.5 text-[11px] font-bold text-muted-foreground uppercase border-b border-border mb-1">
                Switch Active Role (RBAC Test)
              </div>
              <div className="space-y-1">
                {rolesList.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      setUserRole(r.role);
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex flex-col ${
                      currentUser.role === r.role
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>{r.label}</span>
                    <span className={`text-[10px] ${currentUser.role === r.role ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {r.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <Bell className="w-4 h-4" />
            {(lowStockCount > 0 || unpaidInvoicesCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl p-3 z-50">
              <h4 className="text-xs font-bold text-foreground border-b border-border pb-2 mb-2 flex items-center justify-between">
                <span>System Alerts & Notifications</span>
                <span className="text-[10px] text-muted-foreground">Live</span>
              </h4>
              <div className="space-y-2 text-xs">
                {lowStockCount > 0 && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{lowStockCount} Material(s) Low Stock</p>
                      <p className="text-[11px] opacity-90">Stock levels below reorder thresholds.</p>
                    </div>
                  </div>
                )}
                {unpaidInvoicesCount > 0 && (
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start gap-2">
                    <DollarSign className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{unpaidInvoicesCount} Pending Invoices</p>
                      <p className="text-[11px] opacity-90">Outstanding payment collection required.</p>
                    </div>
                  </div>
                )}
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{pendingJobsCount} Active Jobs in Shop-floor</p>
                    <p className="text-[11px] opacity-90">In machining / quality check stages.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lock Screen Button */}
        <button
          onClick={lockErp}
          className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition flex items-center gap-1.5 text-xs font-semibold"
          title="Lock ERP Screen (PIN Protection)"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Lock Screen</span>
        </button>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
}
