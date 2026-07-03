import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

// Server-only Supabase client that bypasses row-level security.
// Used for writes the browser must never be able to make directly
// (trial counts, subscription state, stored tokens).
// SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser.
export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
