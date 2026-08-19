'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Client, 
  Vendor,
  VendorRateHistory,
  Material, 
  MaterialInward, 
  Machine, 
  JobOrder, 
  SubOperation,
  JobFile, 
  DrawingComment,
  QCCheck, 
  Dispatch, 
  Invoice, 
  Payment,
  UserProfile,
  UserRole,
  JobStatus,
  CompanySettings
} from '@/types';
import PasscodeLockModal from '@/components/auth/PasscodeLockModal';
import { 
  INITIAL_USERS, 
  INITIAL_VENDORS,
  INITIAL_VENDOR_RATES,
  INITIAL_CLIENTS, 
  INITIAL_MATERIALS, 
  INITIAL_MATERIAL_INWARD, 
  INITIAL_MACHINES, 
  INITIAL_JOB_ORDERS, 
  INITIAL_QC_CHECKS, 
  INITIAL_DISPATCHES, 
  INITIAL_INVOICES, 
  INITIAL_PAYMENTS,
  INITIAL_COMPANY_SETTINGS
} from '@/lib/mockData';
import {
  generateUuid,
  isSupabaseConfigured,
  fetchCompanySettings,
  saveCompanySettings,
  fetchClients,
  insertClient,
  updateClientDb,
  fetchVendors,
  insertVendor,
  fetchVendorRates,
  insertVendorRate,
  fetchMaterials,
  insertMaterial,
  fetchMaterialInwards,
  insertMaterialInward,
  fetchMachines,
  fetchJobOrders,
  insertJobOrder,
  updateJobOrderDb,
  fetchQCChecks,
  insertQCCheck,
  fetchDispatches,
  insertDispatch,
  fetchInvoices,
  insertInvoice,
  fetchPayments,
  insertPayment
} from '@/lib/supabase/db';

interface ErpContextType {
  currentUser: UserProfile;
  setUserRole: (role: UserRole) => void;
  companySettings: CompanySettings;
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;

  // Masters
  clients: Client[];
  vendors: Vendor[];
  vendorRates: VendorRateHistory[];
  materials: Material[];
  materialInwards: MaterialInward[];
  machines: Machine[];
  jobOrders: JobOrder[];
  qcChecks: QCCheck[];
  dispatches: Dispatch[];
  invoices: Invoice[];
  payments: Payment[];

  // Client actions
  addClient: (clientData: Omit<Client, 'id' | 'created_at' | 'outstanding_balance'>) => void;
  updateClient: (id: string, clientData: Partial<Client>) => void;
  addContactPerson: (clientId: string, contact: { name: string; designation: string; phone: string; email: string }) => void;

  // Vendor actions
  addVendor: (vendorData: Omit<Vendor, 'id' | 'created_at' | 'outstanding_payable'>) => void;
  updateVendor: (id: string, vendorData: Partial<Vendor>) => void;
  addVendorRate: (rateData: Omit<VendorRateHistory, 'id'>) => void;

  // Material actions
  addMaterial: (materialData: Omit<Material, 'id' | 'created_at' | 'current_stock'>) => void;
  addStockLedgerEntry: (inwardData: Omit<MaterialInward, 'id' | 'created_at'>) => void;

  // Drawing Vault actions
  addDrawingVersion: (fileData: Omit<JobFile, 'id' | 'uploaded_at' | 'comments'>) => void;
  updateDrawingStatus: (fileId: string, status: 'draft' | 'approved' | 'superseded') => void;
  addDrawingComment: (fileId: string, commentText: string) => void;
  rollbackDrawingVersion: (jobId: string, fileId: string) => void;

  // Job Order actions
  createJobOrder: (jobData: Omit<JobOrder, 'id' | 'job_no' | 'qr_code_token' | 'created_at' | 'files' | 'audit_logs'>) => void;
  updateJobStatus: (id: string, status: JobStatus, remarks?: string) => void;
  addSubOperation: (jobId: string, subOp: Omit<SubOperation, 'id'>) => void;
  updateSubOpStatus: (jobId: string, subOpId: string, status: 'pending' | 'in_progress' | 'completed', actualMin?: number) => void;

  // QC actions
  addQCCheck: (qcData: Omit<QCCheck, 'id' | 'checked_at'>) => void;

  // Dispatch & Delivery Challan actions
  createDispatch: (dispatchData: Omit<Dispatch, 'id' | 'challan_no' | 'created_at'>) => void;

  // Invoice & Payment actions
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'invoice_no' | 'financial_year' | 'created_at'>) => void;
  recordPayment: (paymentData: Omit<Payment, 'id' | 'created_at'>) => void;

  // System Setup & Lock Actions
  resetToFreshInstance: (mode: 'clean' | 'cnc_preset') => void;
  isLocked: boolean;
  lockErp: () => void;
  unlockErp: () => void;

  // Indicators
  lowStockCount: number;
  pendingJobsCount: number;
  pendingQCCount: number;
  unpaidInvoicesCount: number;
}

const ErpContext = createContext<ErpContextType | undefined>(undefined);

export function ErpProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[0]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [vendorRates, setVendorRates] = useState<VendorRateHistory[]>(INITIAL_VENDOR_RATES);
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [materialInwards, setMaterialInwards] = useState<MaterialInward[]>(INITIAL_MATERIAL_INWARD);
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>(INITIAL_JOB_ORDERS);
  const [qcChecks, setQcChecks] = useState<QCCheck[]>(INITIAL_QC_CHECKS);
  const [dispatches, setDispatches] = useState<Dispatch[]>(INITIAL_DISPATCHES);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);

  // Sync state from Supabase Database on initial load if configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    async function loadDbData() {
      try {
        const [
          dbSettings,
          dbClients,
          dbVendors,
          dbRates,
          dbMaterials,
          dbInwards,
          dbMachines,
          dbJobs,
          dbQc,
          dbDispatch,
          dbInvoices,
          dbPayments
        ] = await Promise.all([
          fetchCompanySettings(),
          fetchClients(),
          fetchVendors(),
          fetchVendorRates(),
          fetchMaterials(),
          fetchMaterialInwards(),
          fetchMachines(),
          fetchJobOrders(),
          fetchQCChecks(),
          fetchDispatches(),
          fetchInvoices(),
          fetchPayments()
        ]);

        if (dbSettings) setCompanySettings(dbSettings);
        if (dbClients !== null) setClients(dbClients);
        if (dbVendors !== null) setVendors(dbVendors);
        if (dbRates !== null) setVendorRates(dbRates);
        if (dbMaterials !== null) setMaterials(dbMaterials);
        if (dbInwards !== null) setMaterialInwards(dbInwards);
        if (dbMachines !== null) setMachines(dbMachines);
        if (dbJobs !== null) setJobOrders(dbJobs);
        if (dbQc !== null) setQcChecks(dbQc);
        if (dbDispatch !== null) setDispatches(dbDispatch);
        if (dbInvoices !== null) setInvoices(dbInvoices);
        if (dbPayments !== null) setPayments(dbPayments);
      } catch (err) {
        console.error('Supabase DB load error, using default state:', err);
      }
    }

    loadDbData();
  }, []);

  // Switch role
  const setUserRole = (role: UserRole) => {
    const found = INITIAL_USERS.find(u => u.role === role) || { ...INITIAL_USERS[0], role };
    setCurrentUser(found);
  };

  const updateCompanySettings = (settings: Partial<CompanySettings>) => {
    setCompanySettings(prev => ({ ...prev, ...settings }));
    saveCompanySettings(settings);
  };

  // Client actions
  const addClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'outstanding_balance'>) => {
    const newClient: Client = {
      ...clientData,
      id: generateUuid(),
      outstanding_balance: 0,
      created_at: new Date().toISOString(),
    };

    try {
      await insertClient(newClient);
      const dbClients = await fetchClients();
      if (dbClients && dbClients.length > 0) {
        setClients(dbClients);
      } else {
        setClients(prev => [newClient, ...prev]);
      }
    } catch (err) {
      console.error('[ErpContext] insertClient failed, preserving in local state:', err);
      setClients(prev => [newClient, ...prev]);
      throw err;
    }
  };


  const updateClient = async (id: string, clientData: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...clientData } : c));
    await updateClientDb(id, clientData);
    const dbClients = await fetchClients();
    if (dbClients && dbClients.length > 0) setClients(dbClients);
  };

  const addContactPerson = async (clientId: string, contact: { name: string; designation: string; phone: string; email: string }) => {
    const newCp = { id: generateUuid(), ...contact };
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return { ...c, contact_persons: [...(c.contact_persons || []), newCp] };
      }
      return c;
    }));
    const target = clients.find(c => c.id === clientId);
    if (target) {
      const updatedCps = [...(target.contact_persons || []), newCp];
      await updateClientDb(clientId, { contact_persons: updatedCps });
      const dbClients = await fetchClients();
      if (dbClients && dbClients.length > 0) setClients(dbClients);
    }
  };

  // Vendor actions
  const addVendor = async (vendorData: Omit<Vendor, 'id' | 'created_at' | 'outstanding_payable'>) => {
    const newVendor: Vendor = {
      ...vendorData,
      id: generateUuid(),
      outstanding_payable: 0,
      created_at: new Date().toISOString(),
    };
    setVendors(prev => [newVendor, ...prev]);
    await insertVendor(newVendor);
    const dbVendors = await fetchVendors();
    if (dbVendors && dbVendors.length > 0) setVendors(dbVendors);
  };

  const updateVendor = (id: string, vendorData: Partial<Vendor>) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...vendorData } : v));
  };

  const addVendorRate = async (rateData: Omit<VendorRateHistory, 'id'>) => {
    const newRate: VendorRateHistory = {
      ...rateData,
      id: generateUuid(),
    };
    setVendorRates(prev => [newRate, ...prev]);
    await insertVendorRate(newRate);
    const dbRates = await fetchVendorRates();
    if (dbRates && dbRates.length > 0) setVendorRates(dbRates);
  };

  // Material actions
  const addMaterial = async (materialData: Omit<Material, 'id' | 'created_at' | 'current_stock'>) => {
    const newMat: Material = {
      ...materialData,
      id: generateUuid(),
      current_stock: 0,
      created_at: new Date().toISOString(),
    };
    setMaterials(prev => [newMat, ...prev]);
    await insertMaterial(newMat);
    const dbMaterials = await fetchMaterials();
    if (dbMaterials && dbMaterials.length > 0) setMaterials(dbMaterials);
  };

  const addStockLedgerEntry = (inwardData: Omit<MaterialInward, 'id' | 'created_at'>) => {
    const mat = materials.find(m => m.id === inwardData.material_id);
    const client = inwardData.client_id ? clients.find(c => c.id === inwardData.client_id) : null;
    const vendor = inwardData.vendor_id ? vendors.find(v => v.id === inwardData.vendor_id) : null;

    const newInward: MaterialInward = {
      ...inwardData,
      id: generateUuid(),
      material_name: mat?.name || 'Unknown Material',
      client_name: client?.company_name || null,
      vendor_name: vendor?.vendor_name || null,
      created_at: new Date().toISOString(),
    };

    setMaterialInwards(prev => [newInward, ...prev]);
    insertMaterialInward(newInward);

    // Update material stock pool ONLY if own_stock
    if (inwardData.source_type === 'own_stock') {
      let delta = 0;
      if (inwardData.ledger_type === 'grn_inward' || inwardData.ledger_type === 'return_to_stock') {
        delta = inwardData.qty;
      } else if (inwardData.ledger_type === 'issue_to_job' || inwardData.ledger_type === 'scrap_entry') {
        delta = -inwardData.qty;
      }

      setMaterials(prev => prev.map(m => m.id === inwardData.material_id ? { ...m, current_stock: Math.max(0, m.current_stock + delta) } : m));

      // If vendor GRN inward, update vendor payable
      if (inwardData.ledger_type === 'grn_inward' && inwardData.vendor_id && inwardData.unit_rate > 0) {
        const totalCost = inwardData.qty * inwardData.unit_rate;
        setVendors(prev => prev.map(v => v.id === inwardData.vendor_id ? { ...v, outstanding_payable: v.outstanding_payable + totalCost } : v));
      }
    }
  };

  // Drawing Vault actions
  const addDrawingVersion = (fileData: Omit<JobFile, 'id' | 'uploaded_at' | 'comments'>) => {
    const newFile: JobFile = {
      ...fileData,
      id: generateUuid(),
      uploaded_at: new Date().toISOString(),
      comments: [],
    };

    setJobOrders(prev => prev.map(job => {
      if (job.id === fileData.job_order_id) {
        const existingFiles = job.files || [];
        // Mark previous files of same name as is_latest: false
        const updatedFiles = existingFiles.map(f => f.file_name === fileData.file_name ? { ...f, is_latest: false } : f);
        return {
          ...job,
          drawing_version: fileData.version,
          files: [newFile, ...updatedFiles],
        };
      }
      return job;
    }));
  };

  const updateDrawingStatus = (fileId: string, status: 'draft' | 'approved' | 'superseded') => {
    setJobOrders(prev => prev.map(job => {
      if (job.files) {
        const updated = job.files.map(f => f.id === fileId ? { ...f, approval_status: status } : f);
        return { ...job, files: updated };
      }
      return job;
    }));
  };

  const addDrawingComment = (fileId: string, commentText: string) => {
    const newComment: DrawingComment = {
      id: generateUuid(),
      user_name: currentUser.full_name,
      role: currentUser.role,
      text: commentText,
      created_at: new Date().toISOString(),
    };

    setJobOrders(prev => prev.map(job => {
      if (job.files) {
        const updated = job.files.map(f => f.id === fileId ? { ...f, comments: [...f.comments, newComment] } : f);
        return { ...job, files: updated };
      }
      return job;
    }));
  };

  const rollbackDrawingVersion = (jobId: string, targetFileId: string) => {
    setJobOrders(prev => prev.map(job => {
      if (job.id === jobId && job.files) {
        const target = job.files.find(f => f.id === targetFileId);
        if (!target) return job;

        const updatedFiles: JobFile[] = job.files.map(f => ({
          ...f,
          is_latest: f.id === targetFileId,
          approval_status: f.id === targetFileId ? 'approved' : 'superseded',
        }));

        return {
          ...job,
          drawing_ref: target.file_name,
          drawing_version: target.version,
          files: updatedFiles,
        };
      }
      return job;
    }));
  };


  // Job Order actions
  const createJobOrder = (jobData: Omit<JobOrder, 'id' | 'job_no' | 'qr_code_token' | 'created_at' | 'files' | 'audit_logs'>) => {
    const jobNum = `JOB-2026-${String(jobOrders.length + 1).padStart(3, '0')}`;
    const client = clients.find(c => c.id === jobData.client_id);
    const mat = materials.find(m => m.id === jobData.material_id);
    const mac = jobData.machine_id ? machines.find(m => m.id === jobData.machine_id) : undefined;

    const initialAudit = {
      id: generateUuid(),
      stage: 'Order Received' as JobStatus,
      user_name: currentUser.full_name,
      timestamp: new Date().toISOString(),
      remarks: 'Job Created',
    };

    const newJob: JobOrder = {
      ...jobData,
      id: generateUuid(),
      job_no: jobNum,
      client_name: client?.company_name,
      material_name: mat?.name,
      machine_name: mac?.name,
      qr_code_token: `QR-${jobNum}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      created_at: new Date().toISOString(),
      sub_ops: jobData.sub_ops || [],
      files: [],
      audit_logs: [initialAudit],
    };

    setJobOrders(prev => [newJob, ...prev]);
    insertJobOrder(newJob);
  };

  const updateJobStatus = (id: string, status: JobStatus, remarks?: string) => {
    const auditEntry = {
      id: generateUuid(),
      stage: status,
      user_name: currentUser.full_name,
      timestamp: new Date().toISOString(),
      remarks: remarks || `Moved stage to ${status}`,
    };

    setJobOrders(prev => prev.map(j => {
      if (j.id === id) {
        const logs = j.audit_logs || [];
        return {
          ...j,
          status,
          audit_logs: [auditEntry, ...logs],
        };
      }
      return j;
    }));

    updateJobOrderDb(id, { status });
  };

  const addSubOperation = (jobId: string, subOp: Omit<SubOperation, 'id'>) => {
    const mac = machines.find(m => m.id === subOp.machine_id);
    const newSub: SubOperation = {
      ...subOp,
      id: generateUuid(),
      machine_name: mac?.name,
    };

    setJobOrders(prev => prev.map(j => {
      if (j.id === jobId) {
        return { ...j, sub_ops: [...(j.sub_ops || []), newSub] };
      }
      return j;
    }));
  };

  const updateSubOpStatus = (jobId: string, subOpId: string, status: 'pending' | 'in_progress' | 'completed', actualMin?: number) => {
    setJobOrders(prev => prev.map(j => {
      if (j.id === jobId && j.sub_ops) {
        const updatedOps = j.sub_ops.map(so => {
          if (so.id === subOpId) {
            return {
              ...so,
              status,
              actual_min: actualMin !== undefined ? actualMin : so.actual_min,
            };
          }
          return so;
        });
        return { ...j, sub_ops: updatedOps };
      }
      return j;
    }));
  };

  // QC actions
  const addQCCheck = (qcData: Omit<QCCheck, 'id' | 'checked_at'>) => {
    const job = jobOrders.find(j => j.id === qcData.job_order_id);
    const newQc: QCCheck = {
      ...qcData,
      id: generateUuid(),
      job_no: job?.job_no,
      part_name: job?.part_name,
      client_name: job?.client_name,
      checked_at: new Date().toISOString(),
    };

    setQcChecks(prev => [newQc, ...prev]);
    insertQCCheck(newQc);

    // Update job status based on QC result
    if (qcData.result === 'pass') {
      updateJobStatus(qcData.job_order_id, 'Ready for Dispatch', `QC Passed: ${qcData.passed_qty}/${qcData.inspected_qty} Pcs`);
    } else if (qcData.result === 'fail' || qcData.result === 'rework') {
      updateJobStatus(qcData.job_order_id, 'Rework', `QC Failed (${qcData.failed_qty} Pcs). Defect: ${qcData.defect_category || 'Out of spec'}. Instructions: ${qcData.rework_instructions || 'Rework required'}`);
    }
  };

  // Dispatch actions
  const createDispatch = (dispatchData: Omit<Dispatch, 'id' | 'challan_no' | 'created_at'>) => {
    const challanNo = `DC-2026-${String(dispatches.length + 1).padStart(3, '0')}`;
    const job = jobOrders.find(j => j.id === dispatchData.job_order_id);
    const client = clients.find(c => c.id === dispatchData.client_id);

    const newDispatch: Dispatch = {
      ...dispatchData,
      id: generateUuid(),
      challan_no: challanNo,
      job_no: job?.job_no,
      client_name: client?.company_name,
      part_name: job?.part_name,
      created_at: new Date().toISOString(),
    };

    setDispatches(prev => [newDispatch, ...prev]);
    insertDispatch(newDispatch);

    // Mark Job as Delivered
    updateJobStatus(dispatchData.job_order_id, 'Delivered', `Dispatched via ${dispatchData.transporter} (DC No: ${challanNo})`);
  };

  // Invoice actions
  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'invoice_no' | 'financial_year' | 'created_at'>) => {
    const invNo = `INV-2627-${String(invoices.length + 1).padStart(3, '0')}`;
    const client = clients.find(c => c.id === invoiceData.client_id);
    const job = invoiceData.job_order_id ? jobOrders.find(j => j.id === invoiceData.job_order_id) : undefined;

    const isInterstate = (client?.state_code || '27') !== companySettings.state_code;
    const subtotal = invoiceData.labour_amount + invoiceData.material_amount;
    
    let cgstRate = 0;
    let cgstAmt = 0;
    let sgstRate = 0;
    let sgstAmt = 0;
    let igstRate = 0;
    let igstAmt = 0;

    if (isInterstate) {
      igstRate = 18;
      igstAmt = (subtotal * 18) / 100;
    } else {
      cgstRate = 9;
      cgstAmt = (subtotal * 9) / 100;
      sgstRate = 9;
      sgstAmt = (subtotal * 9) / 100;
    }

    const totalAmt = subtotal + cgstAmt + sgstAmt + igstAmt;

    const newInvoice: Invoice = {
      ...invoiceData,
      id: generateUuid(),
      invoice_no: invNo,
      financial_year: 'FY 2026-27',
      client_name: client?.company_name,
      client_gstin: client?.gstin,
      client_state_code: client?.state_code,
      job_no: job?.job_no,
      subtotal,
      is_interstate: isInterstate,
      cgst_rate: cgstRate,
      cgst_amount: cgstAmt,
      sgst_rate: sgstRate,
      sgst_amount: sgstAmt,
      igst_rate: igstRate,
      igst_amount: igstAmt,
      total_amount: totalAmt,
      paid_amount: 0,
      created_at: new Date().toISOString(),
    };

    setInvoices(prev => [newInvoice, ...prev]);
    insertInvoice(newInvoice);

    // Update client's outstanding balance
    setClients(prev => prev.map(c => c.id === invoiceData.client_id ? { ...c, outstanding_balance: c.outstanding_balance + totalAmt } : c));
  };

  // Record Payment
  const recordPayment = (paymentData: Omit<Payment, 'id' | 'created_at'>) => {
    const inv = invoices.find(i => i.id === paymentData.invoice_id);
    const client = clients.find(c => c.id === paymentData.client_id);

    const newPayment: Payment = {
      ...paymentData,
      id: generateUuid(),
      invoice_no: inv?.invoice_no,
      client_name: client?.company_name,
      created_at: new Date().toISOString(),
    };

    setPayments(prev => [newPayment, ...prev]);
    insertPayment(newPayment);

    // Update Invoice status & paid_amount
    if (inv) {
      const newPaid = inv.paid_amount + paymentData.amount;
      const newStatus = newPaid >= inv.total_amount ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';
      
      setInvoices(prev => prev.map(i => i.id === paymentData.invoice_id ? { ...i, paid_amount: newPaid, status: newStatus } : i));
      // Deduct from client's outstanding balance
      setClients(prev => prev.map(c => c.id === paymentData.client_id ? { ...c, outstanding_balance: Math.max(0, c.outstanding_balance - paymentData.amount) } : c));
    }
  };

  // Metrics
  const lowStockCount = materials.filter(m => m.current_stock <= m.reorder_level).length;
  const pendingJobsCount = jobOrders.filter(j => j.status !== 'Delivered').length;
  const pendingQCCount = jobOrders.filter(j => j.status === 'Quality Check' || j.status === 'Rework').length;
  const unpaidInvoicesCount = invoices.filter(i => i.status === 'unpaid' || i.status === 'partially_paid').length;

  const resetToFreshInstance = (mode: 'clean' | 'cnc_preset') => {
    setClients([]);
    setVendors([]);
    setVendorRates([]);
    setJobOrders([]);
    setQcChecks([]);
    setDispatches([]);
    setInvoices([]);
    setPayments([]);
    setMaterialInwards([]);

    if (mode === 'clean') {
      setMaterials([]);
    } else {
      setMaterials(INITIAL_MATERIALS);
    }
  };

  const [isLocked, setIsLocked] = useState(false);

  const lockErp = () => setIsLocked(true);
  const unlockErp = () => setIsLocked(false);

  return (
    <ErpContext.Provider
      value={{
        currentUser,
        setUserRole,
        companySettings,
        updateCompanySettings,
        clients,
        vendors,
        vendorRates,
        materials,
        materialInwards,
        machines,
        jobOrders,
        qcChecks,
        dispatches,
        invoices,
        payments,
        addClient,
        updateClient,
        addContactPerson,
        addVendor,
        updateVendor,
        addVendorRate,
        addMaterial,
        addStockLedgerEntry,
        addDrawingVersion,
        updateDrawingStatus,
        addDrawingComment,
        rollbackDrawingVersion,
        createJobOrder,
        updateJobStatus,
        addSubOperation,
        updateSubOpStatus,
        addQCCheck,
        createDispatch,
        createInvoice,
        recordPayment,
        resetToFreshInstance,
        isLocked,
        lockErp,
        unlockErp,
        lowStockCount,
        pendingJobsCount,
        pendingQCCount,
        unpaidInvoicesCount,
      }}
    >
      <PasscodeLockModal isOpen={isLocked} onUnlock={unlockErp} />
      {children}
    </ErpContext.Provider>
  );
}

export function useErp() {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error('useErp must be used within an ErpProvider');
  }
  return context;
}
