
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://segdgtllqoimmlffjnhl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RrgtvmYGb2li2LvsiOrKIQ_KpeM9EHH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
