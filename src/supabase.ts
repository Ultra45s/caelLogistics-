
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://segdgtllqoimmlffjnhl.supabase.co';
const supabaseAnonKey = 'sb_publishable_RrgtvmYGb2li2LvsiOrKIQ_KpeM9EHH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
