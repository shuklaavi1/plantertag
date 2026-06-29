import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isMockMode = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('placeholder.supabase.co') || 
  supabaseAnonKey.includes('placeholder-key');

const actualUrl = supabaseUrl || 'https://placeholder.supabase.co';
const actualKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(actualUrl, actualKey);
