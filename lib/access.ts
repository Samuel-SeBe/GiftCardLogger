export const TRIAL_UPLOAD_LIMIT = 5;

// Who may upload:
// - "active": paying subscriber (managed by the Stripe webhook)
// - "complimentary": free pass, granted by hand in Supabase for friends,
//   family, and beta testers
// - anyone else while they still have trial uploads left
export function canUpload(user: {
  subscription_status: string;
  trial_uploads_used: number;
}): boolean {
  return (
    user.subscription_status === "active" ||
    user.subscription_status === "complimentary" ||
    user.trial_uploads_used < TRIAL_UPLOAD_LIMIT
  );
}
