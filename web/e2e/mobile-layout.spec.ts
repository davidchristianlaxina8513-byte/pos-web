import { expect, test, type Locator, type Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ADMIN_EMAIL = 'admin@elvira.cafe';
const ADMIN_PASSWORD = 'admin123';

async function assertNoPageOverflow(page: Page): Promise<void> {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
}

async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test('mobile login fits a 390px viewport', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Welcome back' })).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  const emailPadding = await page
    .getByLabel('Email')
    .evaluate((input) =>
      Number.parseFloat(getComputedStyle(input).paddingLeft),
    );
  expect(emailPadding).toBeGreaterThanOrEqual(40);
  await page.getByLabel('Password', { exact: true }).fill('sample-password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'type',
    'text',
  );
  await assertNoPageOverflow(page);
});

test('narrow login remains scrollable without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/login?error=invalid_credentials');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Sign-in failed' }),
  ).toContainText('Sign-in failed');
  await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
  const accountHelp = page.getByText(/Need an account or password help/);
  await accountHelp.scrollIntoViewIfNeeded();
  await expect(accountHelp).toBeInViewport();
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(320);
});

test('mobile admin dashboard stacks without overflow', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await signInAsAdmin(page);
  await expect(
    page.getByRole('heading', { name: "Today's Summary" }),
  ).toBeVisible();
  await expect(page.getByText('Total Sales', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Revenue by day' })).toBeVisible();
  await assertNoPageOverflow(page);
});

test('mobile reports 30d chart scrolls inside its card', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await signInAsAdmin(page);
  await page.goto('/admin/reports');
  await page.getByRole('link', { name: '30 days' }).click();
  await expect(page).toHaveURL(/preset=30d/);
  await expect(page.getByText(/Gross: ₱/)).toBeVisible();
  await assertNoPageOverflow(page);
});

test('mobile POS fits and the drawer opens', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await signInAsAdmin(page);
  await page.goto('/pos');
  await assertNoPageOverflow(page);
  const nav = page.locator('#staff-primary-nav');
  await expect(nav).toHaveClass(/-translate-x-full/);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(nav).toHaveClass(/translate-x-0/);
});

test('mobile cashier operations sections fit without overlap', async ({
  page,
}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto('/login');
  await page.getByLabel('Email').fill('cashier@elvira.cafe');
  await page.getByLabel('Password', { exact: true }).fill('cashier123');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/cashier-operations');
  await expect(
    page.getByRole('heading', { name: 'Cashier Operations' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Shift history' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Turnover history' }),
  ).toBeVisible();
  await assertNoPageOverflow(page);
});

test('mobile POS cash sale completes at 390px', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto('/login');
  await page.getByLabel('Email').fill('cashier@elvira.cafe');
  await page.getByLabel('Password', { exact: true }).fill('cashier123');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/pos');

  const candidates = page.getByRole('button', { name: /^Add / });
  await expect(candidates.first()).toBeVisible();
  const candidateCount = await candidates.count();
  let itemName = '';
  let addButton: Locator | null = null;
  for (let index = 0; index < candidateCount; index += 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isDisabled()) continue;
    const label = ((await candidate.getAttribute('aria-label')) ?? '')
      .replace(/^Add | to cart$/g, '')
      .trim();
    if (!label) continue;
    itemName = label;
    addButton = candidate;
    break;
  }
  expect(itemName.length).toBeGreaterThan(0);
  expect(addButton).not.toBeNull();
  await addButton?.click();
  await expect(page.getByRole('status')).toContainText(
    new RegExp(`Added ${escapeRegExp(itemName)} — Total: ₱`),
  );
  const totalText = (await page.getByText(/^Total: ₱/).textContent()) ?? '';
  const total = Number(totalText.replace(/^Total: ₱/, ''));
  expect(Number.isFinite(total) && total > 0).toBe(true);

  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByRole('dialog', { name: 'Check Out' })).toBeVisible();
  await assertNoPageOverflow(page);
  await page.getByLabel('Amount received').fill(String(total + 50));
  await page.getByRole('button', { name: 'Process Checkout' }).click();
  await expect(page).toHaveURL(/\/pos\/receipt\//);
  await expect(page.getByText(/Order #\d+/)).toBeVisible();
  await assertNoPageOverflow(page);
});
