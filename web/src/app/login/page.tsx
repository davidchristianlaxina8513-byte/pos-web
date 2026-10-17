import { signIn } from '@/features/auth/actions';
import { Button } from '@/components/form/Button';
import { Field } from '@/components/form/Field';
import { PasswordField } from '@/components/form/PasswordField';
import {
  ArrowRightIcon,
  LeafMark,
  LockIcon,
  MailIcon,
} from '@/components/common/icons';

const ERRORS: Record<string, string> = {
  missing_credentials: 'Enter your email and password.',
  invalid_credentials: 'Sign-in failed. Check your details and try again.',
  unknown_role: 'This account has no staff role. Ask an admin to check it.',
  account_disabled: 'This account is disabled. Ask an admin to check it.',
};

const LOGIN_INPUT =
  'h-10 rounded-md border-sage-200 bg-white text-sm shadow-none hover:border-sage-300 focus:border-pine focus:outline-2 focus:outline-offset-2 focus:outline-pine/20';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = (error && ERRORS[error]) || null;

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
          <span className="mt-2 font-serif text-3xl leading-none tracking-tight text-pine-deep">
            ElviraCafe
          </span>
          <p className="mt-3 text-xs font-semibold tracking-[0.28em] text-secondary uppercase">
            Simplify. Manage. Grow.
          </p>
        </div>

        <section
          aria-labelledby="login-title"
          className="rounded-2xl border border-sage-200 bg-white px-6 py-8 shadow-soft sm:px-10 sm:py-10"
        >
          <h1
            id="login-title"
            className="text-2xl font-bold tracking-tight text-pine-deep sm:text-3xl"
          >
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Log in to your coffee shop dashboard and keep everything running
            smoothly.
          </p>

          <form action={signIn} className="mt-7 flex flex-col gap-4">
            {message ? (
              <p
                role="alert"
                className="rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm leading-5 text-danger"
              >
                {message}
              </p>
            ) : null}
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              startIcon={<MailIcon />}
              labelClassName="text-sm font-medium text-pine-deep"
              inputClassName={LOGIN_INPUT}
            />
            <PasswordField
              label="Password"
              name="password"
              placeholder="Enter your password"
              required
              startIcon={<LockIcon />}
              labelClassName="text-sm font-medium text-pine-deep"
              inputClassName={LOGIN_INPUT}
            />
            <Button
              type="submit"
              size="md"
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-pine-deep text-sm font-semibold text-white transition-colors hover:bg-pine focus-visible:outline-pine"
            >
              Log In <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-8 border-t border-sage-200 pt-6 text-center text-sm text-muted">
            Need an account or password help?{' '}
            <span className="font-medium text-pine-deep">Ask your admin.</span>
          </p>
        </section>
      </div>
    </main>
  );
}
