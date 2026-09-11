import { createBrowserClient } from '@supabase/ssr';
import { supabasePublicEnv } from './env';

/** Client Components → browser client. */
export function createClient() {
  const { url, anonKey } = supabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
