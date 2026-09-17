import { expect, test, type Locator } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const CASHIER_EMAIL = 'cashier@elvira.cafe';
const CASHIER_PASSWORD = 'cashier123';
const SALE_QTY = 2;

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

async function stockFor(productId: number): Promise<number> {
  const { url, anonKey } = supabaseEnv();
  const supabase = createClient(url, anonKey);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: CASHIER_EMAIL,
    password: CASHIER_PASSWORD,
  });
  expect(signInError).toBeNull();
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', productId);
  expect(error).toBeNull();
  const rows = (data ?? []) as { quantity: number | string }[];
  return rows.reduce((sum, row) => sum + Number(row.quantity), 0);
}

async function productIdByName(name: string): Promise<number> {
  const { url, anonKey } = supabaseEnv();
  const supabase = createClient(url, anonKey);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: CASHIER_EMAIL,
    password: CASHIER_PASSWORD,
  });
  expect(signInError).toBeNull();
  // Names are not unique in the demo catalog: take the lowest id.
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

/**
 * Cashier happy path: login → browse → add ×2 → cash checkout → receipt →
 * stock deducts → sign out.
 */
test('pos smoke: cash sale deducts stock and renders a receipt', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(CASHIER_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(CASHIER_PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/pos$/);

  const candidates = page.getByRole('button', { name: /^Add / });
  // The menu streams in after navigation commits; count() doesn't retry.
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
    // The shared dev catalog drains as the suite buys stock, so only take
    // an item that still has enough units for this sale.
    if ((await stockFor(await productIdByName(name))) < SALE_QTY) continue;
    itemName = name;
    addButton = candidate;
    break;
  }
  expect(itemName.length).toBeGreaterThan(0);
  expect(addButton).not.toBeNull();
  const productId = await productIdByName(itemName);
  const stockBefore = await stockFor(productId);
  expect(stockBefore).toBeGreaterThanOrEqual(SALE_QTY);

  // v2 cards swap the add tile for a stepper after the first unit, so the
  // second unit goes through the stepper (same cart reducer path).
  await addButton?.click();
  await page
    .getByRole('button', { name: `Increase ${itemName}` })
    .first()
    .click();
  const totalText = (await page.getByText(/^Total: ₱/).textContent()) ?? '';
  const total = Number(totalText.replace(/^Total: ₱/, ''));
  expect(Number.isFinite(total) && total > 0).toBe(true);

  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByRole('dialog', { name: 'Check Out' })).toBeVisible();
  await page.getByLabel('Amount received').fill(String(total + 100));
  await page.getByRole('button', { name: 'Process Checkout' }).click();

  await expect(page).toHaveURL(/\/pos\/receipt\//);
  await expect(page.getByText(/Order #\d+/)).toBeVisible();
  await expect(page.getByText('Change: ₱100.00')).toBeVisible();

  expect(await stockFor(productId)).toBe(stockBefore - SALE_QTY);

  await page.goto('/pos');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
