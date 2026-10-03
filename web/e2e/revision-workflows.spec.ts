import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const CASHIER_EMAIL = 'cashier@elvira.cafe';
const CASHIER_PASSWORD = 'cashier123';
const ADMIN_EMAIL = 'admin@elvira.cafe';
const ADMIN_PASSWORD = 'admin123';

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase browser configuration.');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function login(page: Page, role: 'admin' | 'cashier') {
  await page.goto('/login');
  await page
    .getByLabel('Email')
    .fill(role === 'admin' ? ADMIN_EMAIL : CASHIER_EMAIL);
  await page
    .getByLabel('Password', { exact: true })
    .fill(role === 'admin' ? ADMIN_PASSWORD : CASHIER_PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(role === 'admin' ? /\/admin$/ : /\/dashboard$/);
}

test('cashier dashboard and operational navigation are available', async ({
  page,
}) => {
  await login(page, 'cashier');
  await expect(
    page.getByRole('heading', { name: "Today's Overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: "Today's Products" }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Almost Sold Out' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Sold Out', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Current Shift' }),
  ).toBeVisible();
  for (const label of [
    'POS',
    'Menu',
    "Today's Products",
    'Daily Sales',
    'Cashier Operations',
  ]) {
    await expect(
      page
        .locator('#staff-primary-nav')
        .getByRole('link', { name: label, exact: true }),
    ).toBeVisible();
  }
  await page.goto('/menu');
  await expect(page.getByText('View-only product catalog')).toBeVisible();
  await page.goto('/daily-sales');
  await expect(page.getByText('Gross', { exact: true })).toBeVisible();
  await expect(page.getByText('Voided', { exact: true })).toBeVisible();
  await expect(page.getByText('Net', { exact: true })).toBeVisible();
});

test('cashier changes today quota but has no default quota control', async ({
  page,
}) => {
  const supabase = client();
  expect(
    (
      await supabase.auth.signInWithPassword({
        email: CASHIER_EMAIL,
        password: CASHIER_PASSWORD,
      })
    ).error,
  ).toBeNull();
  const before = await supabase.rpc('get_today_product_quotas');
  expect(before.error).toBeNull();
  const product = before.data.find(
    (row: { today_quota_limit: number | null }) =>
      row.today_quota_limit !== null,
  );
  expect(product).toBeTruthy();
  await login(page, 'cashier');
  await page.goto('/today-products');
  const card = page.locator('li', { hasText: product.product_name }).first();
  await expect(
    card.getByRole('button', { name: 'Change default' }),
  ).toHaveCount(0);
  page.once(
    'dialog',
    (dialog) => void dialog.accept('Browser quota adjustment'),
  );
  await card.getByRole('button', { name: '+1 today' }).click();
  await expect
    .poll(async () => {
      const current = await supabase.rpc('get_today_product_quotas');
      return current.data.find(
        (row: { product_id: number }) => row.product_id === product.product_id,
      )?.today_quota_limit;
    })
    .toBe(Number(product.today_quota_limit) + 1);
  await supabase.rpc('set_today_product_quota', {
    p_product_id: product.product_id,
    p_new_quota: product.today_quota_limit,
    p_reason: 'Restore browser test quota',
  });
});

test('cashier submits a shift turnover and admin verifies it', async ({
  page,
}) => {
  const startingCash = Number((1000 + Math.random() * 8000).toFixed(2));
  const formattedCash = `₱${startingCash.toFixed(2)}`;
  await login(page, 'cashier');
  await page.goto('/cashier-operations#shift');
  // Recover a shift left open by an interrupted prior browser run.
  if ((await page.getByLabel('Starting cash').count()) === 0) {
    const expectedText =
      (await page
        .locator('#turnover')
        .getByText(/^Expected cash:/)
        .textContent()) ?? '';
    const expectedCash = expectedText.replace(/[^0-9.]/g, '');
    await page.getByLabel('Counted cash').fill(expectedCash);
    await page
      .getByLabel('Notes (optional)')
      .fill('Close interrupted test shift');
    await page
      .getByRole('button', { name: 'End shift and submit turnover' })
      .click();
    await expect(page.getByLabel('Starting cash')).toBeVisible();
  }
  await page.getByLabel('Starting cash').fill(String(startingCash));
  await page.getByLabel('Notes (optional)').fill('Browser shift test');
  await page.getByRole('button', { name: 'Open shift' }).click();
  await expect(
    page.locator('#shift').getByText('Expected cash:', { exact: true }),
  ).toBeVisible();
  await page.goto('/cashier-operations#turnover');
  await page.getByLabel('Counted cash').fill(String(startingCash - 50));
  await expect(page.getByText('Cash Difference: -₱50.00')).toBeVisible();
  const submit = page.getByRole('button', {
    name: 'End shift and submit turnover',
  });
  await expect(submit).toBeDisabled();
  await page
    .getByLabel('Discrepancy reason')
    .fill('E2E counted cash discrepancy');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(
    page.getByText('pending', { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'admin');
  await page.goto('/admin/cashier-operations#turnover');
  const turnover = page.locator('article', { hasText: formattedCash }).first();
  await expect(turnover).toContainText('pending');
  await expect(turnover).toContainText('E2E counted cash discrepancy');
  await expect(turnover).toContainText('-₱50.00');
  await turnover.getByRole('button', { name: 'Verify' }).click();
  await expect(turnover).toContainText('verified');
});
