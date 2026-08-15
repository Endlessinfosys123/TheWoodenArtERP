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

// Check if Supabase connection is available
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Company Settings
export async function fetchCompanySettings(): Promise<CompanySettings | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('company_settings').select('*').limit(1).single();
  if (error || !data) return null;
  return data as CompanySettings;
}

export async function saveCompanySettings(settings: Partial<CompanySettings>): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const existing = await fetchCompanySettings();
  if (existing && (existing as { id?: string }).id) {
    await supabase.from('company_settings').update(settings).eq('id', (existing as { id?: string }).id);
  } else {
    await supabase.from('company_settings').insert([settings]);
  }
}

// Clients
export async function fetchClients(): Promise<Client[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('clients').select('*, contact_persons:client_contact_persons(*)').order('created_at', { ascending: false });
  if (error || !data) return null;
  return data.map(item => ({
    ...item,
    contact_persons: item.contact_persons || []
  })) as Client[];
}

export async function insertClient(client: Client): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const { contact_persons, ...clientDb } = client;
  await supabase.from('clients').insert([clientDb]);
  if (contact_persons && contact_persons.length > 0) {
    const cpDb = contact_persons.map(cp => ({ ...cp, client_id: client.id }));
    await supabase.from('client_contact_persons').insert(cpDb);
  }
}

export async function updateClientDb(id: string, updates: Partial<Client>): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const { contact_persons, ...clientDb } = updates;
  if (Object.keys(clientDb).length > 0) {
    await supabase.from('clients').update(clientDb).eq('id', id);
  }
}

// Vendors
export async function fetchVendors(): Promise<Vendor[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('vendors').select('*').order('created_at', { ascending: false });
  if (error || !data) return null;
  return data as Vendor[];
}

export async function insertVendor(vendor: Vendor): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from('vendors').insert([vendor]);
}

export async function fetchVendorRates(): Promise<VendorRateHistory[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('vendor_rate_history').select('*').order('effective_date', { ascending: false });
  if (error || !data) return null;
  return data as VendorRateHistory[];
}

export async function insertVendorRate(rate: VendorRateHistory): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from('vendor_rate_history').insert([rate]);
}

// Materials
export async function fetchMaterials(): Promise<Material[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
  if (error || !data) return null;
  return data as Material[];
}

export async function insertMaterial(material: Material): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from('materials').insert([material]);
}

export async function fetchMaterialInwards(): Promise<MaterialInward[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('material_inwards').select('*').order('created_at', { ascending: false });
  if (error || !data) return null;
  return data as MaterialInward[];
}

export async function insertMaterialInward(inward: MaterialInward): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from('material_inwards').insert([inward]);
}

// Machines
export async function fetchMachines(): Promise<Machine[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('machines').select('*').order('created_at', { ascending: false });
  if (error || !data) return null;
  return data as Machine[];
}

// Job Orders
export async function fetchJobOrders(): Promise<JobOrder[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('job_orders').select(`
    *,
    sub_ops:job_sub_operations(*),
    files:job_files(*)
  `).order('created_at', { ascending: false });

  if (error || !data) return null;
  return data.map(job => ({
    ...job,
    sub_ops: job.sub_ops || [],
    files: job.files || []
  })) as JobOrder[];
}

export async function insertJobOrder(job: JobOrder): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const { sub_ops, files, audit_logs, ...jobDb } = job;
  await supabase.from('job_orders').insert([jobDb]);
}

export async function updateJobOrderDb(id: string, updates: Partial<JobOrder>): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const { sub_ops, files, audit_logs, ...jobDb } = updates;
  if (Object.keys(jobDb).length > 0) {
    await supabase.from('job_orders').update(jobDb).eq('id', id);
  }
}

// QC Checks
export async function fetchQCChecks(): Promise<QCCheck[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('qc_checks').select('*').order('checked_at', { ascending: false });
  if (error || !data) return null;
  return data as QCCheck[];
}

export async function insertQCCheck(qc: QCCheck): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from('qc_checks').insert([qc]);
}

// Dispatches
export async function fetchDispatches(): Promise<Dispatch[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('dispatches').select('*').order('created_at', { ascending: false });
  if (error || !data) return null;
  return data as Dispatch[];
}

export async function insertDispatch(dispatch: Dispatch): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from('dispatches').insert([dispatch]);
}

// Invoices
export async function fetchInvoices(): Promise<Invoice[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (error || !data) return null;
  return data as Invoice[];
}

export async function insertInvoice(invoice: Invoice): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from('invoices').insert([invoice]);
}

// Payments
export async function fetchPayments(): Promise<Payment[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
  if (error || !data) return null;
  return data as Payment[];
}

export async function insertPayment(payment: Payment): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from('payments').insert([payment]);
}
