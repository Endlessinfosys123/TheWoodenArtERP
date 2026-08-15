'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { 
  BarChart3, 
  Download, 
  Search, 
  FileSpreadsheet, 
  Wrench, 
  Boxes, 
  Cpu, 
  ClipboardCheck, 
  Users, 
  Receipt,
  Calendar,
  Layers,
  Filter
} from 'lucide-react';

export default function ReportsPage() {
  const { jobOrders, materials, materialInwards, machines, qcChecks, clients, invoices } = useErp();
  const [activeReport, setActiveReport] = useState<string>('job_status');

  // CSV Exporter Helper
  const downloadCSV = (filename: string, rows: string[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export GST Sales Register to CSV
  const exportGstRegister = () => {
    const rows = [
      ['Invoice No', 'Financial Year', 'Client Name', 'GSTIN', 'Invoice Type', 'Subtotal (INR)', 'CGST (INR)', 'SGST (INR)', 'IGST (INR)', 'Total Amount (INR)', 'Status'],
      ...invoices.map(i => [
        i.invoice_no,
        i.financial_year,
        `"${i.client_name}"`,
        i.client_gstin || 'N/A',
        i.invoice_type,
        i.subtotal.toString(),
        i.cgst_amount.toString(),
        i.sgst_amount.toString(),
        i.igst_amount.toString(),
        i.total_amount.toString(),
        i.status,
      ])
    ];
    downloadCSV('GSTR1_Sales_Register_FY26-27', rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Executive Reports & Analytics Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Production pipelines, material consumption, machine utilization, QC pareto, client ledgers, & GSTR-1 sales filing exports.
          </p>
        </div>

        <button
          onClick={exportGstRegister}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow-md hover:bg-emerald-700 transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export GSTR-1 Sales Register (CSV)</span>
        </button>
      </div>

      {/* Reports Selector Tabs */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'job_status', label: 'Job Order Status Report', icon: Wrench },
          { id: 'material_consumption', label: 'Material Consumption (Own vs Client)', icon: Boxes },
          { id: 'machine_utilization', label: 'Machine Utilization %', icon: Cpu },
          { id: 'qc_reject', label: 'QC Reject / Rework Pareto', icon: ClipboardCheck },
          { id: 'client_ledger', label: 'Client Aging Ledger', icon: Users },
          { id: 'gst_register', label: 'GST Sales Register', icon: Receipt },
        ].map(r => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 transition ${
                activeReport === r.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report 1: Job Order Status Report */}
      {activeReport === 'job_status' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">7-Stage Job Order Production Pipeline</h3>
            <button
              onClick={() => downloadCSV('Job_Status_Report', [
                ['Job No', 'Client', 'Part Name', 'Material Pool', 'Machine', 'Status', 'Due Date'],
                ...jobOrders.map(j => [j.job_no, `"${j.client_name}"`, `"${j.part_name}"`, j.material_source, j.machine_name || 'N/A', j.status, j.due_date])
              ])}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-primary flex items-center gap-1.5 hover:bg-muted"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Job No</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Part Name</th>
                  <th className="p-3">Material Source</th>
                  <th className="p-3">Assigned CNC</th>
                  <th className="p-3">Stage Status</th>
                  <th className="p-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobOrders.map(j => (
                  <tr key={j.id} className="hover:bg-muted/30">
                    <td className="p-3 font-bold text-primary">{j.job_no}</td>
                    <td className="p-3 font-medium text-foreground">{j.client_name}</td>
                    <td className="p-3 text-foreground">{j.part_name} ({j.qty} Pcs)</td>
                    <td className="p-3 capitalize text-muted-foreground">{j.material_source.replace('_', ' ')}</td>
                    <td className="p-3 text-muted-foreground">{j.machine_name || 'Unassigned'}</td>
                    <td className="p-3 font-bold text-cyan-400">{j.status}</td>
                    <td className="p-3 text-muted-foreground">{j.due_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Material Consumption Report */}
      {activeReport === 'material_consumption' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Material Consumption Breakdown (Own Stock vs Client Supplied)</h3>
            <button
              onClick={() => downloadCSV('Material_Consumption_Report', [
                ['Material', 'Grade', 'Current Stock', 'Own Cost Unit', 'Total Valuation'],
                ...materials.map(m => [m.name, m.grade, `${m.current_stock} ${m.unit}`, m.unit_cost.toString(), (m.current_stock * m.unit_cost).toString()])
              ])}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-primary flex items-center gap-1.5 hover:bg-muted"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Material Name & Grade</th>
                  <th className="p-3">HSN Code</th>
                  <th className="p-3">Own Stock Qty</th>
                  <th className="p-3">Reorder Threshold</th>
                  <th className="p-3">Unit Cost (₹)</th>
                  <th className="p-3">Inventory Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materials.map(m => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="p-3 font-bold text-foreground">{m.name} ({m.grade})</td>
                    <td className="p-3 font-mono text-muted-foreground">{m.hsn_code}</td>
                    <td className="p-3 font-extrabold text-foreground">{m.current_stock} {m.unit}</td>
                    <td className="p-3 text-muted-foreground">{m.reorder_level} {m.unit}</td>
                    <td className="p-3 text-foreground">₹{m.unit_cost}</td>
                    <td className="p-3 font-bold text-emerald-500">₹{(m.current_stock * m.unit_cost).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 3: Machine Utilization Report */}
      {activeReport === 'machine_utilization' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">CNC Machine Utilization & Queue Load</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.map(mac => {
              const assigned = jobOrders.filter(j => j.machine_id === mac.id);
              const loadedHours = assigned.reduce((acc, j) => acc + ((j.estimated_setup_min + (j.estimated_cycle_min * j.qty)) / 60), 0);
              const util = Math.min(100, Math.round((loadedHours / mac.capacity_hours_per_day) * 100));

              return (
                <div key={mac.id} className="p-4 rounded-xl bg-muted/20 border border-border space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-foreground">
                    <span>{mac.name} ({mac.code})</span>
                    <span className="text-cyan-400">{util}% Loaded</span>
                  </div>
                  <p className="text-muted-foreground">Queued Jobs: {assigned.length} | Rate: ₹{mac.hourly_rate}/hr</p>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${util}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report 4: QC Reject Pareto */}
      {activeReport === 'qc_reject' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">QC Reject & Rework Pareto Report</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Job No</th>
                  <th className="p-3">Part Name</th>
                  <th className="p-3">Inspector</th>
                  <th className="p-3">Passed / Failed</th>
                  <th className="p-3">Defect Category</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {qcChecks.map(q => (
                  <tr key={q.id} className="hover:bg-muted/30">
                    <td className="p-3 font-bold text-primary">{q.job_no}</td>
                    <td className="p-3 font-medium text-foreground">{q.part_name}</td>
                    <td className="p-3 text-muted-foreground">{q.inspector_name}</td>
                    <td className="p-3 font-bold">{q.passed_qty} / <span className="text-rose-500">{q.failed_qty}</span></td>
                    <td className="p-3 text-muted-foreground">{q.defect_category || 'N/A'}</td>
                    <td className="p-3 uppercase font-bold text-cyan-400">{q.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 5: Client Aging Ledger */}
      {activeReport === 'client_ledger' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Client Outstanding Aging Summary</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Client Company Name</th>
                  <th className="p-3">Credit Limit</th>
                  <th className="p-3">Payment Due Days</th>
                  <th className="p-3">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="p-3 font-bold text-foreground">{c.company_name}</td>
                    <td className="p-3 font-medium text-muted-foreground">₹{c.credit_limit.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-muted-foreground">{c.payment_due_days} Days Net</td>
                    <td className="p-3 font-extrabold text-rose-500">₹{c.outstanding_balance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 6: GST Sales Register */}
      {activeReport === 'gst_register' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">GSTR-1 Taxable Sales Register (FY 2026-27)</h3>
            <button
              onClick={exportGstRegister}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow flex items-center gap-1.5 hover:bg-emerald-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Download GSTR-1 CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Client Name & GSTIN</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Subtotal</th>
                  <th className="p-3">CGST (9%)</th>
                  <th className="p-3">SGST (9%)</th>
                  <th className="p-3">IGST (18%)</th>
                  <th className="p-3">Total Invoice Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="p-3 font-bold text-primary font-mono">{inv.invoice_no}</td>
                    <td className="p-3 font-medium text-foreground">{inv.client_name} <span className="text-[10px] text-muted-foreground block font-mono">GSTIN: {inv.client_gstin || '27AAACA1234A1Z5'}</span></td>
                    <td className="p-3 capitalize text-muted-foreground">{inv.invoice_type.replace('_', ' ')}</td>
                    <td className="p-3 font-semibold text-foreground">₹{inv.subtotal.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-muted-foreground">₹{inv.cgst_amount.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-muted-foreground">₹{inv.sgst_amount.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-muted-foreground">₹{inv.igst_amount.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-extrabold text-foreground">₹{inv.total_amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
