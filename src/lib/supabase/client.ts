import { createClient as createSupabaseJsClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://zdbalquoryouwgribrmh.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_awwFvU6UhoGTXssmJmJyyQ_f3PwLGqq';

let cachedClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    DEFAULT_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  cachedClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    }
  });

  return cachedClient;
}
