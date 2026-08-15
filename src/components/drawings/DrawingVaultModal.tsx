'use client';

import React, { useState } from 'react';
import { useErp } from '@/lib/store/ErpContext';
import { JobFile, JobOrder } from '@/types';
import ThreeCadViewer from './ThreeCadViewer';
import { 
  FileCode2, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  RotateCcw, 
  MessageSquare, 
  Send, 
  X, 
  Upload, 
  Eye,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface DrawingVaultModalProps {
  job: JobOrder;
  onClose: () => void;
}

export default function DrawingVaultModal({ job, onClose }: DrawingVaultModalProps) {
  const { 
    addDrawingVersion, 
    updateDrawingStatus, 
    addDrawingComment, 
    rollbackDrawingVersion, 
    currentUser 
  } = useErp();

  const [activeFile, setActiveFile] = useState<JobFile | null>(job.files?.[0] || null);
  const [commentText, setCommentText] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileType, setUploadFileType] = useState<'pdf' | 'image' | 'cad'>('pdf');
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName || !uploadFileUrl) return;

    const nextVersion = (job.files?.length || 0) + 1;

    addDrawingVersion({
      job_order_id: job.id,
      client_id: job.client_id,
      file_name: uploadFileName,
      file_url: uploadFileUrl,
      file_type: uploadFileType,
      version: nextVersion,
      is_latest: true,
      approval_status: 'draft',
      uploaded_by_name: currentUser.full_name,
    });

    setUploadFileName('');
    setUploadFileUrl('');
    setIsUploadOpen(false);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFile || !commentText.trim()) return;

    addDrawingComment(activeFile.id, commentText.trim());
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground">Engineering Drawing & Revision Vault</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                {job.job_no}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Part: <strong className="text-foreground">{job.part_name}</strong> | Client: {job.client_name} | Ref: <span className="font-mono text-cyan-400">{job.drawing_ref || 'DWG-REF'}</span> (v{job.drawing_version || 1})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadOpen(!isUploadOpen)}
              className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary/90 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Revision</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
          {/* Left Column: Version History List & Upload */}
          <div className="p-4 border-r border-border bg-muted/20 overflow-y-auto space-y-4">
            {/* Upload Drawer Form */}
            {isUploadOpen && (
              <form onSubmit={handleUploadSubmit} className="p-4 rounded-xl bg-card border border-primary/40 space-y-3 text-xs shadow-md animate-in slide-in-from-top-2">
                <h4 className="font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Upload className="w-4 h-4 text-primary" /> New Drawing Version</span>
                  <button type="button" onClick={() => setIsUploadOpen(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
                </h4>
                <div>
                  <label className="font-semibold block mb-1">Drawing File Name *</label>
                  <input
                    type="text"
                    required
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    placeholder="e.g. Flange_Drawing_RevC.pdf"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Type</label>
                  <select
                    value={uploadFileType}
                    onChange={(e) => setUploadFileType(e.target.value as any)}
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground"
                  >
                    <option value="pdf">PDF Technical Drawing</option>
                    <option value="cad">CAD 3D STEP/DXF Model</option>
                    <option value="image">Inspection Photo / Image</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">File URL / Storage Link *</label>
                  <input
                    type="text"
                    required
                    value={uploadFileUrl}
                    onChange={(e) => setUploadFileUrl(e.target.value)}
                    placeholder="https://... or sample URL"
                    className="w-full p-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono text-[11px]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
                >
                  Save & Lock Version
                </button>
              </form>
            )}

            {/* Attached Versions List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5"><History className="w-4 h-4 text-primary" /> Version History</span>
                <span className="text-[10px] text-muted-foreground">{job.files?.length || 0} Files</span>
              </h4>

              <div className="space-y-2.5">
                {job.files?.map((file) => {
                  const isSelected = activeFile?.id === file.id;
                  return (
                    <div
                      key={file.id}
                      onClick={() => setActiveFile(file)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-sm'
                          : 'bg-card border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {file.file_type === 'pdf' ? (
                            <FileText className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                          ) : file.file_type === 'image' ? (
                            <ImageIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                          ) : (
                            <FileCode2 className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold text-xs text-foreground leading-tight">{file.file_name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Uploaded by {file.uploaded_by_name} • {file.uploaded_at.split('T')[0]}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-muted text-foreground border border-border">
                            v{file.version}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
                            file.approval_status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            file.approval_status === 'superseded' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {file.approval_status}
                          </span>
                        </div>
                      </div>

                      {/* Quick Action Rollback / Approve */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                        <span className="text-muted-foreground">{file.comments?.length || 0} comment(s)</span>
                        <div className="flex items-center gap-2">
                          {file.approval_status !== 'approved' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateDrawingStatus(file.id, 'approved');
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-semibold flex items-center gap-1"
                              title="Approve for Production"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                          )}
                          {!file.is_latest && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rollbackDrawingVersion(job.id, file.id);
                              }}
                              className="px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-semibold flex items-center gap-1"
                              title="Roll back to this version as active"
                            >
                              <RotateCcw className="w-3 h-3" /> Rollback
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center & Right Column: Inline CAD / PDF Viewer & Comment Thread */}
          <div className="lg:col-span-2 flex flex-col h-full bg-card overflow-hidden">
            {activeFile ? (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
                {/* Active File Header */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{activeFile.file_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Type: <span className="uppercase text-cyan-400 font-semibold">{activeFile.file_type}</span> | Status:{' '}
                      <span className="capitalize font-bold text-foreground">{activeFile.approval_status}</span>
                    </p>
                  </div>
                  <a
                    href={activeFile.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4" /> Download Original
                  </a>
                </div>

                {/* Inline Preview Canvas / PDF / Lightbox */}
                <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center">
                  {activeFile.file_type === 'cad' ? (
                    <ThreeCadViewer fileName={activeFile.file_name} fileUrl={activeFile.file_url} height="360px" />
                  ) : activeFile.file_type === 'image' ? (
                    <img src={activeFile.file_url} alt={activeFile.file_name} className="max-h-[360px] object-contain rounded-lg shadow-md" />
                  ) : (
                    <iframe src={activeFile.file_url} title="PDF Technical Drawing" className="w-full h-[360px] rounded-lg" />
                  )}
                </div>

                {/* Drawing Markup & Comment Thread Section */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" /> Drawing Review & Markup Notes ({activeFile.comments?.length || 0})
                  </h4>

                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {activeFile.comments?.map(c => (
                      <div key={c.id} className="p-2.5 rounded-lg bg-card border border-border text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground">{c.user_name} <span className="text-muted-foreground font-normal">({c.role})</span></span>
                          <span className="text-muted-foreground text-[10px]">{c.created_at.split('T')[0]}</span>
                        </div>
                        <p className="text-muted-foreground">{c.text}</p>
                      </div>
                    ))}
                    {(!activeFile.comments || activeFile.comments.length === 0) && (
                      <p className="text-xs text-muted-foreground italic">No review notes on this drawing version yet.</p>
                    )}
                  </div>

                  {/* Add Comment Input */}
                  <form onSubmit={handleSendComment} className="flex items-center gap-2 pt-2 border-t border-border">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add engineering comment or tolerance note..."
                      className="flex-1 p-2 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-primary/90"
                    >
                      <Send className="w-3.5 h-3.5" /> Post
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground text-xs">
                Select a drawing version from the left panel to preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
