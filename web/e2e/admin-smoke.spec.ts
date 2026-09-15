import { expect, test, type Locator, type Page } from '@playwright/test';
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
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test('admin hub renders dashboard metrics and nav', async ({ page }) => {
  await signInAsAdmin(page);
  await expect(page.getByText(/Total revenue: ₱/)).toBeVisible();
  await expect(page.getByText(/Total orders: \d+/)).toBeVisible();
  await expect(page.getByRole('img', { name: 'Revenue by day' })).toBeVisible();
  // Scoped to the hub tiles: the sidebar carries same-named section links.
  const hubNav = page.locator('nav[aria-label="Admin sections"]');
  for (const label of [
    'Register',
    'Orders',
    'Inventory',
    'Analytics',
    'Menu',
    'Settings',
    'Users',
  ]) {
    await expect(hubNav.getByRole('link', { name: label })).toBeVisible();
  }
});

test('pos header links admin to dashboard, cashier sees no dashboard link', async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto('/pos');
  await page.locator('main').getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto('/pos');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill('cashier@elvira.cafe');
  await page.getByLabel('Password', { exact: true }).fill('cashier123');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/pos$/);
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
});

test('mobile drawer opens from the hamburger and navigates', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsAdmin(page);
  await page.goto('/pos');
  // The closed drawer is translated off-canvas (it keeps a bounding box,
  // so visibility assertions can't see the state — assert the class).
  const nav = page.locator('#staff-primary-nav');
  await expect(nav).toHaveClass(/-translate-x-full/);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(nav).toHaveClass(/translate-x-0/);
  await page
    .locator('#staff-primary-nav')
    .getByRole('link', { name: 'Dashboard' })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
});

test('avatar links to the role profile page', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/pos');
  await page.getByRole('link', { name: 'View profile' }).click();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await expect(page.getByText('Personal information')).toBeVisible();

  // Admins share the settings page — direct /profile visits redirect.
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/admin\/settings$/);

  // Cashiers get the lightweight profile view, never admin settings.
  await page.goto('/pos');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill('cashier@elvira.cafe');
  await page.getByLabel('Password', { exact: true }).fill('cashier123');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/pos$/);
  await page.getByRole('link', { name: 'View profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('Email')).toHaveValue('cashier@elvira.cafe');
  await expect(page.getByLabel('Role')).toHaveValue('Cashier');
  await expect(
    page.getByRole('button', { name: 'Sign out' }).first(),
  ).toBeVisible();
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/pos$/);
});

test('cashier cannot reach admin pages', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('cashier@elvira.cafe');
  await page.getByLabel('Password', { exact: true }).fill('cashier123');
  await page.getByRole('button', { name: 'Log In' }).click();
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

test('reports list receipts and sold items for a new sale', async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto('/pos');
  // Demo stock shifts underfoot (the team shares this DB), so take the
  // first *enabled* Add button rather than assuming the top row sells.
  const candidates = page.getByRole('button', { name: /^Add / });
  await expect(candidates.first()).toBeVisible();
  const candidateCount = await candidates.count();
  let itemName = '';
  let addButton: Locator | null = null;
  for (let index = 0; index < candidateCount; index += 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isDisabled()) continue;
    const label = (await candidate.getAttribute('aria-label')) ?? '';
    const name = label.replace(/^Add | to cart$/g, '').trim();
    if (!name) continue;
    itemName = name;
    addButton = candidate;
    break;
  }
  expect(itemName.length).toBeGreaterThan(0);
  expect(addButton).not.toBeNull();
  await addButton?.click();
  const totalText = (await page.getByText(/^Total: ₱/).textContent()) ?? '';
  const total = Number(totalText.replace(/^Total: ₱/, ''));
  expect(Number.isFinite(total) && total > 0).toBe(true);
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Amount received').fill(String(total + 25));
  await page.getByRole('button', { name: 'Process Checkout' }).click();
  await expect(page).toHaveURL(/\/pos\/receipt\//);
  const orderText = (await page.getByText(/Order #\d+/).textContent()) ?? '';
  const orderMatch = /Order #(\d+)/.exec(orderText);
  expect(orderMatch).not.toBeNull();
  const orderNumber = orderMatch?.[1] ?? '';

  await page.goto('/admin/reports');
  const receiptsCard = page.locator('section', {
    has: page.getByRole('heading', { name: 'Receipts' }),
  });
  const itemsCard = page.locator('section', {
    has: page.getByRole('heading', { name: 'Items sold' }),
  });
  await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible();
  await expect(receiptsCard.getByText(`Order #${orderNumber}`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Items sold' })).toBeVisible();
  await expect(itemsCard.getByText(itemName).first()).toBeVisible();
  await receiptsCard
    .getByRole('link', { name: `View receipt Order #${orderNumber}` })
    .click();
  await expect(page).toHaveURL(/\/pos\/receipt\//);
  await expect(page.getByText(`Order #${orderNumber}`)).toBeVisible();
});

test('settings shows sections and links to user management', async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto('/admin/settings');
  await expect(page.getByText('Personal information')).toBeVisible();
  await expect(page.getByText('Security & password')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Preferences' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'User management' }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
});

test('staff create, disable, and disabled login', async ({ page }) => {
  await signInAsAdmin(page);
  const email = `e2e-${Date.now()}@elvira.cafe`;
  const password = 'e2e-secret-1';
  await page.goto('/admin/users');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  // The action confirms via notice; a full reload re-reads the staff list
  // deterministically (avoids router-cache timing on the dev server).
  await expect(page.getByText('Account created.')).toBeVisible();
  await page.reload();
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
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/error=account_disabled/);
  await expect(
    page.getByText('This account is disabled. Ask an admin to check it.'),
  ).toBeVisible();
});
