'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { JobOrder, JobStatus, JobPriority, MaterialSourceType, JobFile, SubOperation } from '@/types';
import QRCodeGen from '@/components/jobs/QRCodeGen';
import DrawingVaultModal from '@/components/drawings/DrawingVaultModal';
import { 
  Wrench, 
  Plus, 
  Search, 
  FileCode2, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  QrCode, 
  Printer, 
  Clock, 
  User, 
  Cpu, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Upload,
  Eye,
  Layers,
  Sparkles,
  BarChart2,
  Calendar,
  RotateCcw,
  CheckSquare
} from 'lucide-react';

export default function JobsPage() {
  const { 
    jobOrders, 
    clients, 
    materials, 
    machines, 
    createJobOrder, 
    updateJobStatus, 
    addSubOperation,
    updateSubOpStatus,
    currentUser 
  } = useErp();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'machine_load'>('pipeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<JobOrder | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJobCardModalOpen, setIsJobCardModalOpen] = useState(false);
  const [isDrawingVaultOpen, setIsDrawingVaultOpen] = useState(false);

  // New Job Order Form
  const [jobForm, setJobForm] = useState({
    client_id: clients[0]?.id || '',
    po_ref: 'PO-2026-991',
    part_name: '',
    part_number: '',
    drawing_ref: '',
    qty: 1,
    material_id: materials[0]?.id || '',
    material_source: 'own_stock' as MaterialSourceType,
    batch_no: '',
    heat_no: '',
    machine_id: machines[0]?.id || '',
    operator_id: 'usr-3',
    priority: 'Medium' as JobPriority,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    estimated_setup_min: 60,
    estimated_cycle_min: 30,
    notes: '',
  });

  const statuses: JobStatus[] = [
    'Order Received', 
    'Material Allocated', 
    'Programming', 
    'Machining', 
    'Quality Check', 
    'Rework',
    'Ready for Dispatch', 
    'Delivered'
  ];

  const filteredJobs = jobOrders.filter(j => {
    const matchesSearch = 
      j.job_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.client_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.client_id || !jobForm.part_name || !jobForm.material_id) return;

    createJobOrder({
      ...jobForm,
      qty: Number(jobForm.qty),
      estimated_setup_min: Number(jobForm.estimated_setup_min),
      estimated_cycle_min: Number(jobForm.estimated_cycle_min),
      actual_setup_min: 0,
      actual_cycle_min: 0,
      status: 'Order Received',
    });

    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            Job Orders & 7-Stage Production Tracker
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full lifecycle 7-stage shop floor tracking, machine load board, sub-operations, and printable QR job cards.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Job Order</span>
        </button>
      </div>

      {/* Tabs & Workflow Pipeline Filter */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'pipeline'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>7-Stage Pipeline Board</span>
            </button>
            <button
              onClick={() => setActiveTab('machine_load')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'machine_load'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Machine Load & Utilization View</span>
            </button>
          </div>

          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search job no, part name, client..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        {/* 7-Stage Quick Pipeline Filter Pills */}
        {activeTab === 'pipeline' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-border pt-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              All Stages ({jobOrders.length})
            </button>
            {statuses.map(s => {
              const count = jobOrders.filter(j => j.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span>{s}</span>
                  {count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab 1: 7-Stage Job Cards Pipeline Grid */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 transition flex flex-col justify-between"
            >
              <div>
                {/* Header: Job No & Priority */}
                <div className="flex items-start justify-between gap-3 border-b border-border pb-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-primary font-mono">{job.job_no}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        job.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        job.priority === 'High' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {job.priority} Priority
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground mt-1">{job.part_name}</h3>
                    <p className="text-xs text-muted-foreground font-medium">{job.client_name} (PO: {job.po_ref})</p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setIsJobCardModalOpen(true);
                    }}
                    className="p-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground flex items-center gap-1.5 text-xs font-semibold transition"
                    title="Printable Job Card with QR Code"
                  >
                    <QrCode className="w-4 h-4 text-cyan-500" />
                    <span>Print QR Card</span>
                  </button>
                </div>

                {/* Technical Specs */}
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Drawing Ref</span>
                    <span className="font-mono text-foreground font-semibold">{job.drawing_ref || 'N/A'} (v{job.drawing_version || 1})</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Quantity</span>
                    <span className="font-bold text-foreground">{job.qty} Pieces</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Assigned Machine</span>
                    <span className="text-foreground font-medium flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-cyan-500" /> {job.machine_name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Batch / Heat No</span>
                    <span className="font-mono text-foreground">{job.batch_no || 'BAT-01'}</span>
                  </div>
                </div>

                {/* 7-Stage Stage Switcher Bar */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">7-Stage Pipeline:</span>
                  <select
                    value={job.status}
                    onChange={(e) => updateJobStatus(job.id, e.target.value as JobStatus)}
                    className="px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary border border-primary/30 rounded-lg focus:ring-1 focus:ring-primary"
                  >
                    {statuses.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Card Footer: Drawings Vault Link */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs font-medium text-foreground">
                    {job.files?.length || 0} File Attachment(s)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedJob(job);
                    setIsDrawingVaultOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-primary flex items-center gap-1 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Drawing Vault & 3D CAD</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Machine Load & Utilization Gantt View */}
      {activeTab === 'machine_load' && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-500" /> CNC Machine Load & Utilization Board
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live setup & machining times, active machine queue, planned vs actual cycle times.
            </p>
          </div>

          <div className="space-y-4">
            {machines.map(mac => {
              const assignedJobs = jobOrders.filter(j => j.machine_id === mac.id && j.status !== 'Delivered');
              const totalEstHours = assignedJobs.reduce((acc, j) => acc + ((j.estimated_setup_min + (j.estimated_cycle_min * j.qty)) / 60), 0);
              const utilPercent = Math.min(100, Math.round((totalEstHours / mac.capacity_hours_per_day) * 100));

              return (
                <div key={mac.id} className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold font-mono">
                        {mac.code}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{mac.name}</h4>
                        <p className="text-xs text-muted-foreground">{mac.machine_type} | Hourly Rate: ₹{mac.hourly_rate}/hr</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Load Utilization</span>
                        <span className="font-extrabold text-sm text-primary">{utilPercent}% ({totalEstHours.toFixed(1)} hrs loaded)</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        mac.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {mac.status}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        utilPercent > 90 ? 'bg-rose-500' : utilPercent > 70 ? 'bg-amber-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${utilPercent}%` }}
                    />
                  </div>

                  {/* Queue Jobs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {assignedJobs.map(j => (
                      <div key={j.id} className="p-2.5 rounded-lg bg-card border border-border text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary">{j.job_no}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-muted">{j.status}</span>
                        </div>
                        <p className="font-medium text-foreground truncate">{j.part_name}</p>
                        <p className="text-[10px] text-muted-foreground">Setup: {j.estimated_setup_min}m | Cycle: {j.estimated_cycle_min}m/pc</p>
                      </div>
                    ))}
                    {assignedJobs.length === 0 && (
                      <p className="text-xs text-muted-foreground italic col-span-3">No active jobs queued on this machine.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Job Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" /> Create New CNC Job Order
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Select Client *</label>
                  <select
                    value={jobForm.client_id}
                    onChange={(e) => setJobForm({ ...jobForm, client_id: e.target.value })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Client PO Reference</label>
                  <input
                    type="text"
                    value={jobForm.po_ref}
                    onChange={(e) => setJobForm({ ...jobForm, po_ref: e.target.value })}
                    placeholder="PO-2026-991"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Part Name / Component *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.part_name}
                    onChange={(e) => setJobForm({ ...jobForm, part_name: e.target.value })}
                    placeholder="e.g. Hydraulic Aerospace Flange"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Drawing Ref Number</label>
                  <input
                    type="text"
                    value={jobForm.drawing_ref}
                    onChange={(e) => setJobForm({ ...jobForm, drawing_ref: e.target.value })}
                    placeholder="DWG-904-REV2"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Quantity (Pieces) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={jobForm.qty}
                    onChange={(e) => setJobForm({ ...jobForm, qty: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Material Required *</label>
                  <select
                    value={jobForm.material_id}
                    onChange={(e) => setJobForm({ ...jobForm, material_id: e.target.value })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  >
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.grade})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Material Source Pool</label>
                  <select
                    value={jobForm.material_source}
                    onChange={(e) => setJobForm({ ...jobForm, material_source: e.target.value as MaterialSourceType })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  >
                    <option value="own_stock">Company Own Stock (Valued)</option>
                    <option value="client_supplied">Client-Supplied Free Issue (Job Work)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Assign CNC Machine</label>
                  <select
                    value={jobForm.machine_id}
                    onChange={(e) => setJobForm({ ...jobForm, machine_id: e.target.value })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  >
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
                >
                  Create & Generate Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable QR Job Card Modal */}
      {isJobCardModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 no-print">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-500" />
                Shop-Floor Printable Job Card
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print Card
                </button>
                <button onClick={() => setIsJobCardModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-6 bg-white text-slate-900 rounded-xl border-2 border-slate-900 space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">PRECISION CNC JOB CARD</h2>
                  <p className="text-xs font-bold text-slate-600">JOB NO: {selectedJob.job_no} | PO: {selectedJob.po_ref}</p>
                </div>

                {/* Real SVG QR Code */}
                <div className="text-center">
                  <QRCodeGen value={selectedJob.qr_code_token} size={85} />
                  <span className="text-[9px] font-mono font-bold block mt-1 text-slate-700">{selectedJob.qr_code_token.substring(0, 14)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-semibold text-slate-800">
                <p><strong>Client:</strong> {selectedJob.client_name}</p>
                <p><strong>Part Name:</strong> {selectedJob.part_name}</p>
                <p><strong>Drawing Ref:</strong> {selectedJob.drawing_ref || 'N/A'}</p>
                <p><strong>Quantity:</strong> {selectedJob.qty} Pcs</p>
                <p><strong>Machine Assigned:</strong> {selectedJob.machine_name}</p>
                <p><strong>Material Pool:</strong> {selectedJob.material_source === 'client_supplied' ? 'Client Free Issue' : 'Own Stock'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Vault Launcher Modal */}
      {isDrawingVaultOpen && selectedJob && (
        <DrawingVaultModal job={selectedJob} onClose={() => setIsDrawingVaultOpen(false)} />
      )}
    </div>
  );
}
