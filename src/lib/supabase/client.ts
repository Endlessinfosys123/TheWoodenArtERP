import { createClient as createSupabaseJsClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://zdbalquoryouwgribrmh.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_awwFvU6UhoGTXssmJmJyyQ_f3PwLGqq';

let cachedClient: SupabaseClient | null = null;
let currentCustomUrl: string | null = null;
let currentCustomKey: string | null = null;

export function createClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  let dynamicUrl = customUrl;
  let dynamicKey = customKey;

  if (typeof window !== 'undefined') {
    if (!dynamicUrl) dynamicUrl = localStorage.getItem('cnc_erp_supabase_url') || undefined;
    if (!dynamicKey) dynamicKey = localStorage.getItem('cnc_erp_supabase_key') || undefined;
  }

  const supabaseUrl = dynamicUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = 
    dynamicKey || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    DEFAULT_SUPABASE_KEY;

  if (cachedClient && currentCustomUrl === supabaseUrl && currentCustomKey === supabaseAnonKey) {
    return cachedClient;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  currentCustomUrl = supabaseUrl;
  currentCustomKey = supabaseAnonKey;

  cachedClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    }
  });

  return cachedClient;
}

export function updateDynamicSupabaseConfig(url?: string, key?: string) {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) localStorage.setItem('cnc_erp_supabase_url', url.trim());
    else localStorage.removeItem('cnc_erp_supabase_url');

    if (key && key.trim()) localStorage.setItem('cnc_erp_supabase_key', key.trim());
    else localStorage.removeItem('cnc_erp_supabase_key');
  }
  cachedClient = null;
}
