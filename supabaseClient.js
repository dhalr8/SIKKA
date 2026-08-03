// ============================================================
// SIKKA Supabase client  (SWE2 Phase 1 — database link)
// Plain-browser setup (NOT Next.js). Requires the CDN script:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// The publishable (anon) key is meant to live in client code.
// ============================================================

var SUPABASE_URL = "https://tjurgrowduwgwlphlizh.supabase.co";
var SUPABASE_KEY = "sb_publishable_ihOlfu_f7-iFLH7Oop_scQ_3DP0nfMU";

// global `supabase` comes from the CDN script
var supa = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
