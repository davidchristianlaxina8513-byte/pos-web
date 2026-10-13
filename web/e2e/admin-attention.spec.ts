import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Needs Attention alerts are navigation shortcuts (AA-01…04):
 * SEE → CLICK → resolve on the existing page → count refreshes.
 * Fixtures restore quotas and void sales; a verified turnover stays,
 * matching the existing revision-workflows suite.
 */

const ACCOUNTS = {
  admin: { email: 'admin@elvira.cafe', password: 'admin123' },
  cashier: { email: 'cashier@elvira.cafe', password: 'cashier123' },
};
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
  'base64',
);

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

function attentionCard(page: Page) {
  return page.locator('section', {
    has: page.getByRole('heading', { name: 'Needs Attention' }),
  });
}

async function alertCount(
  page: Page,
  pattern: RegExp = /(\d+) products? sold out today/,
) {
  // The dashboard always renders Today's Summary: wait for it so counts are
  // measured on the settled page instead of mid-navigation (count() waits
  // for nothing on its own).
  await expect(
    page.getByRole('heading', { name: "Today's Summary" }),
  ).toBeVisible();
  const card = attentionCard(page);
  if ((await card.count()) === 0) return 0;
  const texts = await card.getByRole('link').allTextContents();
  const match = texts.join(' ').match(pattern);
  return match ? Number(match[1]) : 0;
}

test('AA-01 sold-out alert opens Today\u2019s Products and clears on restore', async ({
  page,
}) => {
  const admin = await clientFor('admin');
  const { data: quotaRows } = await admin.rpc('get_today_product_quotas');
  const target = (
    quotaRows as {
      product_id: number;
      product_name: string;
      today_quota_limit: number | null;
      remaining_quantity: number | null;
      sold_quantity: number | null;
    }[]
  ).find(
    (row) =>
      row.today_quota_limit !== null && (row.remaining_quantity ?? 0) > 0,
  );
  expect(target, 'sellable finite-quota product').toBeTruthy();
  await login(page, 'admin');
  await page.goto('/admin');
  const card = attentionCard(page);
  const before = await alertCount(page);
  // Lower the quota to exactly what sold (the minimum the RPC accepts) so
  // the product reads sold out without touching sales.
  const { error: setError } = await admin.rpc('set_today_product_quota', {
    p_product_id: target!.product_id,
    p_new_quota: target!.sold_quantity ?? 0,
    p_reason: 'AA-01 sold-out fixture',
  });
  expect(setError).toBeNull();
  let during = before;
  try {
    await page.goto('/admin');
    const link = card.getByRole('link', { name: /sold out today/ });
    await expect(link).toBeVisible();
    expect(await link.getAttribute('href')).toBe('/today-products');
    during = await alertCount(page);
    expect(during).toBeGreaterThanOrEqual(before + 1);
    await link.click();
    await expect(page).toHaveURL(/\/today-products$/);
    const productHeading = page.getByRole('heading', {
      name: target!.product_name,
    });
    await expect(productHeading).toBeVisible();
    await expect(page.locator('li', { has: productHeading })).toContainText(
      'Sold Out',
    );
  } finally {
    const { error } = await admin.rpc('set_today_product_quota', {
      p_product_id: target!.product_id,
      p_new_quota: target!.today_quota_limit,
      p_reason: 'AA-01 restore',
    });
    expect(error).toBeNull();
  }
  const { data: restoredRows } = await admin.rpc('get_today_product_quotas');
  const restored = (
    restoredRows as {
      product_id: number;
      remaining_quantity: number | null;
    }[]
  ).find((row) => row.product_id === target!.product_id);
  expect(restored?.remaining_quantity ?? 0).toBeGreaterThan(0);
  await page.goto('/admin');
  const after = await alertCount(page);
  expect(after).toBeLessThanOrEqual(during);
});

test('AA-02 pending-payment alert filters reports and clears on verify', async ({
  page,
}) => {
  await login(page, 'cashier');
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
  await page.getByRole('button', { name: 'GCash' }).click();
  const reference = `AA-02-${Date.now() % 1000000}`;
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

  const admin = await clientFor('admin');
  const { data: created } = await admin
    .from('transactions')
    .select('id, total_amount')
    .eq('transaction_number', txnNumber)
    .single();
  const createdId = created!.id as string;
  try {
    await page.goto('/pos');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await login(page, 'admin');
    await page.goto('/admin');
    const card = attentionCard(page);
    const beforeVerify = await alertCount(
      page,
      /(\d+) online payments? pending verification/,
    );
    const link = card.getByRole('link', {
      name: /online payment.*pending verification/,
    });
    await expect(link).toBeVisible();
    expect(await link.getAttribute('href')).toBe(
      '/admin/reports?paymentStatus=pending_verification',
    );
    const { count: txnsBefore } = await admin
      .from('transactions')
      .select('id', { count: 'exact', head: true });
    await link.click();
    await expect(page).toHaveURL(/paymentStatus=pending_verification/);
    await expect(
      page.getByText(txnNumber, { exact: true }).first(),
    ).toBeVisible();
    const { count: txnsAfter } = await admin
      .from('transactions')
      .select('id', { count: 'exact', head: true });
    expect(txnsAfter).toBe(txnsBefore);
    await page.getByRole('link', { name: `View receipt ${txnNumber}` }).click();
    page.once('dialog', (dialog) => void dialog.accept('AA-02 verified'));
    await page.getByRole('button', { name: 'Verify Payment' }).click();
    await expect(page.getByText('Verified', { exact: true })).toBeVisible();
    await page.goto('/admin');
    const afterVerify = await alertCount(
      page,
      /(\d+) online payments? pending verification/,
    );
    expect(afterVerify).toBe(beforeVerify - 1);
  } finally {
    await admin.rpc('void_sale', {
      p_transaction_id: createdId,
      p_reason: 'AA-02 cleanup',
    });
  }
});

test('AA-03 turnover alert opens Cashier Operations and clears on verify', async ({
  page,
}) => {
  await login(page, 'cashier');
  await page.goto('/cashier-operations#shift');
  if ((await page.getByLabel('Starting cash').count()) === 0) {
    const expectedText =
      (await page
        .locator('#turnover')
        .getByText(/^Expected cash:/)
        .textContent()) ?? '';
    await page
      .getByLabel('Counted cash')
      .fill(expectedText.replace(/[^0-9.]/g, ''));
    await page.getByLabel('Notes (optional)').fill('AA-03 recovery close');
    await page
      .getByRole('button', { name: 'End shift and submit turnover' })
      .click();
    await expect(page.getByLabel('Starting cash')).toBeVisible();
  }
  const startingCash = Number((2000 + Math.random() * 5000).toFixed(2));
  const formattedCash = `₱${startingCash.toFixed(2)}`;
  await page.getByLabel('Starting cash').fill(String(startingCash));
  await page.getByLabel('Notes (optional)').fill('AA-03 turnover');
  await page.getByRole('button', { name: 'Open shift' }).click();
  await expect(
    page.locator('#shift').getByText('Expected cash:', { exact: true }),
  ).toBeVisible();
  await page.goto('/cashier-operations#turnover');
  const expectedText =
    (await page
      .locator('#turnover')
      .getByText(/^Expected cash:/)
      .textContent()) ?? '';
  await page
    .getByLabel('Counted cash')
    .fill(expectedText.replace(/[^0-9.]/g, ''));
  await page
    .getByRole('button', { name: 'End shift and submit turnover' })
    .click();
  await expect(
    page.getByText('pending', { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'admin');
  await page.goto('/admin');
  const card = attentionCard(page);
  const before = await alertCount(
    page,
    /(\d+) cash turnovers? pending verification/,
  );
  const link = card.getByRole('link', {
    name: /turnover.*pending verification/,
  });
  await expect(link).toBeVisible();
  expect(await link.getAttribute('href')).toBe(
    '/admin/cashier-operations#turnover',
  );
  await link.click();
  await expect(page).toHaveURL(/\/admin\/cashier-operations#turnover/);
  const turnover = page.locator('article', { hasText: formattedCash }).first();
  await expect(turnover).toContainText('pending');
  await turnover.getByRole('button', { name: 'Verify' }).click();
  await expect(turnover).toContainText('verified');
  await page.goto('/admin');
  const after = await alertCount(
    page,
    /(\d+) cash turnovers? pending verification/,
  );
  expect(after).toBe(before - 1);
});

test('AA-04 alert links work by keyboard and fit a 390px viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const admin = await clientFor('admin');
  const { data: quotaRows } = await admin.rpc('get_today_product_quotas');
  const target = (
    quotaRows as {
      product_id: number;
      today_quota_limit: number | null;
      remaining_quantity: number | null;
      sold_quantity: number | null;
    }[]
  ).find(
    (row) =>
      row.today_quota_limit !== null && (row.remaining_quantity ?? 0) > 0,
  );
  expect(target, 'sellable finite-quota product').toBeTruthy();
  const { error: setError } = await admin.rpc('set_today_product_quota', {
    p_product_id: target!.product_id,
    p_new_quota: target!.sold_quantity ?? 0,
    p_reason: 'AA-04 keyboard fixture',
  });
  expect(setError).toBeNull();
  try {
    await login(page, 'admin');
    await page.goto('/admin');
    const link = attentionCard(page).getByRole('link', {
      name: /sold out today/,
    });
    await expect(link).toBeVisible();
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/today-products$/);
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    const { error } = await admin.rpc('set_today_product_quota', {
      p_product_id: target!.product_id,
      p_new_quota: target!.today_quota_limit,
      p_reason: 'AA-04 restore',
    });
    expect(error).toBeNull();
  }
});
