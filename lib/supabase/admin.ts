import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client that bypasses row-level security.
// Used for writes the browser must never be able to make directly
// (trial counts, subscription state, stored tokens).
// SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
