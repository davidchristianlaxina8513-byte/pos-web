import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@elvira.cafe';
const ADMIN_PASSWORD = 'admin123';

async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  // Generous timeout: the suite-first login cold-compiles the admin routes.
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
}

test('admin hub renders dashboard metrics and nav', async ({ page }) => {
  await signInAsAdmin(page);
  await expect(
    page.getByRole('heading', { name: "Today's Summary" }),
  ).toBeVisible();
  await expect(page.getByText('Total Sales', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Revenue by day' })).toBeVisible();
  await expect(page.getByText('Production Quota Status')).toBeVisible();
  // Scoped to the hub tiles: the sidebar carries same-named section links.
  const hubNav = page.locator('nav[aria-label="Admin sections"]');
  for (const label of ['Register', 'Reports', 'Menu', 'Settings', 'Users']) {
    await expect(hubNav.getByRole('link', { name: label })).toBeVisible();
  }
});

test('role navigation sends cashiers to their own dashboard', async ({
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
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: "Today's Products" }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Dashboard' }).first(),
  ).toBeVisible();
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
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'View profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('Email')).toHaveValue('cashier@elvira.cafe');
  await expect(page.getByLabel('Role')).toHaveValue('Cashier');
  await expect(
    page.getByRole('button', { name: 'Sign out' }).first(),
  ).toBeVisible();
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('cashier cannot reach admin pages', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('cashier@elvira.cafe');
  await page.getByLabel('Password', { exact: true }).fill('cashier123');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/admin/menu');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('menu product create and delete round-trip', async ({ page }) => {
  await signInAsAdmin(page);
  const name = `E2E Item ${Date.now()}`;
  await page.goto('/admin/menu/product/new');
  await page.getByLabel('Name').fill(name);
  // React Aria select: open the trigger, then pick the second category
  // (mirrors the old `selectOption({ index: 1 })`).
  await page.getByLabel('Category').click();
  await page.getByRole('option').nth(1).click();
  await page.getByLabel('Price').fill('9.99');
  await page.getByRole('button', { name: 'Add product' }).click();
  await expect(page).toHaveURL(/\/admin\/menu$/);
  await expect(page.getByText(name)).toBeVisible();

  await page
    .locator('li', { hasText: name })
    .getByRole('link', { name: 'Edit' })
    .click();
  // Generous timeout: the edit page cold-compiles on first visit.
  await expect(page.getByLabel('Name')).toHaveValue(name, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page).toHaveURL(/\/admin\/menu$/);
  await expect(page.getByText(name)).toHaveCount(0);
});

test('reports render summaries', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/admin/reports');
  await expect(page.getByText(/Gross: ₱/)).toBeVisible();
  await expect(page.getByText(/Voided: ₱/)).toBeVisible();
  await expect(page.getByText(/Net: ₱/)).toBeVisible();
  await expect(page.getByText(/Orders: \d+/)).toBeVisible();
  await expect(page.getByText('Daily', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '7 days' }).click();
  await expect(page).toHaveURL(/preset=7d/);
  await expect(page.getByText(/Gross: ₱/)).toBeVisible();
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

  // Generous timeout: the receipt route cold-compiles on first sale.
  await expect(page).toHaveURL(/\/pos\/receipt\//, { timeout: 30_000 });
  const transactionNumber =
    (await page.getByText(/^TXN-\d{8}-\d{5}$/).textContent()) ?? '';
  expect(transactionNumber).toMatch(/^TXN-\d{8}-\d{5}$/);

  await page.goto('/admin/reports');
  const receiptsCard = page.locator('section', {
    has: page.getByRole('heading', { name: 'Transaction / Sales Review' }),
  });
  const itemsCard = page.locator('section', {
    has: page.getByRole('heading', { name: 'Items sold' }),
  });
  await expect(
    page.getByRole('heading', { name: 'Transaction / Sales Review' }),
  ).toBeVisible();
  await expect(
    receiptsCard.getByText(transactionNumber, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Items sold' })).toBeVisible();
  await expect(itemsCard.getByText(itemName).first()).toBeVisible();
  await receiptsCard
    .getByRole('link', { name: `View receipt ${transactionNumber}` })
    .click();
  await expect(page).toHaveURL(/\/pos\/receipt\//);
  await expect(
    page.getByText(transactionNumber, { exact: true }),
  ).toBeVisible();
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

test('preferences persist notification, language, and appearance choices', async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto('/admin/settings');

  const orderNotifications = page.getByRole('switch', {
    name: 'Order notifications',
  });
  const quotaAlerts = page.getByRole('switch', {
    name: 'Product quota alerts',
  });
  await expect(orderNotifications).toHaveAttribute('aria-checked', 'true');
  await orderNotifications.click();
  await quotaAlerts.click();
  await page.getByLabel('Language').selectOption('fil');
  await page.getByRole('radio', { name: 'dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');

  await page.reload();
  await expect(orderNotifications).toHaveAttribute('aria-checked', 'false');
  await expect(quotaAlerts).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByLabel('Language')).toHaveValue('fil');
  await expect(page.getByRole('radio', { name: 'dark' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
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
