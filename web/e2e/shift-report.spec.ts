import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { classifyCategory } from '../src/features/shift-report/classify';

/**
 * End-of-shift report coverage (new test IDs SR-E2E-01…07, see
 * docs/shift-report-tests.md). All fixtures assert DELTAS so the shared DEV
 * database stays usable, and every created sale is voided in `finally`.
 */

const ACCOUNTS = {
  admin: { email: 'admin@elvira.cafe', password: 'admin123' },
  cashier: { email: 'cashier@elvira.cafe', password: 'cashier123' },
};
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
  'base64',
);

function manilaKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

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
  );
}

interface CatalogProduct {
  product_id: number;
  name: string;
  price: number;
  category: string;
}

async function sellableProducts(
  client: SupabaseClient,
): Promise<{ drink: CatalogProduct; food: CatalogProduct }> {
  const [{ data: categories }, { data: products }] = await Promise.all([
    client.from('category').select('category_id, name'),
    client
      .from('product')
      .select('product_id, name, price, category_id, is_available')
      .eq('is_available', true)
      .order('product_id'),
  ]);
  const names = new Map<string, string>();
  for (const row of (categories ?? []) as {
    category_id: unknown;
    name: unknown;
  }[]) {
    if (typeof row.category_id === 'string' && typeof row.name === 'string')
      names.set(row.category_id, row.name);
  }
  let drink: CatalogProduct | null = null;
  let food: CatalogProduct | null = null;
  for (const row of (products ?? []) as {
    product_id: unknown;
    name: unknown;
    price: unknown;
    category_id: unknown;
  }[]) {
    if (
      typeof row.product_id !== 'number' ||
      typeof row.name !== 'string' ||
      !Number.isFinite(Number(row.price))
    )
      continue;
    const category =
      typeof row.category_id === 'string'
        ? (names.get(row.category_id) ?? 'Unclassified')
        : 'Unclassified';
    const kind = classifyCategory(category);
    const entry = {
      product_id: row.product_id,
      name: row.name,
      price: Number(row.price),
      category,
    };
    if (kind === 'drink' && !drink) drink = entry;
    if (kind === 'physical' && !food) food = entry;
    if (drink && food) break;
  }
  expect(drink, 'seeded drink product').toBeTruthy();
  expect(food, 'seeded food product').toBeTruthy();
  return { drink: drink!, food: food! };
}

async function cashSale(
  client: SupabaseClient,
  items: { product_id: number; quantity: number }[],
  total: number,
  dateISO?: string,
): Promise<string> {
  const { data, error } = await client.rpc('process_sale', {
    p_transaction_id: crypto.randomUUID(),
    p_payment_mode: 'cash',
    p_amount_received: total,
    p_change_given: 0,
    p_items: items,
    p_date: dateISO ?? new Date().toISOString(),
  });
  expect(error).toBeNull();
  return data as string;
}

async function voidSale(client: SupabaseClient, id: string) {
  const { error } = await client.rpc('void_sale', {
    p_transaction_id: id,
    p_reason: 'E2E shift-report cleanup',
  });
  expect(error).toBeNull();
}

async function remainingQuota(
  client: SupabaseClient,
  productId: number,
): Promise<number | null> {
  const { data, error } = await client.rpc('get_today_product_quotas');
  expect(error).toBeNull();
  const row = (
    data as { product_id: number; remaining_quantity: number }[]
  ).find((entry) => entry.product_id === productId);
  expect(row).toBeTruthy();
  return row!.remaining_quantity;
}

function parsePeso(text: string | null): number {
  return Number((text ?? '').replace(/[₱,\s]/g, '')) || 0;
}

async function cardValue(page: Page, name: string): Promise<number> {
  const section = page.locator('section', {
    has: page.getByRole('heading', { name, exact: true }),
  });
  return parsePeso(await section.locator('strong').first().textContent());
}

async function readReport(page: Page) {
  return {
    completed: await cardValue(page, 'Completed sales'),
    voided: await cardValue(page, 'Voided'),
    cash: await cardValue(page, 'Cash'),
    collected: await cardValue(page, 'Online collected'),
    pending: await cardValue(page, 'Pending verification'),
  };
}

async function onlineCheckout(
  page: Page,
  mode: 'GCash' | 'Maya',
  reference: string,
): Promise<{ id: string; total: number }> {
  await page.goto('/pos');
  const addButtons = page.getByRole('button', { name: /^Add / });
  await expect(addButtons.first()).toBeVisible();
  const count = await addButtons.count();
  for (let index = 0; index < count; index += 1) {
    const button = addButtons.nth(index);
    if (await button.isEnabled()) {
      await button.click();
      break;
    }
  }
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByRole('dialog', { name: 'Check Out' })).toBeVisible();
  await page.getByRole('button', { name: mode }).click();
  await page.getByLabel('Online transaction reference').fill(reference);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'evidence.png',
    mimeType: 'image/png',
    buffer: ONE_PIXEL_PNG,
  });
  await page.getByRole('button', { name: 'Confirm photo' }).click();
  await page.getByRole('button', { name: 'Process Checkout' }).click();
  await expect(page).toHaveURL(/\/pos\/receipt\//, { timeout: 30_000 });
  const txnNumber =
    (await page.getByText(/^TXN-\d{8}-\d{5}$/).textContent()) ?? '';
  expect(txnNumber).toMatch(/^TXN-\d{8}-\d{5}$/);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing Supabase E2E environment.');
  const client = createClient(url, anonKey);
  expect(
    (await client.auth.signInWithPassword(ACCOUNTS.cashier)).error,
  ).toBeNull();
  const { data, error } = await client
    .from('transactions')
    .select('id, total_amount')
    .eq('transaction_number', txnNumber)
    .single();
  expect(error).toBeNull();
  return { id: data!.id as string, total: Number(data!.total_amount) };
}

test('SR-E2E-00 anonymous shift-report redirects to login', async ({
  page,
}) => {
  await page.goto('/shift-report');
  await expect(page).toHaveURL(/\/login$/);
});

test('SR-E2E-01 cash sales feed products, quotas, and voided totals', async ({
  page,
}) => {
  const admin = await clientFor('admin');
  await login(page, 'admin');
  const { drink, food } = await sellableProducts(admin);
  await page.goto('/shift-report');
  const before = await readReport(page);
  const quotaBefore = await remainingQuota(admin, drink.product_id);
  expect(quotaBefore).not.toBeNull();
  const created: string[] = [];
  try {
    const drinkTotal = drink.price * 2;
    created.push(
      await cashSale(
        admin,
        [{ product_id: drink.product_id, quantity: 2 }],
        drinkTotal,
      ),
    );
    const foodId = await cashSale(
      admin,
      [{ product_id: food.product_id, quantity: 1 }],
      food.price,
    );
    created.push(foodId);
    await page.goto('/shift-report');
    const during = await readReport(page);
    expect(during.completed - before.completed).toBe(drinkTotal + food.price);
    expect(during.cash - before.cash).toBe(drinkTotal + food.price);
    await expect(
      page.getByRole('cell', { name: drink.name }).first(),
    ).toBeVisible();
    expect(await remainingQuota(admin, drink.product_id)).toBe(
      quotaBefore! - 2,
    );
    await voidSale(admin, foodId);
    await page.goto('/shift-report');
    const after = await readReport(page);
    expect(after.completed - before.completed).toBe(drinkTotal);
    expect(after.voided - before.voided).toBe(food.price);
    await expect(page.getByRole('cell', { name: food.name })).toHaveCount(0);
  } finally {
    for (const id of created) await voidSale(admin, id).catch(() => {});
  }
});

test('SR-E2E-02 online pending becomes collected after verification', async ({
  page,
}) => {
  const admin = await clientFor('admin');
  await login(page, 'cashier');
  const reference = `SR-E2E-02-${Date.now() % 1000000}`;
  const pendingIdHolder: string[] = [];
  try {
    const { id, total } = await onlineCheckout(page, 'GCash', reference);
    pendingIdHolder.push(id);
    await login(page, 'admin');
    await page.goto('/shift-report');
    const before = await readReport(page);
    expect(before.pending).toBeGreaterThanOrEqual(total);
    const { error } = await admin.rpc('review_online_payment', {
      p_transaction_id: id,
      p_status: 'verified',
      p_note: 'SR-E2E-02 verify',
    });
    expect(error).toBeNull();
    await page.goto('/shift-report');
    const after = await readReport(page);
    expect(after.collected - before.collected).toBe(total);
    expect(before.pending - after.pending).toBe(total);
    expect(after.completed - before.completed).toBe(0);
  } finally {
    for (const id of pendingIdHolder) await voidSale(admin, id);
  }
});

test('SR-E2E-03 rejected online payments stay out of collected totals', async ({
  page,
}) => {
  const admin = await clientFor('admin');
  await login(page, 'cashier');
  const reference = `SR-E2E-03-${Date.now() % 1000000}`;
  const created: string[] = [];
  try {
    const { id, total } = await onlineCheckout(page, 'Maya', reference);
    created.push(id);
    await login(page, 'admin');
    await page.goto('/shift-report');
    const before = await readReport(page);
    const { error } = await admin.rpc('review_online_payment', {
      p_transaction_id: id,
      p_status: 'rejected',
      p_note: 'SR-E2E-03 reject',
    });
    expect(error).toBeNull();
    await page.goto('/shift-report');
    const after = await readReport(page);
    expect(after.collected - before.collected).toBe(0);
    expect(before.pending - after.pending).toBe(total);
    expect(after.completed - before.completed).toBe(0);
    await expect(
      page.getByText(/excluded from collected totals/),
    ).toBeVisible();
  } finally {
    for (const id of created) await voidSale(admin, id);
  }
});

test('SR-E2E-04 cashier sees only self, even with a manipulated filter', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const admin = await clientFor('admin');
  const { data: adminRow } = await admin
    .from('user')
    .select('user_id')
    .eq('user_id', (await admin.auth.getUser()).data.user!.id)
    .single();
  const adminId = adminRow!.user_id as string;
  await login(page, 'cashier');
  await page.goto('/shift-report');
  const before = await readReport(page);
  await expect(page.locator('select[name="cashier"]')).toHaveCount(0);
  const { drink } = await sellableProducts(admin);
  const otherId = await cashSale(
    admin,
    [{ product_id: drink.product_id, quantity: 1 }],
    drink.price,
  );
  try {
    await page.goto('/shift-report');
    const reread = await readReport(page);
    expect(reread.completed).toBe(before.completed);
    await page.goto(`/shift-report?cashier=${adminId}`);
    const manipulated = await readReport(page);
    expect(manipulated.completed).toBe(before.completed);
    await expect(page.getByText('Showing:')).toBeVisible();
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await voidSale(admin, otherId);
  }
});

test('SR-E2E-05 backdated sales respect Manila day boundaries', async ({
  page,
}) => {
  const admin = await clientFor('admin');
  await login(page, 'admin');
  const { drink } = await sellableProducts(admin);
  const todayKey = manilaKey(new Date());
  const todayMidnight = new Date(`${todayKey}T00:00:00+08:00`).getTime();
  const yesterdayKey = manilaKey(new Date(todayMidnight - 3600_000));
  const backdatedISO = new Date(todayMidnight - 6 * 3600_000).toISOString();
  await page.goto('/shift-report');
  const todayBefore = await readReport(page);
  const created = await cashSale(
    admin,
    [{ product_id: drink.product_id, quantity: 1 }],
    drink.price,
    backdatedISO,
  );
  try {
    await page.goto('/shift-report');
    const todayAfter = await readReport(page);
    expect(todayAfter.completed).toBe(todayBefore.completed);
    await page.goto(`/shift-report?date=${yesterdayKey}`);
    const yesterday = await readReport(page);
    expect(yesterday.completed).toBeGreaterThanOrEqual(drink.price);
  } finally {
    await voidSale(admin, created);
  }
});

test('SR-E2E-06 repeated reads are identical and change nothing', async ({
  page,
}) => {
  const admin = await clientFor('admin');
  await login(page, 'admin');
  const { drink } = await sellableProducts(admin);
  const quotaBefore = await remainingQuota(admin, drink.product_id);
  await page.goto('/shift-report');
  const first = await readReport(page);
  await page.goto('/shift-report');
  const second = await readReport(page);
  expect(second).toEqual(first);
  expect(await remainingQuota(admin, drink.product_id)).toBe(quotaBefore);
});

test('SR-E2E-07 dates without quota rows show Not recorded', async ({
  page,
}) => {
  await login(page, 'admin');
  await page.goto('/shift-report?date=2020-01-01');
  await expect(
    page.getByRole('heading', { name: 'End-of-Shift Report' }),
  ).toBeVisible();
  await expect(page.getByText('Not recorded').first()).toBeVisible();
  await expect(page.getByText('No quota records for this date')).toBeVisible();
});
