import { signIn } from '@/features/auth/actions';
import { LoginHero } from '@/features/auth/components/LoginHero';
import { Button } from '@/components/common/Button';
import { Field } from '@/components/common/Field';
import { PasswordField } from '@/components/common/PasswordField';
import { ArrowRightIcon, LeafMark } from '@/components/common/icons';
import pkg from '../../../package.json';

const ERRORS: Record<string, string> = {
  missing_credentials: 'Enter your email and password.',
  invalid_credentials: 'Sign-in failed. Check your details and try again.',
  unknown_role: 'This account has no staff role. Ask an admin to check it.',
  account_disabled: 'This account is disabled. Ask an admin to check it.',
};

const HERO_INPUT =
  'h-[52px] rounded-2xl border-transparent bg-mist px-3.5 text-[15px]';

/** v2 login: illustrated hero, plain fields, pill Log In, version strip. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = (error && ERRORS[error]) || null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6 text-foreground">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2">
          <LeafMark className="h-7 w-7 text-pine" />
          <span className="text-[17px] font-extrabold tracking-tight">
            ElviraCafe
          </span>
        </div>

        <div className="mt-3 rounded-card bg-sage-100 p-3">
          <LoginHero />
        </div>

        <h1 className="mt-7 text-[26px] font-extrabold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm leading-5 text-muted">
          Manage your business easily and efficiently.
        </p>

        <form action={signIn} className="mt-7 flex flex-col gap-3">
          {message ? (
            <p role="alert" className="text-center text-sm text-danger">
              {message}
            </p>
          ) : null}
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            required
            inputClassName={HERO_INPUT}
          />
          <PasswordField
            label="Password"
            name="password"
            placeholder="Enter your password"
            required
            inputClassName={HERO_INPUT}
          />
          <Button
            type="submit"
            size="lg"
            className="mt-2 flex h-14 items-center justify-center gap-2 rounded-full bg-pine text-surface shadow-active"
          >
            Log In <ArrowRightIcon className="h-5 w-5" />
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-sm text-muted">Create new account</p>
          <p className="mt-1 text-sm font-semibold text-pine">
            Learn more about POS
          </p>
        </div>

        <p className="mt-6 bg-mist px-4 py-3 text-center text-[11px] text-muted">
          <span aria-hidden="true" className="text-leaf">
            ●
          </span>{' '}
          Secure Connection <span aria-hidden="true">•</span> v{pkg.version}
        </p>
      </div>
    </main>
  );
}
