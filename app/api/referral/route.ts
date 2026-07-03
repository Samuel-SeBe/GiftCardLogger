import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateReferralCode } from "@/lib/referral";

// Returns the signed-in user's referral link, minting the code on first
// request.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const code = await getOrCreateReferralCode(user.id);
    const origin = new URL(request.url).origin;
    return NextResponse.json({ code, url: `${origin}/?ref=${code}` });
  } catch (e) {
    console.error("Referral code failed:", e);
    return NextResponse.json(
      { error: "Could not load your referral link. Please try again." },
      { status: 500 }
    );
  }
}
