// Pure string helpers for gift-card codes, shared by the review UI and
// covered by unit tests.

// Removes whitespace only, so grouped codes collapse (e.g. "6050 1234" ->
// "60501234") while dashes in claim codes (Amazon/DoorDash) are preserved.
export function stripSpaces(value: string): string {
  return value.replace(/\s+/g, "");
}

// Inserts a space every 4 characters for readability. Used for card numbers
// that have no spaces or dashes; a trailing partial group is kept as-is.
export function groupFour(value: string): string {
  return value.replace(/(.{4})/g, "$1 ").trim();
}

// Groups a card number every 4 chars only when it has no existing spaces or
// dashes and is long enough to benefit; otherwise returns it unchanged.
export function groupCardNumber(value: string): string {
  if (/[\s-]/.test(value) || value.length <= 4) return value;
  return groupFour(value);
}
