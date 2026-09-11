import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/features/auth/queries';
import { landingForRole } from '@/features/auth/roles';
import { signOut } from '@/features/auth/actions';

/** Role-aware home: anonymous → /login; signed in → role page + sign-out. */
export default async function Home() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  const landing = landingForRole(profile.role);
  return (
    <main className="bg-background text-foreground">
      <h1>IPSS Web</h1>
      <p>
        Signed in as {profile.email} ({profile.role}).
      </p>
      <p>
        <a href={landing}>
          Continue to {profile.role === 'admin' ? 'admin' : 'POS'}
        </a>
      </p>
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
