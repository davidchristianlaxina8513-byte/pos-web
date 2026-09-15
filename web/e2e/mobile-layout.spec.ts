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
  await assertNoPageOverflow(page);
});

test('mobile admin dashboard stacks without overflow', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await signInAsAdmin(page);
  await expect(page.getByText(/Total revenue: ₱/)).toBeVisible();
  await expect(page.getByText(/Total orders: \d+/)).toBeVisible();
  await expect(page.getByRole('img', { name: 'Revenue by day' })).toBeVisible();
  await assertNoPageOverflow(page);
});

test('mobile reports 30d chart scrolls inside its card', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await signInAsAdmin(page);
  await page.goto('/admin/reports');
  await page.getByRole('link', { name: '30 days' }).click();
  await expect(page).toHaveURL(/preset=30d/);
  await expect(page.getByText(/Revenue: ₱/)).toBeVisible();
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

test('mobile POS cash sale completes at 390px', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto('/login');
  await page.getByLabel('Email').fill('cashier@elvira.cafe');
  await page.getByLabel('Password', { exact: true }).fill('cashier123');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/pos$/);

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
  await expect(page.getByRole('dialog', { name: 'Checkout' })).toBeVisible();
  await assertNoPageOverflow(page);
  await page.getByLabel('Amount received').fill(String(total + 50));
  await page.getByRole('button', { name: 'Process Checkout' }).click();
  await expect(page).toHaveURL(/\/pos\/receipt\//);
  await expect(page.getByText(/Order #\d+/)).toBeVisible();
  await assertNoPageOverflow(page);
});
