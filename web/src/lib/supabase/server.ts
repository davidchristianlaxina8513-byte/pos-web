import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabasePublicEnv } from './env';

/** Server Components/Functions/Route Handlers → cookie-aware server client. */
export async function createClient() {
  const { url, anonKey } = supabasePublicEnv();
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Proxy owns refresh writes. */
        }
      },
    },
  });
}
