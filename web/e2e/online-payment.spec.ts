import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const CASHIER = {
  email: 'cashier@elvira.cafe',
  password: 'cashier123',
};
const ADMIN = {
  email: 'admin@elvira.cafe',
  password: 'admin123',
};
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
  'base64',
);

async function login(page: Page, role: 'cashier' | 'admin') {
  const account = role === 'cashier' ? CASHIER : ADMIN;
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(
    role === 'cashier' ? /\/dashboard$/ : /\/admin$/,
  );
}

async function openCheckoutWithOneItem(page: Page) {
  await page.goto('/pos');
  const addButtons = page.getByRole('button', { name: /^Add / });
  await expect(addButtons.first()).toBeVisible();
  const count = await addButtons.count();
  for (let index = 0; index < count; index += 1) {
    const button = addButtons.nth(index);
    if (await button.isEnabled()) {
      await button.click();
      await page.getByRole('button', { name: 'Checkout' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Check Out' }),
      ).toBeVisible();
      return;
    }
  }
  throw new Error('No sellable product is available for online-payment E2E.');
}

test('online evidence is required, linked, searchable, and Admin-reviewed', async ({
  page,
}) => {
  await login(page, 'cashier');
  await openCheckoutWithOneItem(page);
  await page.getByRole('button', { name: 'GCash' }).click();
  await page.getByLabel('Online transaction reference').fill('E2E-REF-123456');

  const processButton = page.getByRole('button', { name: 'Process Checkout' });
  await expect(processButton).toBeDisabled();

  const upload = page.locator('input[type="file"]');
  await upload.setInputFiles({
    name: 'evidence.png',
    mimeType: 'image/png',
    buffer: ONE_PIXEL_PNG,
  });
  await expect(page.getByAltText('Payment evidence preview')).toBeVisible();
  await page.getByRole('button', { name: 'Retake' }).click();
  await expect(processButton).toBeDisabled();

  await upload.setInputFiles({
    name: 'evidence.png',
    mimeType: 'image/png',
    buffer: ONE_PIXEL_PNG,
  });
  await page.getByRole('button', { name: 'Confirm photo' }).click();
  await expect(page.getByText('Evidence photo confirmed.')).toBeVisible();
  await expect(processButton).toBeEnabled();
  await processButton.click();

  await expect(page).toHaveURL(/\/pos\/receipt\//, { timeout: 30_000 });
  await expect(page.getByText('Pending Verification')).toBeVisible();
  await expect(page.getByText('Payment Evidence: Available')).toBeVisible();
  const transactionNumber =
    (await page.getByText(/^TXN-\d{8}-\d{5}$/).textContent()) ?? '';
  expect(transactionNumber).toMatch(/^TXN-\d{8}-\d{5}$/);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing Supabase E2E environment.');
  const cashierClient = createClient(url, anonKey);
  expect(
    (await cashierClient.auth.signInWithPassword(CASHIER)).error,
  ).toBeNull();
  const { data: transaction, error: transactionError } = await cashierClient
    .from('transactions')
    .select('id, payment_status, payment_reference')
    .eq('transaction_number', transactionNumber)
    .single();
  expect(transactionError).toBeNull();
  expect(transaction).toMatchObject({
    payment_status: 'pending_verification',
    payment_reference: 'E2E-REF-123456',
  });
  const { data: evidence, error: evidenceError } = await cashierClient
    .from('payment_evidence')
    .select('transaction_id, evidence_status, mime_type')
    .eq('transaction_id', transaction!.id)
    .single();
  expect(evidenceError).toBeNull();
  expect(evidence).toMatchObject({
    transaction_id: transaction!.id,
    evidence_status: 'submitted',
    mime_type: 'image/png',
  });
  expect(
    (
      await cashierClient.rpc('review_online_payment', {
        p_transaction_id: transaction!.id,
        p_status: 'verified',
        p_note: 'Cashier must be denied',
      })
    ).error,
  ).not.toBeNull();

  await page.goto('/pos');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'admin');
  await page.goto('/admin/reports');
  await page.getByLabel('Search transaction').fill(transactionNumber);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(
    page.getByText(transactionNumber, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: `View receipt ${transactionNumber}` })
    .click();
  await expect(
    page.getByRole('button', { name: 'View Payment Evidence' }),
  ).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept('E2E verified evidence'));
  await page.getByRole('button', { name: 'Verify Payment' }).click();
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
});

test('camera permission denial gives a clear upload fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () =>
          Promise.reject(
            new DOMException('Permission denied', 'NotAllowedError'),
          ),
      },
    });
  });
  await login(page, 'cashier');
  await openCheckoutWithOneItem(page);
  await page.getByRole('button', { name: 'Maya' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(
    page.getByText(/Camera permission is required to capture payment evidence/),
  ).toBeVisible();
  await expect(page.getByText('Upload image')).toBeVisible();
});
