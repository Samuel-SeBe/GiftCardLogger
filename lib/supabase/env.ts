// Reads Supabase settings from environment variables, tolerating common
// copy-paste variants: surrounding whitespace, a trailing slash, a missing
// protocol, or the REST endpoint URL (".../rest/v1") instead of the plain
// project URL. Only the origin (https://xxx.supabase.co) is ever used.
export function supabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return new URL(withProtocol).origin;
}

export function supabaseAnonKey(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  }
  return raw;
}

export function supabaseServiceRoleKey(): string {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return raw;
}
