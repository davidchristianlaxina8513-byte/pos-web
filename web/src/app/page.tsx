import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/features/auth/queries';
import { landingForRole } from '@/features/auth/roles';

export const dynamic = 'force-dynamic';

/** Role-aware home: anonymous → /login; signed in → immediate role landing. */
export default async function Home() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  redirect(landingForRole(profile.role));
}
