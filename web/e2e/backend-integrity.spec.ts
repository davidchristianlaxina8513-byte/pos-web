import { expect, test } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const ACCOUNTS = {
  admin: { email: 'admin@elvira.cafe', password: 'admin123' },
  cashier: { email: 'cashier@elvira.cafe', password: 'cashier123' },
};

function env(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing Supabase E2E environment.');
  return { url, anonKey };
}

async function clientFor(role: keyof typeof ACCOUNTS): Promise<SupabaseClient> {
  const { url, anonKey } = env();
  const client = createClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword(ACCOUNTS[role]);
  expect(error).toBeNull();
  return client;
}

async function availableProduct(client: SupabaseClient) {
  const { data, error } = await client
    .from('product')
    .select('product_id, price, daily_quota_limit')
    .eq('is_available', true)
    .order('product_id')
    .limit(1)
    .single();
  expect(error).toBeNull();
  expect(data).toBeTruthy();
  return data!;
}

async function todayQuota(client: SupabaseClient, productId: number) {
  const { data, error } = await client.rpc('get_today_product_quotas');
  expect(error).toBeNull();
  const row = data.find(
    (entry: { product_id: number }) => entry.product_id === productId,
  );
  expect(row).toBeTruthy();
  return row;
}

function saleArgs(productId: number, price: number) {
  return {
    p_transaction_id: crypto.randomUUID(),
    p_payment_mode: 'cash',
    p_amount_received: price,
    p_change_given: 0,
    p_items: [{ product_id: productId, quantity: 1 }],
    p_date: new Date().toISOString(),
  };
}

test('new Manila business days snapshot nullable product defaults', async () => {
  const admin = await clientFor('admin');
  const { data: category } = await admin
    .from('category')
    .select('category_id')
    .limit(1)
    .single();
  expect(category).toBeTruthy();
  const { data: product, error: createError } = await admin
    .from('product')
    .insert({
      name: `Quota Snapshot ${crypto.randomUUID()}`,
      category_id: category!.category_id,
      price: 1,
      is_available: true,
      daily_quota_limit: 17,
    })
    .select('product_id')
    .single();
  expect(createError).toBeNull();

  try {
    expect(
      (
        await admin.rpc('ensure_daily_product_quotas', {
          p_business_date: '2099-11-01',
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.rpc('set_default_product_quota', {
          p_product_id: product!.product_id,
          p_new_quota: null,
          p_reason: 'E2E nullable default',
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.rpc('ensure_daily_product_quotas', {
          p_business_date: '2099-11-02',
        })
      ).error,
    ).toBeNull();

    const { data, error } = await admin
      .from('daily_product_quotas')
      .select('business_date, initial_quota, daily_quota_limit')
      .eq('product_id', product!.product_id)
      .in('business_date', ['2099-11-01', '2099-11-02'])
      .order('business_date');
    expect(error).toBeNull();
    expect(data).toEqual([
      {
        business_date: '2099-11-01',
        initial_quota: 17,
        daily_quota_limit: 17,
      },
      {
        business_date: '2099-11-02',
        initial_quota: null,
        daily_quota_limit: null,
      },
    ]);
  } finally {
    await admin.from('product').delete().eq('product_id', product!.product_id);
  }
});

test('quota locking prevents concurrent overselling and void restores availability', async () => {
  const firstClient = await clientFor('cashier');
  const secondClient = await clientFor('cashier');
  const product = await availableProduct(firstClient);
  const original = await todayQuota(firstClient, product.product_id);
  const sold = Number(original.sold_quantity);

  expect(
    (
      await firstClient.rpc('set_today_product_quota', {
        p_product_id: product.product_id,
        p_new_quota: sold + 1,
        p_reason: 'E2E final-unit concurrency',
      })
    ).error,
  ).toBeNull();

  let winner: string | null = null;
  try {
    const [one, two] = await Promise.all([
      firstClient.rpc(
        'process_sale',
        saleArgs(product.product_id, product.price),
      ),
      secondClient.rpc(
        'process_sale',
        saleArgs(product.product_id, product.price),
      ),
    ]);
    const successes = [one, two].filter((result) => !result.error);
    const failures = [one, two].filter((result) => result.error);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.error?.message).toContain('Daily quota reached');
    winner = successes[0]!.data;
    const { data: savedSale, error: savedSaleError } = await firstClient
      .from('transactions')
      .select('transaction_number, payment_status')
      .eq('id', winner)
      .single();
    expect(savedSaleError).toBeNull();
    expect(savedSale?.transaction_number).toMatch(/^TXN-\d{8}-\d{5}$/);
    expect(savedSale?.payment_status).toBe('paid');

    expect(
      (await todayQuota(firstClient, product.product_id)).remaining_quantity,
    ).toBe(0);
    expect(
      (
        await firstClient.rpc('void_sale', {
          p_transaction_id: winner,
          p_reason: 'E2E quota restoration',
        })
      ).error,
    ).toBeNull();
    winner = null;
    expect(
      (await todayQuota(firstClient, product.product_id)).remaining_quantity,
    ).toBe(1);
  } finally {
    if (winner) {
      await firstClient.rpc('void_sale', {
        p_transaction_id: winner,
        p_reason: 'E2E cleanup',
      });
    }
    await firstClient.rpc('set_today_product_quota', {
      p_product_id: product.product_id,
      p_new_quota: original.today_quota_limit,
      p_reason: 'Restore E2E quota',
    });
  }
});

test('backend rejects online sales without reference-linked evidence', async () => {
  const cashier = await clientFor('cashier');
  const product = await availableProduct(cashier);
  const transactionId = crypto.randomUUID();
  const { error } = await cashier.rpc('process_sale', {
    ...saleArgs(product.product_id, product.price),
    p_transaction_id: transactionId,
    p_payment_mode: 'gcash',
    p_amount_received: null,
    p_change_given: null,
    p_payment_reference: 'E2E-REF-NO-EVIDENCE',
    p_evidence_path: null,
    p_evidence_mime: null,
    p_evidence_size: null,
  });
  expect(error?.message).toContain('Valid payment evidence is required');
  const { data } = await cashier
    .from('transactions')
    .select('id')
    .eq('id', transactionId);
  expect(data).toHaveLength(0);
});

test('unlimited quota permits sales and stays unlimited after a void', async () => {
  const cashier = await clientFor('cashier');
  const product = await availableProduct(cashier);
  const original = await todayQuota(cashier, product.product_id);
  const sale = saleArgs(product.product_id, product.price);

  try {
    expect(
      (
        await cashier.rpc('set_today_product_quota', {
          p_product_id: product.product_id,
          p_new_quota: null,
          p_reason: 'E2E unlimited quota',
        })
      ).error,
    ).toBeNull();
    const result = await cashier.rpc('process_sale', sale);
    expect(result.error).toBeNull();
    expect(
      (await todayQuota(cashier, product.product_id)).remaining_quantity,
    ).toBeNull();
    expect(
      (
        await cashier.rpc('void_sale', {
          p_transaction_id: sale.p_transaction_id,
          p_reason: 'E2E unlimited quota cleanup',
        })
      ).error,
    ).toBeNull();
    expect(
      (await todayQuota(cashier, product.product_id)).remaining_quantity,
    ).toBeNull();
  } finally {
    await cashier.rpc('set_today_product_quota', {
      p_product_id: product.product_id,
      p_new_quota: original.today_quota_limit,
      p_reason: 'Restore E2E quota',
    });
  }
});

test('cashier can change today quota but cannot change defaults or master data', async () => {
  const cashier = await clientFor('cashier');
  const product = await availableProduct(cashier);
  const original = await todayQuota(cashier, product.product_id);

  expect(
    (
      await cashier.rpc('set_today_product_quota', {
        p_product_id: product.product_id,
        p_new_quota: original.today_quota_limit,
        p_reason: 'E2E permission check',
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await cashier.rpc('set_default_product_quota', {
        p_product_id: product.product_id,
        p_new_quota: 99,
        p_reason: 'Must be denied',
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await cashier
        .from('product')
        .update({ daily_quota_limit: 99 })
        .eq('product_id', product.product_id)
        .select('product_id')
    ).data,
  ).toHaveLength(0);

  for (const removedTable of [
    'ingredient',
    'ingredient_inventory',
    'product_recipe',
    'stock_in_receipts',
    'ingredient_movements',
    'reorder_requests',
  ]) {
    const { error } = await cashier.from(removedTable).select('*').limit(1);
    expect(error).not.toBeNull();
  }
});
