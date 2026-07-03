import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, isPlanId } from "@/lib/plans";
import { TRIAL_UPLOAD_LIMIT } from "@/lib/access";

export type Usage = { used: number; limit: number; kind: "trial" | "plan" };

export type Allowance = {
  allowed: boolean;
  reason?: "trial_expired" | "plan_limit";
  usage: Usage | null; // null means unlimited (complimentary / Unlimited)
};

type UserRow = {
  id: string;
  subscription_status: string;
  trial_uploads_used: number;
  plan: string | null;
  current_period_start: string | null;
};

// May this user upload right now, and what should the counter show?
export async function getAllowance(row: UserRow): Promise<Allowance> {
  if (row.subscription_status === "complimentary") {
    return { allowed: true, usage: null };
  }

  if (row.subscription_status === "active") {
    const plan = isPlanId(row.plan) ? row.plan : null;
    const cap = plan ? PLANS[plan].uploadsPerMonth : null;
    if (cap === null) {
      // Unlimited plan (or a legacy subscriber with no plan recorded —
      // never lock out a paying customer over missing metadata).
      return { allowed: true, usage: null };
    }
    // Anchor to the billing period; if it's somehow missing, a rolling 30
    // days is the fair fallback.
    const since =
      row.current_period_start ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const used = await countUploadsSince(row.id, since);
    const usage: Usage = { used: Math.min(used, cap), limit: cap, kind: "plan" };
    if (used >= cap) {
      return { allowed: false, reason: "plan_limit", usage };
    }
    return { allowed: true, usage };
  }

  // Free trial (status trial/canceled): lifetime allotment.
  const usage: Usage = {
    used: Math.min(row.trial_uploads_used, TRIAL_UPLOAD_LIMIT),
    limit: TRIAL_UPLOAD_LIMIT,
    kind: "trial",
  };
  if (row.trial_uploads_used >= TRIAL_UPLOAD_LIMIT) {
    return { allowed: false, reason: "trial_expired", usage };
  }
  return { allowed: true, usage };
}

export async function countUploadsSince(
  userId: string,
  sinceIso: string
): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);
  if (error) {
    throw new Error(`Failed to count usage: ${error.message}`);
  }
  return count ?? 0;
}

// Recorded for every successful upload, every tier — counts and
// timestamps only, no card data. This is also the dataset that informs
// future pricing decisions.
export async function recordUpload(
  userId: string,
  cardsDetected: number
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("usage_events")
    .insert({ user_id: userId, cards_detected: cardsDetected });
  if (error) {
    // Never fail the user's upload over a metering write.
    console.error("Usage event insert failed:", error.message);
  }
}
