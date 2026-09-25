/* BAYBREEZE Business OS — Supabase client config
   Public URL + anon key are safe to expose client-side (that's what they're for).
   Never put the service_role key in this file or any client code. */
const SUPABASE_URL = 'https://dvbjftyvjmbmmismetlv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YmpmdHl2am1ibW1pc21ldGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDkxNjUsImV4cCI6MjEwNTg4NTE2NX0.JgchHt-jdLbRTyhyUp4ojGO-5CU4sAQGTNsDXor3gNA';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
