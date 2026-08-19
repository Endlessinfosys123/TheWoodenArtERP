import { createClient } from './client';
import { 
  Client, 
  Vendor, 
  VendorRateHistory, 
  Material, 
  MaterialInward, 
  Machine, 
  JobOrder, 
  QCCheck, 
  Dispatch, 
  Invoice, 
  Payment, 
  CompanySettings 
} from '@/types';

// Helper to generate standard UUID v4 strings
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function ensureUuid(id?: string | null): string {
  if (isValidUuid(id)) return id as string;
  return generateUuid();
}

function ensureNullableUuid(id?: string | null): string | null {
  if (!id) return null;
  if (isValidUuid(id)) return id;
  return null;
}

// Check if Supabase environment variables are configured
export function isSupabaseConfigured(): boolean {
  return createClient() !== null;
}

// =================================================================
// 1. COMPANY SETTINGS
// =================================================================
export async function fetchCompanySettings(): Promise<CompanySettings | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
  if (error) {
    console.error('[Supabase Error - fetchCompanySettings]:', error);
    return null;
  }
  return data as CompanySettings | null;
}

export async function saveCompanySettings(settings: Partial<CompanySettings>): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const existing = await fetchCompanySettings();
  if (existing && (existing as { id?: string }).id) {
    const { error } = await supabase.from('company_settings').update(settings).eq('id', (existing as { id?: string }).id);
    if (error) console.error('[Supabase Error - saveCompanySettings update]:', error);
  } else {
    const payload = { id: generateUuid(), ...settings };
    const { error } = await supabase.from('company_settings').insert([payload]);
    if (error) console.error('[Supabase Error - saveCompanySettings insert]:', error);
  }
}

// =================================================================
// 2. CLIENTS & CONTACT PERSONS
// =================================================================
export async function fetchClients(): Promise<Client[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('clients').select('*, contact_persons:client_contact_persons(*)').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchClients]:', error);
    return null;
  }
  return data.map(item => ({
    ...item,
    contact_persons: item.contact_persons || []
  })) as Client[];
}

export async function insertClient(client: Client): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error('Supabase DB Client is not connected');
  const { contact_persons, ...clientRaw } = client;
  const clientPayload = {
    id: ensureUuid(clientRaw.id),
    company_name: clientRaw.company_name ? clientRaw.company_name.trim() : 'Unnamed Client',
    gstin: (clientRaw.gstin && clientRaw.gstin.trim() !== '') ? clientRaw.gstin.trim() : '27URP0000000000',
    contact_person: (clientRaw.contact_person && clientRaw.contact_person.trim() !== '') ? clientRaw.contact_person.trim() : 'Primary Contact',
    phone: (clientRaw.phone && clientRaw.phone.trim() !== '') ? clientRaw.phone.trim() : '+91 00000 00000',
    email: (clientRaw.email && clientRaw.email.trim() !== '') ? clientRaw.email.trim() : 'info@client.com',
    billing_address: (clientRaw.billing_address && clientRaw.billing_address.trim() !== '') ? clientRaw.billing_address.trim() : 'Works Address Not Specified',
    shipping_address: (clientRaw.shipping_address && clientRaw.shipping_address.trim() !== '') ? clientRaw.shipping_address.trim() : (clientRaw.billing_address || 'Works Address Not Specified'),
    city: (clientRaw.city && clientRaw.city.trim() !== '') ? clientRaw.city.trim() : 'Pune',
    state_code: clientRaw.state_code || '27',
    state_name: clientRaw.state_name || 'Maharashtra',
    credit_terms: clientRaw.credit_terms || '30 Days Net',
    payment_due_days: Number(clientRaw.payment_due_days) || 30,
    credit_limit: Number(clientRaw.credit_limit) || 500000.00,
    status: clientRaw.status || 'active',
    outstanding_balance: Number(clientRaw.outstanding_balance) || 0.00,
    created_at: clientRaw.created_at || new Date().toISOString()
  };

  const { error } = await supabase.from('clients').insert([clientPayload]);
  if (error) {
    console.error('[Supabase Error - insertClient]:', error);
    throw new Error(error.message || 'Failed to save client in Supabase DB');
  }

  if (contact_persons && contact_persons.length > 0) {
    const cpPayloads = contact_persons.map(cp => ({
      id: ensureUuid(cp.id),
      client_id: clientPayload.id,
      name: cp.name || 'Primary Contact',
      designation: cp.designation || 'Contact',
      phone: cp.phone || '+91 00000 00000',
      email: cp.email || 'info@client.com',
      created_at: new Date().toISOString()
    }));
    const { error: cpError } = await supabase.from('client_contact_persons').insert(cpPayloads);
    if (cpError) console.error('[Supabase Error - insertClient contact persons]:', cpError);
  }
}

export async function updateClientDb(id: string, updates: Partial<Client>): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  if (!isValidUuid(id)) return;

  const { contact_persons, ...clientRaw } = updates;
  if (Object.keys(clientRaw).length > 0) {
    const { error } = await supabase.from('clients').update(clientRaw).eq('id', id);
    if (error) console.error('[Supabase Error - updateClientDb]:', error);
  }
}

// =================================================================
// 3. VENDORS & VENDOR RATES
// =================================================================
export async function fetchVendors(): Promise<Vendor[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('vendors').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchVendors]:', error);
    return null;
  }
  return data as Vendor[];
}

export async function insertVendor(vendor: Vendor): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const payload = {
    id: ensureUuid(vendor.id),
    vendor_name: vendor.vendor_name,
    gstin: vendor.gstin,
    category: vendor.category,
    contact_person: vendor.contact_person,
    phone: vendor.phone,
    email: vendor.email,
    city: vendor.city,
    state_code: vendor.state_code || '27',
    address: vendor.address,
    outstanding_payable: vendor.outstanding_payable || 0.00,
    created_at: vendor.created_at || new Date().toISOString()
  };

  const { error } = await supabase.from('vendors').insert([payload]);
  if (error) console.error('[Supabase Error - insertVendor]:', error);
}

export async function fetchVendorRates(): Promise<VendorRateHistory[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('vendor_rate_history').select('*').order('effective_date', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchVendorRates]:', error);
    return null;
  }
  return data as VendorRateHistory[];
}

export async function insertVendorRate(rate: VendorRateHistory): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const payload = {
    id: ensureUuid(rate.id),
    vendor_id: ensureNullableUuid(rate.vendor_id),
    material_name: rate.material_name,
    rate_per_unit: rate.rate_per_unit,
    effective_date: rate.effective_date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('vendor_rate_history').insert([payload]);
  if (error) console.error('[Supabase Error - insertVendorRate]:', error);
}

// =================================================================
// 4. MATERIALS & MATERIAL INWARDS
// =================================================================
export async function fetchMaterials(): Promise<Material[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchMaterials]:', error);
    return null;
  }
  return data as Material[];
}

export async function insertMaterial(material: Material): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const payload = {
    id: ensureUuid(material.id),
    name: material.name,
    category: material.category || 'MDF',
    grade: material.grade,
    unit: material.unit || 'sq_ft',
    hsn_code: material.hsn_code || '4411',
    thickness: material.thickness || 18,
    thickness_unit: material.thickness_unit || 'mm',
    sheet_length: material.sheet_length || 8,
    sheet_width: material.sheet_width || 4,
    dimension_unit: material.dimension_unit || 'ft',
    sqft_per_sheet: material.sqft_per_sheet || 32,
    current_stock: material.current_stock || 0.00,
    reorder_level: material.reorder_level || 50.00,
    unit_cost: material.unit_cost || 0.00,
    batch_tracking_enabled: material.batch_tracking_enabled ?? true,
    created_at: material.created_at || new Date().toISOString()
  };

  const { error } = await supabase.from('materials').insert([payload]);
  if (error) console.error('[Supabase Error - insertMaterial]:', error);
}

export async function fetchMaterialInwards(): Promise<MaterialInward[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('material_inwards').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchMaterialInwards]:', error);
    return null;
  }
  return data as MaterialInward[];
}

export async function insertMaterialInward(inward: MaterialInward): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const payload = {
    id: ensureUuid(inward.id),
    ledger_type: inward.ledger_type || 'grn_inward',
    material_id: ensureNullableUuid(inward.material_id),
    vendor_id: ensureNullableUuid(inward.vendor_id),
    client_id: ensureNullableUuid(inward.client_id),
    job_order_id: ensureNullableUuid(inward.job_order_id),
    source_type: inward.source_type || 'own_stock',
    batch_no: inward.batch_no,
    heat_no: inward.heat_no,
    dimensions: inward.dimensions,
    qty: inward.qty,
    unit_rate: inward.unit_rate || 0.00,
    inward_date: inward.inward_date || new Date().toISOString().split('T')[0],
    challan_no: inward.challan_no,
    notes: inward.notes,
    created_at: inward.created_at || new Date().toISOString()
  };

  const { error } = await supabase.from('material_inwards').insert([payload]);
  if (error) console.error('[Supabase Error - insertMaterialInward]:', error);
}

// =================================================================
// 5. MACHINES
// =================================================================
export async function fetchMachines(): Promise<Machine[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('machines').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchMachines]:', error);
    return null;
  }
  return data as Machine[];
}

// =================================================================
// 6. JOB ORDERS
// =================================================================
export async function fetchJobOrders(): Promise<JobOrder[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('job_orders').select(`
    *,
    sub_ops:job_sub_operations(*),
    files:job_files(*)
  `).order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase Error - fetchJobOrders]:', error);
    return null;
  }
  return data.map(job => ({
    ...job,
    sub_ops: job.sub_ops || [],
    files: job.files || []
  })) as JobOrder[];
}

export async function insertJobOrder(job: JobOrder): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const payload = {
    id: ensureUuid(job.id),
    job_no: job.job_no,
    po_ref: job.po_ref,
    client_id: ensureNullableUuid(job.client_id),
    part_name: job.part_name,
    part_number: job.part_number,
    drawing_ref: job.drawing_ref,
    drawing_version: job.drawing_version || 1,
    qty: job.qty,
    material_id: ensureNullableUuid(job.material_id),
    material_source: job.material_source || 'own_stock',
    batch_no: job.batch_no,
    heat_no: job.heat_no,
    machine_id: ensureNullableUuid(job.machine_id),
    operator_id: ensureNullableUuid(job.operator_id),
    status: job.status || 'Order Received',
    priority: job.priority || 'Medium',
    due_date: job.due_date,
    estimated_setup_min: job.estimated_setup_min || 60,
    estimated_cycle_min: job.estimated_cycle_min || 30,
    actual_setup_min: job.actual_setup_min || 0,
    actual_cycle_min: job.actual_cycle_min || 0,
    qr_code_token: job.qr_code_token,
    notes: job.notes,
    created_at: job.created_at || new Date().toISOString()
  };

  const { error } = await supabase.from('job_orders').insert([payload]);
  if (error) console.error('[Supabase Error - insertJobOrder]:', error);
}

export async function updateJobOrderDb(id: string, updates: Partial<JobOrder>): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  if (!isValidUuid(id)) return;

  const { sub_ops, files, audit_logs, client_name, material_name, machine_name, operator_name, ...jobDb } = updates;
  if (Object.keys(jobDb).length > 0) {
    const { error } = await supabase.from('job_orders').update(jobDb).eq('id', id);
    if (error) console.error('[Supabase Error - updateJobOrderDb]:', error);
  }
}

// =================================================================
// 7. QC CHECKS
// =================================================================
export async function fetchQCChecks(): Promise<QCCheck[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('qc_checks').select('*').order('checked_at', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchQCChecks]:', error);
    return null;
  }
  return data as QCCheck[];
}

export async function insertQCCheck(qc: QCCheck): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const payload = {
    id: ensureUuid(qc.id),
    job_order_id: ensureNullableUuid(qc.job_order_id),
    inspector_name: qc.inspector_name,
    inspected_qty: qc.inspected_qty,
    passed_qty: qc.passed_qty,
    failed_qty: qc.failed_qty || 0,
    result: qc.result || 'pass',
    defect_category: qc.defect_category,
    rework_instructions: qc.rework_instructions,
    root_cause: qc.root_cause,
    checklist_json: qc.checklist_json || [],
    checked_at: qc.checked_at || new Date().toISOString()
  };

  const { error } = await supabase.from('qc_checks').insert([payload]);
  if (error) console.error('[Supabase Error - insertQCCheck]:', error);
}

// =================================================================
// 8. DISPATCHES
// =================================================================
export async function fetchDispatches(): Promise<Dispatch[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('dispatches').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchDispatches]:', error);
    return null;
  }
  return data as Dispatch[];
}

export async function insertDispatch(dispatch: Dispatch): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const payload = {
    id: ensureUuid(dispatch.id),
    challan_no: dispatch.challan_no,
    job_order_id: ensureNullableUuid(dispatch.job_order_id),
    client_id: ensureNullableUuid(dispatch.client_id),
    dispatched_qty: dispatch.dispatched_qty,
    transporter: dispatch.transporter,
    vehicle_no: dispatch.vehicle_no,
    driver_phone: dispatch.driver_phone,
    lr_no: dispatch.lr_no,
    eway_bill_no: dispatch.eway_bill_no,
    dispatch_date: dispatch.dispatch_date || new Date().toISOString().split('T')[0],
    notes: dispatch.notes,
    created_at: dispatch.created_at || new Date().toISOString()
  };

  const { error } = await supabase.from('dispatches').insert([payload]);
  if (error) console.error('[Supabase Error - insertDispatch]:', error);
}

// =================================================================
// 9. INVOICES & PAYMENTS
// =================================================================
export async function fetchInvoices(): Promise<Invoice[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchInvoices]:', error);
    return null;
  }
  return data as Invoice[];
}

export async function insertInvoice(invoice: Invoice): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const payload = {
    id: ensureUuid(invoice.id),
    invoice_no: invoice.invoice_no,
    financial_year: invoice.financial_year || 'FY 2026-27',
    client_id: ensureNullableUuid(invoice.client_id),
    dispatch_id: ensureNullableUuid(invoice.dispatch_id),
    job_order_id: ensureNullableUuid(invoice.job_order_id),
    invoice_type: invoice.invoice_type || 'labour_only',
    hsn_sac_code: invoice.hsn_sac_code || '9988',
    labour_amount: invoice.labour_amount || 0.00,
    material_amount: invoice.material_amount || 0.00,
    subtotal: invoice.subtotal || 0.00,
    is_interstate: invoice.is_interstate ?? false,
    cgst_rate: invoice.cgst_rate || 9.00,
    cgst_amount: invoice.cgst_amount || 0.00,
    sgst_rate: invoice.sgst_rate || 9.00,
    sgst_amount: invoice.sgst_amount || 0.00,
    igst_rate: invoice.igst_rate || 0.00,
    igst_amount: invoice.igst_amount || 0.00,
    total_amount: invoice.total_amount || 0.00,
    paid_amount: invoice.paid_amount || 0.00,
    status: invoice.status || 'unpaid',
    invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
    due_date: invoice.due_date,
    created_at: invoice.created_at || new Date().toISOString()
  };

  const { error } = await supabase.from('invoices').insert([payload]);
  if (error) console.error('[Supabase Error - insertInvoice]:', error);
}

export async function fetchPayments(): Promise<Payment[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase Error - fetchPayments]:', error);
    return null;
  }
  return data as Payment[];
}

export async function insertPayment(payment: Payment): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const payload = {
    id: ensureUuid(payment.id),
    invoice_id: ensureNullableUuid(payment.invoice_id),
    client_id: ensureNullableUuid(payment.client_id),
    amount: payment.amount,
    mode: payment.mode || 'bank_transfer',
    reference_no: payment.reference_no,
    paid_date: payment.paid_date || new Date().toISOString().split('T')[0],
    notes: payment.notes,
    created_at: payment.created_at || new Date().toISOString()
  };

  const { error } = await supabase.from('payments').insert([payload]);
  if (error) console.error('[Supabase Error - insertPayment]:', error);
}

export async function deleteRowFromTableDb(table: string, id: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) console.error(`[Supabase Error - delete ${table}]:`, error);
}
