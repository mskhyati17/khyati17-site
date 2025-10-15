// Lightweight initializer: create a Supabase client and attach to window if supabase-config.js is present
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
let supabase = null;
if(SUPABASE_URL && SUPABASE_ANON_KEY){
  try{
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try{ window.supabase = supabase; }catch(e){}
    console.debug('initSupabase: client created');
  }catch(e){ console.warn('initSupabase failed to load supabase-js', e); }
}
export default supabase;
