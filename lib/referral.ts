import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Unambiguous alphabet: no 0/O or 1/I lookalikes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let code = "";
  for (const b of bytes) {
    code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  }
  return code;
}

// Returns the user's referral code, creating one on first request.
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("users")
    .select("referral_code")
    .eq("id", userId)
    .single();
  if (error) {
    throw new Error(`Failed to load user: ${error.message}`);
  }
  if (row.referral_code) {
    return row.referral_code;
  }

  // Retry a few times in the (astronomically unlikely) event of a code
  // collision with another user.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateReferralCode();
    const { error: updateError } = await admin
      .from("users")
      .update({ referral_code: code, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .is("referral_code", null);
    if (!updateError) {
      const { data: after } = await admin
        .from("users")
        .select("referral_code")
        .eq("id", userId)
        .single();
      if (after?.referral_code) {
        return after.referral_code;
      }
    }
  }
  throw new Error("Could not create a referral code");
}

// Called when a user's first subscription payment succeeds: if they were
// referred, credit their referrer with one free month. The
// referral_rewarded_at marker is claimed BEFORE granting so webhook
// retries can never credit twice.
export async function grantReferralReward(
  stripe: Stripe,
  payerUserId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: payer } = await admin
    .from("users")
    .select("referred_by, referral_rewarded_at")
    .eq("id", payerUserId)
    .single();
  if (!payer?.referred_by || payer.referral_rewarded_at) {
    return;
  }

  const { data: referrer } = await admin
    .from("users")
    .select("id, email, stripe_customer_id")
    .eq("id", payer.referred_by)
    .single();
  if (!referrer) {
    return;
  }

  const price = await stripe.prices.retrieve(
    process.env.STRIPE_PRICE_ID!.trim()
  );
  if (!price.unit_amount) {
    return;
  }

  // Claim the reward marker first; only one concurrent webhook wins.
  const { data: claimed } = await admin
    .from("users")
    .update({
      referral_rewarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payerUserId)
    .is("referral_rewarded_at", null)
    .select("id");
  if (!claimed?.length) {
    return;
  }

  // Referrers who never opened checkout have no Stripe customer yet; the
  // banked credit needs one to live on.
  let customerId = referrer.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: referrer.email,
      metadata: { user_id: referrer.id },
    });
    customerId = customer.id;
    await admin
      .from("users")
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referrer.id);
  }

  // Negative balance = credit applied automatically to future invoices.
  await stripe.customers.createBalanceTransaction(customerId, {
    amount: -price.unit_amount,
    currency: price.currency,
    description: "Gift Card Snapper referral reward — 1 free month",
  });
}
