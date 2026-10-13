import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/features/auth/queries';
import { landingForRole } from '@/features/auth/roles';
import { signOut } from '@/features/auth/actions';
import { Button } from '@/components/common/Button';
import {
  ArrowRightIcon,
  LeafMark,
  SignOutIcon,
} from '@/components/common/icons';

/** Role-aware home: anonymous → /login; signed in → role page + sign-out. */
export default async function Home() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  const landing = landingForRole(profile.role);
  const destination = profile.role === 'admin' ? 'admin' : 'dashboard';
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-login-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-28 h-64 w-64 rounded-full border border-sage-200/60 bg-sage-100/30 sm:h-96 sm:w-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -left-28 h-72 w-72 rounded-full border border-sage-200/50 bg-sage-100/20 sm:h-96 sm:w-96"
      />

      <div className="relative w-full max-w-[448px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-100 text-pine-deep">
            <LeafMark className="h-6 w-6" />
          </span>
          <span className="mt-2 font-serif text-[30px] leading-none tracking-tight text-pine-deep">
            ElviraCafe
          </span>
          <p className="mt-3 text-[10px] font-semibold tracking-[0.28em] text-secondary uppercase">
            Simplify. Manage. Grow.
          </p>
        </div>

        <section
          aria-labelledby="home-title"
          className="rounded-2xl border border-sage-200 bg-white px-6 py-8 shadow-soft sm:px-10 sm:py-10"
        >
          <h1
            id="home-title"
            className="text-[27px] font-bold tracking-tight text-pine-deep sm:text-[30px]"
          >
            You&apos;re signed in
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Signed in as{' '}
            <span className="font-medium text-pine-deep">{profile.email}</span>{' '}
            ({profile.role}).
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <Link
              href={landing}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-pine-deep text-[15px] font-semibold text-white transition-colors hover:bg-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
            >
              Continue to {destination} <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <form action={signOut}>
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold"
              >
                <SignOutIcon className="h-5 w-5" /> Sign out
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
