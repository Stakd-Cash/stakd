import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://edebxzktapontcymqlzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bbZhhRL69hR0uDDKCcCS0A_ZLzUpBOu';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
