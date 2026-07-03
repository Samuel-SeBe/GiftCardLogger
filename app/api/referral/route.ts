import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateReferralCode } from "@/lib/referral";

// Returns the signed-in user's referral link (minting the code on first
// request) plus their referral history: who joined, when, and whether
// they've subscribed yet.
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

    const admin = createAdminClient();
    const { data: referred, error } = await admin
      .from("users")
      .select(
        "display_name, email, created_at, subscription_status, referral_rewarded_at"
      )
      .eq("referred_by", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(`Failed to load referrals: ${error.message}`);
    }

    const referrals = (referred ?? []).map((r) => ({
      name: r.display_name || r.email,
      joined: r.created_at,
      subscribed:
        r.subscription_status === "active" ||
        r.subscription_status === "complimentary",
    }));
    const monthsEarned = (referred ?? []).filter(
      (r) => r.referral_rewarded_at
    ).length;

    return NextResponse.json({
      code,
      url: `${origin}/?ref=${code}`,
      monthsEarned,
      referrals,
    });
  } catch (e) {
    console.error("Referral code failed:", e);
    return NextResponse.json(
      { error: "Could not load your referral link. Please try again." },
      { status: 500 }
    );
  }
}
