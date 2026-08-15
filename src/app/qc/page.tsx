'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { QCCheck, QCChecklistItem, JobOrder } from '@/types';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RotateCcw, 
  FileText, 
  Image as ImageIcon, 
  X, 
  BarChart2, 
  User, 
  Calendar,
  Layers,
  Wrench
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

export default function QcPage() {
  const { qcChecks, jobOrders, currentUser, addQCCheck } = useErp();
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [selectedQc, setSelectedQc] = useState<QCCheck | null>(null);

  // New Inspection Form
  const [inspectionForm, setInspectionForm] = useState({
    job_order_id: jobOrders[0]?.id || '',
    inspected_qty: 10,
    passed_qty: 10,
    failed_qty: 0,
    result: 'pass' as QCCheck['result'],
    defect_category: 'Dimensional Out-of-Tolerance' as QCCheck['defect_category'],
    rework_instructions: '',
    root_cause: '',
    photo_urls: [] as string[],
    checklist_json: [
      { id: 'p-1', parameter: 'Outer Diameter (150mm)', expected: '150 ±0.05mm', actual: '150.02mm', passed: true },
      { id: 'p-2', parameter: 'Bore Diameter (45mm)', expected: '45.00 +0.02/-0.00mm', actual: '45.01mm', passed: true },
      { id: 'p-3', parameter: 'Surface Roughness (Ra)', expected: 'Ra 0.8', actual: 'Ra 0.6', passed: true },
    ] as QCChecklistItem[],
  });

  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  const filteredQc = qcChecks.filter(qc => {
    const matchesSearch = 
      (qc.job_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (qc.part_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (qc.client_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesResult = resultFilter === 'all' || qc.result === resultFilter;
    return matchesSearch && matchesResult;
  });

  // Calculate Reject Rate %
  const totalInspected = qcChecks.reduce((acc, q) => acc + q.inspected_qty, 0);
  const totalPassed = qcChecks.reduce((acc, q) => acc + q.passed_qty, 0);
  const totalFailed = qcChecks.reduce((acc, q) => acc + q.failed_qty, 0);
  const passRate = totalInspected > 0 ? ((totalPassed / totalInspected) * 100).toFixed(1) : '100.0';

  // Pareto Defect Breakdown Data
  const defectCounts: Record<string, number> = {};
  qcChecks.forEach(q => {
    if (q.defect_category) {
      defectCounts[q.defect_category] = (defectCounts[q.defect_category] || 0) + q.failed_qty;
    }
  });

  const paretoData = Object.keys(defectCounts).map(cat => ({
    category: cat,
    count: defectCounts[cat],
  }));

  const handleChecklistChange = (index: number, field: keyof QCChecklistItem, value: any) => {
    const updated = [...inspectionForm.checklist_json];
    updated[index] = { ...updated[index], [field]: value };

    // Auto calculate passed state
    if (field === 'passed') {
      const allPassed = updated.every(item => item.passed);
      setInspectionForm(prev => ({
        ...prev,
        checklist_json: updated,
        result: allPassed ? 'pass' : 'rework',
        failed_qty: allPassed ? 0 : 1,
        passed_qty: allPassed ? prev.inspected_qty : prev.inspected_qty - 1,
      }));
    } else {
      setInspectionForm(prev => ({ ...prev, checklist_json: updated }));
    }
  };

  const handleAddParameter = () => {
    setInspectionForm(prev => ({
      ...prev,
      checklist_json: [
        ...prev.checklist_json,
        { id: `p-${Date.now()}`, parameter: 'New Parameter', expected: 'Spec', actual: 'Measured', passed: true },
      ],
    }));
  };

  const handleInspectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionForm.job_order_id) return;

    addQCCheck({
      ...inspectionForm,
      inspector_name: currentUser.full_name,
      inspected_qty: Number(inspectionForm.inspected_qty),
      passed_qty: Number(inspectionForm.passed_qty),
      failed_qty: Number(inspectionForm.failed_qty),
    });

    setIsInspectionModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            Quality Check (QC) & Stage 6 Rework Loop
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configurable dimensional & visual parameter checklists. Automatic Rework routing on failure, root-cause logging, & defect Pareto analytics.
          </p>
        </div>
        <button
          onClick={() => setIsInspectionModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Stage 5 Inspection Entry</span>
        </button>
      </div>

      {/* QC Metrics KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Quantity Inspected</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{totalInspected} Pcs</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">QC First-Pass Yield %</span>
          <div className="text-2xl font-extrabold text-emerald-500 mt-1">{passRate}%</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Rejected / Rework Pcs</span>
          <div className="text-2xl font-extrabold text-rose-500 mt-1">{totalFailed} Pcs</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Pending Stage 5 QC Jobs</span>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1">
            {jobOrders.filter(j => j.status === 'Quality Check' || j.status === 'Rework').length} Jobs
          </div>
        </div>
      </div>

      {/* Defect Pareto Chart & Filter Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pareto Chart */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-rose-500" /> Defect Pareto Category Analysis
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Distribution of manufacturing defect root causes</p>
          </div>

          <div className="h-48 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paretoData.length > 0 ? paretoData : [{ category: 'Dimensional', count: 2 }, { category: 'Surface Finish', count: 1 }]}>
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* QC Records Table */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search QC entry by job no, part name, client..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>

            <div className="flex items-center gap-2">
              {['all', 'pass', 'rework', 'fail'].map(r => (
                <button
                  key={r}
                  onClick={() => setResultFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    resultFilter === r
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Job No</th>
                  <th className="p-3">Part Name & Client</th>
                  <th className="p-3">Inspector</th>
                  <th className="p-3">Qty (Pass/Fail)</th>
                  <th className="p-3">QC Result</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Checklist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQc.map((qc) => (
                  <tr key={qc.id} className="hover:bg-muted/30 transition">
                    <td className="p-3 font-bold text-primary">{qc.job_no}</td>
                    <td className="p-3">
                      <p className="font-bold text-foreground">{qc.part_name}</p>
                      <p className="text-[10px] text-muted-foreground">{qc.client_name}</p>
                    </td>
                    <td className="p-3 text-muted-foreground">{qc.inspector_name}</td>
                    <td className="p-3">
                      <span className="font-bold text-emerald-500">{qc.passed_qty} Passed</span> /{' '}
                      <span className="font-bold text-rose-500">{qc.failed_qty} Failed</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        qc.result === 'pass' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        qc.result === 'rework' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {qc.result}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{qc.checked_at.split('T')[0]}</td>
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedQc(qc)}
                        className="px-2.5 py-1 rounded bg-muted hover:bg-primary/10 text-primary font-semibold text-[11px] border border-border"
                      >
                        Inspect Parameter Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New QC Inspection Modal */}
      {isInspectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" /> Stage 5 Quality Inspection Entry
              </h3>
              <button onClick={() => setIsInspectionModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInspectionSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Select Job Order to Inspect *</label>
                  <select
                    value={inspectionForm.job_order_id}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, job_order_id: e.target.value })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  >
                    {jobOrders.map(j => (
                      <option key={j.id} value={j.id}>{j.job_no} — {j.part_name} ({j.client_name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Inspected Qty (Pcs) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={inspectionForm.inspected_qty}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspected_qty: Number(e.target.value) })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">QC Decision *</label>
                  <select
                    value={inspectionForm.result}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, result: e.target.value as any })}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-bold"
                  >
                    <option value="pass">PASS (Move to Stage 7 Ready for Dispatch)</option>
                    <option value="rework">REWORK (Loop-back to Stage 6 Rework)</option>
                    <option value="fail">FAIL / SCRAP</option>
                  </select>
                </div>
              </div>

              {/* Rework Defect Fields */}
              {inspectionForm.result !== 'pass' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <h4 className="font-bold text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Rework & Root-Cause Logging
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Defect Category</label>
                      <select
                        value={inspectionForm.defect_category}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, defect_category: e.target.value as any })}
                        className="w-full p-2 bg-card border border-border rounded text-foreground"
                      >
                        <option value="Dimensional Out-of-Tolerance">Dimensional Out-of-Tolerance</option>
                        <option value="Surface Roughness">Surface Roughness (Ra High)</option>
                        <option value="Burrs / Chipping">Burrs / Edge Chipping</option>
                        <option value="Material Flaw">Raw Material Flaw / Porosity</option>
                        <option value="Tool Wear Marks">Tool Wear / Chatter Marks</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Failed Qty (Pcs)</label>
                      <input
                        type="number"
                        min={1}
                        value={inspectionForm.failed_qty}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, failed_qty: Number(e.target.value), passed_qty: inspectionForm.inspected_qty - Number(e.target.value) })}
                        className="w-full p-2 bg-card border border-border rounded text-foreground font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="font-semibold block mb-1">Rework Instructions for Operator</label>
                      <textarea
                        rows={2}
                        value={inspectionForm.rework_instructions}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, rework_instructions: e.target.value })}
                        placeholder="e.g. Re-skim bore on Mazak Lathe by 0.01mm to achieve specified tolerance..."
                        className="w-full p-2 bg-card border border-border rounded text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Configurable Parameter Checklist Table */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground uppercase tracking-wide text-[11px]">Parameter Check List</label>
                  <button type="button" onClick={handleAddParameter} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Parameter
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {inspectionForm.checklist_json.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-xs p-2 rounded-lg bg-muted/40 border border-border">
                      <input
                        type="text"
                        value={item.parameter}
                        onChange={(e) => handleChecklistChange(idx, 'parameter', e.target.value)}
                        placeholder="Parameter Name"
                        className="col-span-4 p-1.5 bg-card border border-border rounded text-foreground"
                      />
                      <input
                        type="text"
                        value={item.expected}
                        onChange={(e) => handleChecklistChange(idx, 'expected', e.target.value)}
                        placeholder="Expected Spec"
                        className="col-span-3 p-1.5 bg-card border border-border rounded text-foreground font-mono"
                      />
                      <input
                        type="text"
                        value={item.actual}
                        onChange={(e) => handleChecklistChange(idx, 'actual', e.target.value)}
                        placeholder="Actual Measured"
                        className="col-span-3 p-1.5 bg-card border border-border rounded text-foreground font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleChecklistChange(idx, 'passed', !item.passed)}
                        className={`col-span-2 py-1.5 rounded font-bold text-[10px] uppercase transition ${
                          item.passed ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                        }`}
                      >
                        {item.passed ? 'PASS' : 'FAIL'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsInspectionModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
                >
                  Save QC Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QC Detail Inspection Modal */}
      {selectedQc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">QC Parameter Inspection Record</h3>
                <p className="text-xs text-muted-foreground">{selectedQc.job_no} — {selectedQc.part_name}</p>
              </div>
              <button onClick={() => setSelectedQc(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <p><strong>Inspector:</strong> {selectedQc.inspector_name}</p>
                <p><strong>Result:</strong> <span className="font-bold uppercase text-primary">{selectedQc.result}</span></p>
                <p><strong>Inspected Qty:</strong> {selectedQc.inspected_qty} Pcs</p>
                <p><strong>Passed Qty:</strong> {selectedQc.passed_qty} Pcs</p>
              </div>

              <h4 className="font-bold text-foreground">Checked Dimensional Parameters:</h4>
              <div className="space-y-1.5">
                {selectedQc.checklist_json.map(item => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{item.parameter}</p>
                      <p className="text-[10px] text-muted-foreground">Expected: {item.expected} | Measured: <strong className="text-foreground">{item.actual}</strong></p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {item.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
