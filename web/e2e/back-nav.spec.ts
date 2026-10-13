import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * System-wide back navigation (BN-01…05): explicit parent routes, never
 * browser history. Role parents stay inside each role's authorized pages.
 */

const ACCOUNTS = {
  admin: { email: 'admin@elvira.cafe', password: 'admin123' },
  cashier: { email: 'cashier@elvira.cafe', password: 'cashier123' },
};

async function clientFor(role: keyof typeof ACCOUNTS): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing Supabase E2E environment.');
  const client = createClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword(ACCOUNTS[role]);
  expect(error).toBeNull();
  return client;
}

async function login(page: Page, role: keyof typeof ACCOUNTS) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ACCOUNTS[role].email);
  await page
    .getByLabel('Password', { exact: true })
    .fill(ACCOUNTS[role].password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(
    role === 'cashier' ? /\/dashboard$/ : /\/admin$/,
    { timeout: 30_000 },
  );
}

function backLinks(page: Page) {
  return page.getByRole('link', { name: /^back /i });
}

test('BN-01 receipt back link returns to POS without side effects', async ({
  page,
}) => {
  const cashier = await clientFor('cashier');
  const { data: product } = await cashier
    .from('product')
    .select('product_id, price')
    .eq('is_available', true)
    .order('product_id')
    .limit(1)
    .single();
  const { data: receiptId, error } = await cashier.rpc('process_sale', {
    p_transaction_id: crypto.randomUUID(),
    p_payment_mode: 'cash',
    p_amount_received: Number(product!.price),
    p_change_given: 0,
    p_items: [{ product_id: product!.product_id, quantity: 1 }],
    p_date: new Date().toISOString(),
  });
  expect(error).toBeNull();
  const { count: before } = await cashier
    .from('transactions')
    .select('id', { count: 'exact', head: true });
  try {
    await login(page, 'cashier');
    await page.goto(`/pos/receipt/${receiptId as string}`);
    const links = backLinks(page);
    await expect(links).toHaveCount(1);
    await expect(links.first()).toHaveAttribute('href', '/pos');
    await links.first().click();
    await expect(page).toHaveURL(/\/pos$/);
    const { count: after } = await cashier
      .from('transactions')
      .select('id', { count: 'exact', head: true });
    expect(after).toBe(before);
  } finally {
    await cashier.rpc('void_sale', {
      p_transaction_id: receiptId as string,
      p_reason: 'BN-01 cleanup',
    });
  }
});

test('BN-02 product form back links return to Menu', async ({ page }) => {
  const admin = await clientFor('admin');
  const { data: product } = await admin
    .from('product')
    .select('product_id')
    .order('product_id')
    .limit(1)
    .single();
  await login(page, 'admin');
  await page.goto('/admin/menu/product/new');
  const newLinks = backLinks(page);
  await expect(newLinks).toHaveCount(1);
  await newLinks.first().click();
  await expect(page).toHaveURL(/\/admin\/menu$/);
  await page.goto(`/admin/menu/product/${product!.product_id}`);
  const editLinks = backLinks(page);
  await expect(editLinks).toHaveCount(1);
  await editLinks.first().click();
  await expect(page).toHaveURL(/\/admin\/menu$/);
});

test('BN-03 shift report uses role-appropriate parents', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/shift-report');
  const adminLinks = backLinks(page);
  await expect(adminLinks).toHaveCount(1);
  await expect(adminLinks.first()).toHaveAttribute('href', '/admin/reports');
  await adminLinks.first().click();
  await expect(page).toHaveURL(/\/admin\/reports/);

  await page.goto('/pos');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'cashier');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/shift-report');
  const cashierLinks = backLinks(page);
  await expect(cashierLinks).toHaveCount(1);
  await expect(cashierLinks.first()).toHaveAttribute('href', '/daily-sales');
  await cashierLinks.first().click();
  await expect(page).toHaveURL(/\/daily-sales$/);
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(390);
});

test('BN-04 dashboards rely on sidebar nav without back links', async ({
  page,
}) => {
  await login(page, 'admin');
  await page.goto('/admin');
  await expect(backLinks(page)).toHaveCount(0);
  await page.goto('/pos');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'cashier');
  await page.goto('/dashboard');
  await expect(backLinks(page)).toHaveCount(0);
});

test('BN-05 cashier back links never point at admin pages', async ({
  page,
}) => {
  await login(page, 'cashier');
  for (const route of ['/pos', '/daily-sales', '/today-products']) {
    await page.goto(route);
    const hrefs = await backLinks(page).evaluateAll((elements) =>
      elements.map((el) => el.getAttribute('href')),
    );
    for (const href of hrefs) {
      expect(href ?? '').not.toMatch(/^\/admin/);
    }
  }
});
