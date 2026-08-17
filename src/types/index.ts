// =================================================================
// CNC JOB WORK ERP SYSTEM - COMPLETE TYPESCRIPT DEFINITIONS
// =================================================================

export type UserRole = 
  | 'admin' 
  | 'production_manager' 
  | 'store_clerk' 
  | 'qc_inspector' 
  | 'accounts' 
  | 'operator';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  created_at?: string;
}

export interface ContactPerson {
  id: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
}

export interface Client {
  id: string;
  company_name: string;
  gstin: string;
  contact_person: string; // Primary contact
  phone: string;
  email: string;
  billing_address: string;
  shipping_address: string;
  city: string;
  state_code: string;
  state_name: string;
  credit_terms: string;
  payment_due_days: number;
  credit_limit: number;
  status: 'active' | 'inactive';
  outstanding_balance: number;
  contact_persons: ContactPerson[];
  created_at: string;
}

export interface Vendor {
  id: string;
  vendor_name: string;
  gstin: string;
  category: 'raw_material' | 'outsourced_process' | 'tooling';
  contact_person: string;
  phone: string;
  email: string;
  city: string;
  state_code: string;
  address: string;
  outstanding_payable: number;
  created_at: string;
}

export interface VendorRateHistory {
  id: string;
  vendor_id: string;
  vendor_name: string;
  material_name: string;
  rate_per_unit: number;
  effective_date: string;
}

export type MaterialSourceType = 'own_stock' | 'client_supplied';

export type MaterialCategory = 
  | 'MDF' 
  | 'Wooden' 
  | 'Corian' 
  | 'MS' 
  | 'SS' 
  | 'Acrylic' 
  | 'Aluminium' 
  | 'Brass'
  | 'Other';

export type MaterialUnit = 
  | 'sq_ft' 
  | 'sheet' 
  | 'kg' 
  | 'pcs' 
  | 'mm' 
  | 'inch' 
  | 'meter' 
  | 'sq_m';

export type ThicknessUnit = 'mm' | 'inch';
export type DimensionUnit = 'ft' | 'inch' | 'mm';

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  grade: string;
  unit: MaterialUnit;
  hsn_code: string;
  thickness: number;
  thickness_unit: ThicknessUnit;
  sheet_length?: number;
  sheet_width?: number;
  dimension_unit?: DimensionUnit;
  sqft_per_sheet?: number;
  current_stock: number; // Own stock qty in selected unit (e.g., sq_ft or sheet)
  reorder_level: number;
  unit_cost: number; // Rate per sq_ft / sheet / kg
  batch_tracking_enabled: boolean;
  created_at: string;
}

export interface ClientMaterialStock {
  id: string;
  client_id: string;
  client_name: string;
  material_id: string;
  material_name: string;
  allocated_job_no?: string;
  qty: number;
  unit: string;
}

export type StockLedgerType = 'grn_inward' | 'issue_to_job' | 'return_to_stock' | 'scrap_entry';

export interface MaterialInward {
  id: string;
  ledger_type: StockLedgerType;
  material_id: string;
  material_name?: string;
  client_id?: string | null;
  client_name?: string | null;
  job_order_id?: string | null;
  job_no?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  source_type: MaterialSourceType;
  batch_no?: string;
  heat_no?: string;
  dimensions: string;
  qty: number;
  unit_rate: number;
  inward_date: string;
  challan_no: string;
  notes?: string;
  created_at: string;
}

export interface Machine {
  id: string;
  name: string;
  code: string;
  machine_type: 'CNC Turning' | 'VMC 3-Axis' | 'VMC 5-Axis' | 'CNC Lathe' | 'Wire EDM' | 'Grinding';
  status: 'Active' | 'Maintenance' | 'Offline';
  hourly_rate: number;
  capacity_hours_per_day: number;
}

export type JobStatus = 
  | 'Order Received' 
  | 'Material Allocated' 
  | 'Programming' 
  | 'Machining' 
  | 'Quality Check' 
  | 'Rework'
  | 'Ready for Dispatch' 
  | 'Delivered';

export type JobPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface SubOperation {
  id: string;
  op_sequence: number;
  op_name: string; // e.g., Rough Turning, VMC Milling, Deburring
  machine_id: string;
  machine_name?: string;
  operator_id?: string;
  operator_name?: string;
  estimated_min: number;
  actual_min: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface DrawingComment {
  id: string;
  user_name: string;
  role: string;
  text: string;
  created_at: string;
}

export interface JobFile {
  id: string;
  job_order_id?: string;
  client_id?: string;
  file_name: string;
  file_url: string;
  file_type: 'pdf' | 'image' | 'cad';
  version: number;
  is_latest: boolean;
  approval_status: 'draft' | 'approved' | 'superseded';
  uploaded_by_name: string;
  uploaded_at: string;
  comments: DrawingComment[];
  dxf_data?: string; // Optional SVG/Canvas path representation for CAD preview
}

export interface JobOrderAuditLog {
  id: string;
  stage: JobStatus;
  user_name: string;
  timestamp: string;
  remarks?: string;
}

export interface JobOrder {
  id: string;
  job_no: string;
  po_ref: string;
  client_id: string;
  client_name?: string;
  part_name: string;
  part_number?: string;
  drawing_ref?: string;
  drawing_version?: number;
  qty: number;
  material_id: string;
  material_name?: string;
  material_source: MaterialSourceType;
  batch_no?: string;
  heat_no?: string;
  machine_id?: string;
  machine_name?: string;
  operator_id?: string;
  operator_name?: string;
  status: JobStatus;
  priority: JobPriority;
  due_date: string;
  estimated_setup_min: number;
  estimated_cycle_min: number;
  actual_setup_min: number;
  actual_cycle_min: number;
  qr_code_token: string;
  notes?: string;
  created_at: string;
  sub_ops?: SubOperation[];
  files?: JobFile[];
  audit_logs?: JobOrderAuditLog[];
}

export interface QCChecklistItem {
  id: string;
  parameter: string; // e.g. Outer Diameter 50±0.02mm
  expected: string;
  actual: string;
  passed: boolean;
}

export interface QCCheck {
  id: string;
  job_order_id: string;
  job_no?: string;
  part_name?: string;
  client_name?: string;
  inspector_name: string;
  inspected_qty: number;
  passed_qty: number;
  failed_qty: number;
  result: 'pass' | 'fail' | 'rework';
  defect_category?: 'Dimensional Out-of-Tolerance' | 'Surface Roughness' | 'Burrs / Chipping' | 'Material Flaw' | 'Tool Wear Marks';
  rework_instructions?: string;
  root_cause?: string;
  checklist_json: QCChecklistItem[];
  photo_urls?: string[];
  checked_at: string;
}

export interface Dispatch {
  id: string;
  challan_no: string;
  job_order_id: string;
  job_no?: string;
  client_id: string;
  client_name?: string;
  part_name?: string;
  dispatched_qty: number;
  transporter: string;
  vehicle_no: string;
  driver_phone?: string;
  lr_no?: string;
  eway_bill_no?: string;
  dispatch_date: string;
  notes?: string;
  created_at: string;
}

export type InvoiceType = 'labour_only' | 'material_and_labour';
export type InvoiceStatus = 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';

export interface InvoiceItem {
  id: string;
  job_no: string;
  description: string;
  hsn_sac: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  financial_year: string; // e.g., FY 2026-27
  client_id: string;
  client_name?: string;
  client_gstin?: string;
  client_state_code?: string;
  dispatch_id?: string;
  job_order_id?: string;
  job_no?: string;
  invoice_type: InvoiceType;
  hsn_sac_code: string;
  labour_amount: number;
  material_amount: number;
  subtotal: number;
  is_interstate: boolean; // True if client state != MH (27)
  cgst_rate: number; // 9%
  cgst_amount: number;
  sgst_rate: number; // 9%
  sgst_amount: number;
  igst_rate: number; // 18%
  igst_amount: number;
  total_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface Payment {
  id: string;
  invoice_id: string;
  invoice_no?: string;
  client_id: string;
  client_name?: string;
  amount: number;
  mode: 'bank_transfer' | 'upi' | 'cheque' | 'cash' | 'credit';
  reference_no?: string;
  paid_date: string;
  notes?: string;
  created_at: string;
}

export interface CompanySettings {
  company_name: string;
  gstin: string;
  state_code: string;
  state_name: string;
  address: string;
  phone: string;
  email: string;
  bank_name: string;
  account_no: string;
  ifsc_code: string;
  branch: string;
}

