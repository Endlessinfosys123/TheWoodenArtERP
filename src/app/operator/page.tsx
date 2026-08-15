'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { JobOrder, JobStatus } from '@/types';
import { 
  QrCode, 
  Search, 
  Wrench, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Layers, 
  Smartphone, 
  Send,
  User,
  ShieldCheck
} from 'lucide-react';

export default function OperatorPage() {
  const { jobOrders, updateJobStatus, currentUser } = useErp();
  const [scanInput, setScanInput] = useState('');
  const [scannedJob, setScannedJob] = useState<JobOrder | null>(jobOrders[0] || null);
  const [stageRemarks, setStageRemarks] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const term = scanInput.trim().toLowerCase();
    const found = jobOrders.find(j => 
      j.job_no.toLowerCase().includes(term) || 
      j.qr_code_token.toLowerCase().includes(term) ||
      j.part_name.toLowerCase().includes(term)
    );

    if (found) {
      setScannedJob(found);
      setSuccessMessage(`Job Card ${found.job_no} loaded successfully!`);
    } else {
      setSuccessMessage('No matching Job Card found for scanned code.');
    }
  };

  const handleQuickStatusUpdate = (newStatus: JobStatus) => {
    if (!scannedJob) return;

    updateJobStatus(scannedJob.id, newStatus, stageRemarks || `Shop floor update by ${currentUser.full_name}`);
    setSuccessMessage(`Updated Stage to "${newStatus}" for ${scannedJob.job_no}`);
    setStageRemarks('');

    // Refresh scanned job object
    const updated = jobOrders.find(j => j.id === scannedJob.id);
    if (updated) setScannedJob({ ...updated, status: newStatus });
  };

  const stagesList: JobStatus[] = [
    'Order Received', 
    'Material Allocated', 
    'Programming', 
    'Machining', 
    'Quality Check', 
    'Rework',
    'Ready for Dispatch', 
    'Delivered'
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Mobile Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 tracking-wider">
            Shop-Floor Mobile Scanner
          </span>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Smartphone className="w-5 h-5" /> Shop-Floor Operator Portal
          </h1>
          <p className="text-xs text-cyan-100">
            Operator: <strong>{currentUser.full_name}</strong> ({currentUser.role.replace('_', ' ')})
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
          <QrCode className="w-7 h-7 text-white" />
        </div>
      </div>

      {/* QR Code / Job Token Scanner Box */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          <QrCode className="w-4 h-4 text-cyan-500" /> Scan QR Job Card or Enter Token
        </h3>

        <form onSubmit={handleScanSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan QR token or type JOB-2026-001..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-muted/50 border border-border rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition"
          >
            Scan & Load
          </button>
        </form>

        {/* Quick Sample Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Quick Select:</span>
          {jobOrders.slice(0, 3).map(j => (
            <button
              key={j.id}
              onClick={() => {
                setScannedJob(j);
                setSuccessMessage(`Loaded ${j.job_no}`);
              }}
              className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary font-mono text-[11px] border border-border"
            >
              {j.job_no}
            </button>
          ))}
        </div>

        {successMessage && (
          <p className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMessage}
          </p>
        )}
      </div>

      {/* Scanned Job Card Details & Quick Stage Buttons */}
      {scannedJob ? (
        <div className="p-6 rounded-2xl bg-card border border-border shadow-lg space-y-6">
          {/* Job Overview Header */}
          <div className="border-b border-border pb-4 flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-xs font-extrabold text-primary px-2.5 py-1 rounded bg-primary/10 border border-primary/20">
                {scannedJob.job_no}
              </span>
              <h2 className="text-lg font-bold text-foreground mt-2">{scannedJob.part_name}</h2>
              <p className="text-xs text-muted-foreground">{scannedJob.client_name} | Qty: <strong className="text-foreground">{scannedJob.qty} Pcs</strong></p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Current Stage</span>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 inline-block mt-1">
                {scannedJob.status}
              </span>
            </div>
          </div>

          {/* Machine & Tolerance Specs */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-4 rounded-xl border border-border">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">CNC Machine</span>
              <span className="text-foreground font-semibold flex items-center gap-1 mt-0.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-500" /> {scannedJob.machine_name || 'Unassigned'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Est Setup / Cycle</span>
              <span className="text-foreground font-semibold flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> {scannedJob.estimated_setup_min}m / {scannedJob.estimated_cycle_min}m
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Special Tolerances / Notes</span>
              <p className="text-muted-foreground italic mt-0.5">{scannedJob.notes || 'Standard tolerances apply.'}</p>
            </div>
          </div>

          {/* Direct Shop Floor Stage Update Buttons */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" /> Update Production Stage (Shop Floor Action)
            </h4>

            <div className="space-y-2">
              <input
                type="text"
                value={stageRemarks}
                onChange={(e) => setStageRemarks(e.target.value)}
                placeholder="Optional remarks (e.g. Roughing complete, machine setup ready)..."
                className="w-full p-2.5 text-xs bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stagesList.map((st) => {
                  const isCurrent = scannedJob.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleQuickStatusUpdate(st)}
                      className={`p-3 rounded-xl text-xs font-bold transition flex flex-col items-center text-center justify-center gap-1 ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40'
                          : 'bg-muted/60 text-foreground hover:bg-primary/10 hover:text-primary border border-border'
                      }`}
                    >
                      <span className="text-[11px] leading-tight">{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Audit Log Trail */}
          <div className="border-t border-border pt-4 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Stage Audit History</h4>
            <div className="space-y-1.5">
              {scannedJob.audit_logs?.map(log => (
                <div key={log.id} className="p-2 rounded-lg bg-muted/20 border border-border text-[11px] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground">{log.stage}</span>
                    <span className="text-muted-foreground ml-2">by {log.user_name} ({log.remarks || 'Stage updated'})</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">{log.timestamp.split('T')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
