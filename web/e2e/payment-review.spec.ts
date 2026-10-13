import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Payment review save failures (PR-01…04). PR-01 recreates the reported
 * TXN-20261013-00006 state: voided sale, pending payment, evidence present.
 * Every created sale is voided in `finally`.
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

async function onlineCheckout(
  page: Page,
  reference: string,
): Promise<{ id: string; number: string }> {
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
  const receiptId = page.url().match(/\/pos\/receipt\/([^/?#]+)/)?.[1] ?? '';
  expect(receiptId).not.toBe('');
  return { id: receiptId, number: txnNumber };
}

async function dbStatus(admin: SupabaseClient, id: string) {
  const { data, error } = await admin
    .from('transactions')
    .select('status, payment_status, payment_reviewed_by')
    .eq('id', id)
    .single();
  expect(error).toBeNull();
  return data as {
    status: string;
    payment_status: string;
    payment_reviewed_by: string | null;
  };
}

test('PR-01 voided pending sale offers no review and stays unchanged', async ({
  page,
}) => {
  const admin = await clientFor('admin');
  const cashier = await clientFor('cashier');
  await login(page, 'cashier');
  const { id: receiptId } = await onlineCheckout(
    page,
    `PR-01-${Date.now() % 1000000}`,
  );
  const { error: voidError } = await cashier.rpc('void_sale', {
    p_transaction_id: receiptId,
    p_reason: 'PR-01 voided-pending fixture',
  });
  expect(voidError).toBeNull();
  await page.goto('/pos');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'admin');
  await page.goto(`/pos/receipt/${receiptId}`);
  await expect(page.getByText('Pending Verification').first()).toBeVisible();
  await expect(page.getByText(/was voided/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Verify Payment' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Reject Payment' }),
  ).toHaveCount(0);
  const { error: reviewError } = await admin.rpc('review_online_payment', {
    p_transaction_id: receiptId,
    p_status: 'verified',
    p_note: 'PR-01 must fail closed',
  });
  expect(reviewError?.message).toContain(
    'Voided transactions cannot be reviewed',
  );
  const row = await dbStatus(admin, receiptId);
  expect(row).toMatchObject({
    status: 'voided',
    payment_status: 'pending_verification',
  });
});

test('PR-02 admin verify persists verified and leaves the pending list', async ({
  page,
}) => {
  const admin = await clientFor('admin');
  await login(page, 'cashier');
  const { id: receiptId, number: txnNumber } = await onlineCheckout(
    page,
    `PR-02-${Date.now() % 1000000}`,
  );
  try {
    await page.goto('/pos');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await login(page, 'admin');
    await page.goto(`/pos/receipt/${receiptId}`);
    await expect(
      page.getByRole('button', { name: 'Verify Payment' }),
    ).toBeVisible();
    page.once('dialog', (dialog) => void dialog.accept('PR-02 verified'));
    await page.getByRole('button', { name: 'Verify Payment' }).click();
    await expect(page.getByText('Verified', { exact: true })).toBeVisible();
    const row = await dbStatus(admin, receiptId);
    expect(row.payment_status).toBe('verified');
    expect(row.payment_reviewed_by).not.toBeNull();
    const { error: repeatError } = await admin.rpc('review_online_payment', {
      p_transaction_id: receiptId,
      p_status: 'rejected',
      p_note: 'PR-02 repeat must fail',
    });
    expect(repeatError?.message).toContain(
      'Online payment has already been reviewed',
    );
    const { error: missingError } = await admin.rpc('review_online_payment', {
      p_transaction_id: crypto.randomUUID(),
      p_status: 'verified',
      p_note: null,
    });
    expect(missingError?.message).toContain('Transaction not found');
    await page.goto('/admin/reports?paymentStatus=pending_verification');
    await expect(page.getByText(txnNumber, { exact: true })).toHaveCount(0);
  } finally {
    await admin.rpc('void_sale', {
      p_transaction_id: receiptId,
      p_reason: 'PR-02 cleanup',
    });
  }
});

test('PR-03 admin reject persists rejected with a reason', async ({ page }) => {
  const admin = await clientFor('admin');
  await login(page, 'cashier');
  const { id: receiptId } = await onlineCheckout(
    page,
    `PR-03-${Date.now() % 1000000}`,
  );
  try {
    await page.goto('/pos');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await login(page, 'admin');
    await page.goto(`/pos/receipt/${receiptId}`);
    await expect(
      page.getByRole('button', { name: 'Reject Payment' }),
    ).toBeVisible();
    page.once('dialog', (dialog) => void dialog.accept('PR-03 not received'));
    await page.getByRole('button', { name: 'Reject Payment' }).click();
    await expect(page.getByText('Rejected', { exact: true })).toBeVisible();
    const row = await dbStatus(admin, receiptId);
    expect(row.payment_status).toBe('rejected');
    expect(row.payment_reviewed_by).not.toBeNull();
  } finally {
    await admin.rpc('void_sale', {
      p_transaction_id: receiptId,
      p_reason: 'PR-03 cleanup',
    });
  }
});

test('PR-04 unknown receipt shows not-found', async ({ page }) => {
  await login(page, 'admin');
  await page.goto(`/pos/receipt/${crypto.randomUUID()}`);
  await expect(page.getByText('404')).toBeVisible();
});
