/* BERNAUNG SUPABASE CLIENT
   Fill these two values from Supabase Project Settings > API.
   Use the publishable/anon browser key only. NEVER put service_role here.
*/
const SUPABASE_URL = 'https://yzdfdtnlaphhfohedksc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_TxHZrj5896824hyH9Fe9ew_pe2vlsH0';

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Expose the initialized client for standalone pages such as Theme Director.
if (typeof window !== 'undefined') window.supabaseClient = supabaseClient;

function supabaseReady(){
  return !!supabaseClient &&
    !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
    !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_SUPABASE_PUBLISHABLE_KEY');
}

function randomToken(length = 48){
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

function randomManageId(length = 18){
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

function randomSecret(length = 7){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

async function sha256(value){
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
}

function publicUrl(path){
  if(!path) return '';
  return new URL(path.replace(/^\//,''), location.origin + '/').href;
}
