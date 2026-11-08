import { createClient } from "@supabase/supabase-js";

// The publishable key is designed for browser use. Never put a service_role/secret key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kaqixdywayjhemdqhhfa.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_rngeFiUXDV8wcTfplSqAAw_-m0CLz6q";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
