import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'admin@elvira.cafe';
const ADMIN_PASSWORD = 'admin123';

function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return { url, anonKey };
}

async function adminClient(): Promise<SupabaseClient> {
  const { url, anonKey } = supabaseEnv();
  const supabase = createClient(url, anonKey);
  const { error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  expect(error).toBeNull();
  return supabase;
}

async function stockState(productId: number): Promise<{
  stockId: number;
  quantity: number;
}> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from('inventory')
    .select('stock_id, quantity')
    .eq('product_id', productId)
    .order('stock_id')
    .limit(1)
    .maybeSingle();
  expect(error).toBeNull();
  const row = data as { stock_id: number; quantity: number } | null;
  expect(row).not.toBeNull();
  const quantity = Number((row as { quantity: number | string }).quantity);
  return { stockId: (row as { stock_id: number }).stock_id, quantity };
}

async function productIdByName(name: string): Promise<number> {
  const supabase = await adminClient();
  // Names are not unique in the demo catalog: take the lowest id, and use
  // that same id for every read in the test.
  const { data, error } = await supabase
    .from('product')
    .select('product_id')
    .eq('name', name)
    .order('product_id')
    .limit(1);
  expect(error).toBeNull();
  const id = (data as { product_id: number }[] | null)?.[0]?.product_id;
  expect(typeof id).toBe('number');
  return id as number;
}

async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test('admin hub renders dashboard metrics and nav', async ({ page }) => {
  await signInAsAdmin(page);
  await expect(page.getByText(/Total revenue: ₱/)).toBeVisible();
  await expect(page.getByText(/Total orders: \d+/)).toBeVisible();
  await expect(page.getByRole('img', { name: 'Revenue by day' })).toBeVisible();
  for (const label of ['POS', 'Inventory', 'Menu', 'Reports', 'Users']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }
});

test('cashier cannot reach admin pages', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('cashier@elvira.cafe');
  await page.getByLabel('Password').fill('cashier123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/pos$/);
  await page.goto('/admin/inventory');
  await expect(page).toHaveURL(/\/pos$/);
  await page.goto('/admin/menu');
  await expect(page).toHaveURL(/\/pos$/);
});

test('stock-in adds quantity', async ({ page }) => {
  await signInAsAdmin(page);
  const before = await stockState(await productIdByName('Latte'));
  await page.goto(`/admin/inventory/stock-in/${before.stockId}`);
  await page.getByLabel('Quantity').fill('3');
  await page.getByRole('button', { name: 'Save stock-in' }).click();
  await expect(page).toHaveURL(/\/admin\/inventory$/);
  const after = await stockState(await productIdByName('Latte'));
  expect(after.quantity).toBe(before.quantity + 3);
});

test('menu product create and delete round-trip', async ({ page }) => {
  await signInAsAdmin(page);
  const name = `E2E Item ${Date.now()}`;
  await page.goto('/admin/menu/product/new');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByLabel('Price').fill('9.99');
  await page.getByRole('button', { name: 'Add product' }).click();
  await expect(page).toHaveURL(/\/admin\/menu$/);
  await expect(page.getByText(name)).toBeVisible();

  await page
    .locator('li', { hasText: name })
    .getByRole('link', { name: 'Edit' })
    .click();
  await expect(page.getByLabel('Name')).toHaveValue(name);
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page).toHaveURL(/\/admin\/menu$/);
  await expect(page.getByText(name)).toHaveCount(0);
});

test('reports render summaries', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/admin/reports');
  await expect(page.getByText(/Revenue: ₱/)).toBeVisible();
  await expect(page.getByText(/Orders: \d+/)).toBeVisible();
  await expect(page.getByText(/Stock value: ₱/)).toBeVisible();
  await page.getByRole('link', { name: '7 days' }).click();
  await expect(page).toHaveURL(/preset=7d/);
  await expect(page.getByText(/Revenue: ₱/)).toBeVisible();
});

test('staff create, disable, and disabled login', async ({ page }) => {
  await signInAsAdmin(page);
  const email = `e2e-${Date.now()}@elvira.cafe`;
  const password = 'e2e-secret-1';
  await page.goto('/admin/users');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(email)).toBeVisible();

  await page
    .locator('li', { hasText: email })
    .getByRole('button', { name: 'Disable' })
    .click();
  await page
    .locator('li', { hasText: email })
    .getByRole('button', { name: 'Confirm' })
    .click();
  await expect(
    page.locator('li', { hasText: email }).getByText('Disabled'),
  ).toBeVisible();

  await page.goto('/pos');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/error=account_disabled/);
  await expect(page.getByRole('alert')).toContainText('disabled');
});
