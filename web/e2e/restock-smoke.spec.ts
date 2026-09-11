import { expect, test, type Locator, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'admin@elvira.cafe';
const ADMIN_PASSWORD = 'admin123';
// Distinctive par level so the test card is unambiguous even if demo
// product names repeat (see productIdByName note below).
const TEST_PAR = 777;
// Full restock: 0 + 10 clears the reorder level (8), so the reorder trigger
// closes the loop instead of opening a follow-up request for the remainder.
const RECEIVE_QTY = 10;
const CANCEL_REASON = 'E2E supplier out of stock';

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

async function latteStock(): Promise<{
  productId: number;
  stockId: number;
  quantity: number;
}> {
  const supabase = await adminClient();
  const { data: products, error: productError } = await supabase
    .from('product')
    .select('product_id')
    .eq('name', 'Latte')
    .order('product_id')
    .limit(1);
  expect(productError).toBeNull();
  const productId = (products as { product_id: number }[] | null)?.[0]
    ?.product_id;
  expect(typeof productId).toBe('number');
  const { data, error } = await supabase
    .from('inventory')
    .select('stock_id, quantity')
    .eq('product_id', productId as number)
    .order('stock_id')
    .limit(1)
    .maybeSingle();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  const row = data as { stock_id: number; quantity: number | string };
  return {
    productId: productId as number,
    stockId: row.stock_id,
    quantity: Number(row.quantity),
  };
}

/**
 * Hermetic setup: wipe this product's request history (closed rows from
 * earlier runs would break the strict card counts), then force a fresh
 * pending request by zeroing the shelf with the test par level.
 */
async function forceLowStock(): Promise<{ stockId: number }> {
  const supabase = await adminClient();
  const { productId, stockId } = await latteStock();
  const { error: deleteError } = await supabase
    .from('reorder_requests')
    .delete()
    .eq('product_id', productId);
  expect(deleteError).toBeNull();
  const { error } = await supabase
    .from('inventory')
    .update({ par_level: TEST_PAR, quantity: 0 })
    .eq('stock_id', stockId);
  expect(error).toBeNull();
  return { stockId };
}

async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Generous timeout: the first navigation cold-compiles the admin routes.
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
}

/** Screen list only (excludes the hidden print section). */
function screenList(page: Page): Locator {
  return page.locator('main > div.mt-4');
}

function testCard(page: Page): Locator {
  return screenList(page)
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Latte', exact: true }) })
    .filter({ hasText: `Par ${TEST_PAR}` });
}

test('restock queue: pending to ordered to received bumps inventory', async ({
  page,
}) => {
  await signInAsAdmin(page);
  await expect(page.getByRole('link', { name: /Restock/ })).toBeVisible();

  await forceLowStock();
  await page.goto('/admin/restock');
  const card = testCard(page);
  await expect(card).toHaveCount(1);
  await expect(card.getByText('pending', { exact: true })).toBeVisible();

  await card.getByRole('button', { name: 'Mark ordered' }).click();
  await expect(card.getByText('ordered', { exact: true })).toBeVisible();

  const before = await latteStock();
  await card.getByLabel('Received quantity').fill(String(RECEIVE_QTY));
  await card.getByRole('button', { name: 'Mark received' }).click();
  await expect(card).toHaveCount(0);
  const after = await latteStock();
  expect(after.quantity).toBe(before.quantity + RECEIVE_QTY);

  const supabase = await adminClient();
  const { data: movement, error: movementError } = await supabase
    .from('stock_movements')
    .select('type, quantity')
    .eq('stock_id', after.stockId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  expect(movementError).toBeNull();
  expect(movement).toMatchObject({ type: 'in', quantity: RECEIVE_QTY });

  await page.goto('/admin/restock?status=received');
  await expect(testCard(page)).toHaveCount(1);
});

test('restock print list groups the open queue by supplier', async ({
  page,
}) => {
  await signInAsAdmin(page);
  await forceLowStock();
  await page.goto('/admin/restock');
  await expect(testCard(page)).toHaveCount(1);

  const printSection = page.locator(
    'section[aria-label="Supplier print list"]',
  );
  await expect(printSection).toContainText('Cafe Elvira');
  await expect(printSection).toContainText('Latte');
  await expect(printSection).toContainText(`order ${TEST_PAR}`);

  await page.evaluate(() => {
    (window as unknown as { printed: boolean }).printed = false;
    window.print = () => {
      (window as unknown as { printed: boolean }).printed = true;
    };
  });
  await page.getByRole('button', { name: 'Print supplier list' }).click();
  const printed = await page.evaluate(
    () => (window as unknown as { printed: boolean }).printed,
  );
  expect(printed).toBe(true);
});

test('restock cancel requires a reason and lands in Cancelled', async ({
  page,
}) => {
  // Unique per run so the assertion cannot pass on a previous run's row.
  const reason = `${CANCEL_REASON} ${Date.now()}`;
  await signInAsAdmin(page);
  await forceLowStock();
  await page.goto('/admin/restock');
  const card = testCard(page);
  await expect(card).toHaveCount(1);

  await card.getByRole('button', { name: 'Cancel' }).click();
  const confirm = card.getByRole('button', { name: 'Confirm cancel' });
  await expect(confirm).toBeDisabled();
  await card.getByLabel('Cancel reason').fill(reason);
  await confirm.click();
  await expect(card).toHaveCount(0);

  await page.goto('/admin/restock?status=cancelled');
  const cancelled = testCard(page);
  await expect(cancelled).toHaveCount(1);
  await expect(cancelled).toContainText(reason);
});

test('cashier cannot reach the restock page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('cashier@elvira.cafe');
  await page.getByLabel('Password').fill('cashier123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/pos$/);
  await page.goto('/admin/restock');
  await expect(page).toHaveURL(/\/pos$/);
});
