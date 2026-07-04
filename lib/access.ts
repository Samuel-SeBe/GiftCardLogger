// Free-trial allotment: lifetime image uploads before a plan is required.
// Plan-based monthly limits live in lib/plans.ts and lib/usage.ts.
export const TRIAL_UPLOAD_LIMIT = 5;

// Most cards we read from a single photo. Extras are dropped with a note
// so a huge batch never fails the whole upload.
export const MAX_CARDS_PER_UPLOAD = 10;
