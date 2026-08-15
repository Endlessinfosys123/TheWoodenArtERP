'use client';

import React from 'react';
import Link from 'next/link';
import { useErp } from '@/lib/store/ErpContext';
import { 
  Wrench, 
  Boxes, 
  Receipt, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Layers,
  Plus,
  Truck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export default function DashboardPage() {
  const { 
    jobOrders, 
    clients, 
    materials, 
    invoices, 
    lowStockCount, 
    pendingJobsCount, 
    unpaidInvoicesCount 
  } = useErp();

  // Metrics
  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.total_amount, 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + inv.paid_amount, 0);
  const totalOutstanding = clients.reduce((acc, cli) => acc + cli.outstanding_balance, 0);

  // Status breakdown for Pie chart
  const statusCounts: Record<string, number> = {};
  jobOrders.forEach(j => {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  });

  const pieData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status],
  }));

  const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#64748b'];

  // Financial chart data
  const financialData = [
    { name: 'Total Invoiced', amount: totalRevenue },
    { name: 'Collected', amount: totalCollected },
    { name: 'Outstanding', amount: totalOutstanding },
  ];

  return (
    <div className="space-[#1e293b] space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Shop-Floor & Operations Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time CNC job tracking, material stock alerts, and financial overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Job Order</span>
          </Link>
          <Link
            href="/materials"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted text-xs font-medium transition"
          >
            <Boxes className="w-4 h-4 text-cyan-500" />
            <span>Material Inward</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Jobs Card */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Active Job Orders</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-foreground">{pendingJobsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-500" />
              <span>In production pipeline</span>
            </p>
          </div>
        </div>

        {/* Low Stock Alert Card */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Material Stock</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              lowStockCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
            }`}>
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-foreground">{materials.length} Materials</div>
            <p className="text-[11px] mt-1 flex items-center gap-1">
              {lowStockCount > 0 ? (
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {lowStockCount} below reorder level
                </span>
              ) : (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Stock levels healthy
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Total Invoiced Card */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Revenue (Invoiced)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-foreground">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>₹{totalCollected.toLocaleString('en-IN')} Collected</span>
            </p>
          </div>
        </div>

        {/* Outstanding Receivables Card */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-foreground">₹{totalOutstanding.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-rose-500 font-medium mt-1">
              {unpaidInvoicesCount} Pending Client Invoice(s)
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Workflow Status Breakdown Chart */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between lg:col-span-1">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              Job Status Breakdown
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Distribution across production stages</p>
          </div>
          <div className="h-64 my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-border pt-3">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="truncate text-muted-foreground">{item.name}:</span>
                <span className="font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Revenue Overview Bar Chart */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Financial Revenue & Payment Collection
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Invoiced vs Payment Received vs Receivables</p>
          </div>
          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="amount" fill="#0284c7" radius={[6, 6, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
            <span>GST-compliant invoicing series active</span>
            <Link href="/invoices" className="text-primary font-medium hover:underline flex items-center gap-1">
              View All Invoices <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Job Orders Table */}
      <div className="p-5 rounded-xl bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Recent Job Orders</h3>
            <p className="text-[11px] text-muted-foreground">Live tracking of CNC machining jobs</p>
          </div>
          <Link href="/jobs" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            View All Jobs <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-3">Job No</th>
                <th className="p-3">Client</th>
                <th className="p-3">Part Name</th>
                <th className="p-3">Material Source</th>
                <th className="p-3">Assigned Machine</th>
                <th className="p-3">Status</th>
                <th className="p-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobOrders.map((job) => (
                <tr key={job.id} className="hover:bg-muted/30 transition">
                  <td className="p-3 font-bold text-primary">{job.job_no}</td>
                  <td className="p-3 font-medium text-foreground">{job.client_name}</td>
                  <td className="p-3 text-foreground">{job.part_name} <span className="text-[10px] text-muted-foreground">({job.qty} pcs)</span></td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      job.material_source === 'client_supplied'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {job.material_source === 'client_supplied' ? 'Client Job Work' : 'Own Stock'}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{job.machine_name || 'Unassigned'}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {job.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{job.due_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
