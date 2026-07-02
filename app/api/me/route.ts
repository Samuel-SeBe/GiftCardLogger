import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Returns the authenticated user's account state.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("users")
    .select(
      "email, display_name, spreadsheet_id, trial_uploads_used, subscription_status, created_at"
    )
    .eq("id", user.id)
    .single();
  if (error || !row) {
    return NextResponse.json({ error: "Account not found" }, { status: 500 });
  }

  return NextResponse.json(row);
}
