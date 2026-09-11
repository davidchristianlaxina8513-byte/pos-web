import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCallbackDestination } from '@/features/auth/roles';

/** PKCE callback: exchanges the code, then redirects to an allow-listed destination. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const destination = new URL(
    resolveCallbackDestination(params.get('next')),
    request.url,
  );
  const code = params.get('code');
  if (!code) return NextResponse.redirect(destination);
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) destination.searchParams.set('authError', 'callback_failed');
  return NextResponse.redirect(destination);
}
