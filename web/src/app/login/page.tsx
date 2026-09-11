import { signIn } from '@/features/auth/actions';

const ERRORS: Record<string, string> = {
  missing_credentials: 'Enter your email and password.',
  invalid_credentials: 'Sign-in failed. Check your details and try again.',
  unknown_role: 'This account has no staff role. Ask an admin to check it.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = (error && ERRORS[error]) || null;
  return (
    <main className="bg-background text-foreground">
      <h1>IPSS Web — Sign in</h1>
      {message ? <p role="alert">{message}</p> : null}
      <form action={signIn} className="bg-surface border-border">
        <label>
          Email{' '}
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password{' '}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
