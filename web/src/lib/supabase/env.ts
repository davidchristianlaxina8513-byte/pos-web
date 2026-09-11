export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

/**
 * Validated accessor for the public Supabase config. Fails fast naming the
 * missing variable (never include values in the message — keys are public
 * config, but logs stay value-free by convention).
 */
export function supabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL (see web/.env.example).');
  }
  if (!anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (see web/.env.example).',
    );
  }
  return { url, anonKey };
}
