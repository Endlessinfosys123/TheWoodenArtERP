'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useErp } from '@/lib/store/ErpContext';
import { 
  LayoutDashboard, 
  Users, 
  Boxes, 
  Wrench, 
  ClipboardCheck, 
  Truck, 
  Receipt, 
  BarChart3, 
  Settings, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  rolesAllowed?: string[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, lowStockCount, pendingJobsCount, unpaidInvoicesCount } = useErp();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      label: 'Clients Master',
      href: '/clients',
      icon: Users,
      rolesAllowed: ['admin', 'production_manager', 'accounts'],
    },
    {
      label: 'Vendors Master',
      href: '/vendors',
      icon: Users,
      rolesAllowed: ['admin', 'production_manager', 'store_clerk', 'accounts'],
    },
    {
      label: 'Material & Stock',
      href: '/materials',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      rolesAllowed: ['admin', 'production_manager', 'store_clerk'],
    },
    {
      label: 'Job Orders',
      href: '/jobs',
      icon: Wrench,
      badge: pendingJobsCount > 0 ? pendingJobsCount : undefined,
    },
    {
      label: 'Shop-Floor QR Scan',
      href: '/operator',
      icon: Wrench,
      rolesAllowed: ['admin', 'production_manager', 'operator'],
    },
    {
      label: 'Quality Check (QC)',
      href: '/qc',
      icon: ClipboardCheck,
      rolesAllowed: ['admin', 'production_manager', 'qc_inspector', 'operator'],
    },
    {
      label: 'Dispatch & Challans',
      href: '/dispatch',
      icon: Truck,
      rolesAllowed: ['admin', 'production_manager', 'store_clerk', 'accounts'],
    },
    {
      label: 'Invoices & Payments',
      href: '/invoices',
      icon: Receipt,
      badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount : undefined,
      rolesAllowed: ['admin', 'accounts'],
    },
    {
      label: 'Reports & Analytics',
      href: '/reports',
      icon: BarChart3,
      rolesAllowed: ['admin', 'production_manager', 'accounts'],
    },
    {
      label: 'Settings & Company Profile',
      href: '/settings',
      icon: Settings,
      rolesAllowed: ['admin'],
    },
  ];


  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0 z-30 transition-all duration-200 no-print select-none">
      {/* Brand & Logo */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/20">
          CNC
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight text-foreground tracking-wide">
            PRECISION ERP
          </h1>
          <p className="text-[11px] text-muted-foreground font-medium">
            Job Work & Machining v1.0
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Core Modules
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const isAllowed = !item.rolesAllowed || item.rolesAllowed.includes(currentUser.role);
          const Icon = item.icon;

          if (!isAllowed) {
            return (
              <div 
                key={item.href}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-muted-foreground/40 cursor-not-allowed group relative"
                title={`Access restricted to: ${item.rolesAllowed?.join(', ')}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground/30" />
                  <span>{item.label}</span>
                </div>
                <ShieldCheck className="w-3.5 h-3.5 opacity-30" />
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role Badge Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold truncate text-foreground">{currentUser.full_name}</p>
              <p className="text-[10px] text-primary capitalize font-medium">{currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
