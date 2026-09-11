import { afterEach, expect, test, vi } from 'vitest';
import { supabasePublicEnv } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

test('returns url + key when set', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'key');
  expect(supabasePublicEnv()).toEqual({
    url: 'https://example.supabase.co',
    anonKey: 'key',
  });
});

test('throws naming the missing url', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'key');
  expect(() => supabasePublicEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL');
});

test('throws naming the missing key', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  expect(() => supabasePublicEnv()).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY');
});
