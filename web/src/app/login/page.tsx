import { signIn } from '@/features/auth/actions';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Field } from '@/components/common/Field';

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
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="mb-4 text-center">IPSS Web — Sign in</h1>
        <Card>
          {message ? (
            <p role="alert" className="mb-3 text-danger">
              {message}
            </p>
          ) : null}
          <form action={signIn} className="flex flex-col gap-3">
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <Button type="submit" size="lg">
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
