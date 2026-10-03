const fs = require('node:fs/promises');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const EXPECTED_DEV_REF = 'ccqoegnvzancptqhmyoc';
const EXPORT_TABLES = [
  'ingredient',
  'ingredient_inventory',
  'product_recipe',
  'stock_in_receipts',
  'stock_in_items',
  'ingredient_movements',
  'reorder_requests',
  'inventory',
];

async function readEnvFile(file) {
  const values = {};
  const raw = await fs.readFile(file, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = trimmed.indexOf('=');
    if (equals < 1) continue;
    const key = trimmed.slice(0, equals).trim();
    const value = trimmed
      .slice(equals + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    values[key] = value;
  }
  return values;
}

async function fetchTable(client, table) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not export ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

async function listEvidenceFiles(bucket, prefix = '') {
  const files = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await bucket.list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Could not list evidence: ${error.message}`);
    for (const entry of data) {
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) files.push(objectPath);
      else files.push(...(await listEvidenceFiles(bucket, objectPath)));
    }
    if (data.length < 1000) return files;
    offset += 1000;
  }
}

function safeEvidenceTarget(root, objectPath) {
  const target = path.resolve(root, ...objectPath.split('/'));
  const resolvedRoot = path.resolve(root) + path.sep;
  if (!target.startsWith(resolvedRoot)) {
    throw new Error('Unsafe evidence object path returned by Storage.');
  }
  return target;
}

async function run() {
  const webEnv = await readEnvFile(path.resolve('web', '.env.local'));
  const developmentEnv = await readEnvFile(path.resolve('.env.development'));
  const localEnv = await readEnvFile(path.resolve('.env.local'));
  const url = webEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    developmentEnv.SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('DEV URL or root export credentials are missing.');
  }
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch (error) {
    throw new Error(
      `REFUSED: NEXT_PUBLIC_SUPABASE_URL in web/.env.local is invalid ` +
        `(length=${url.length}, https=${url.startsWith('https://')}, ` +
        `whitespace=${/\\s/.test(url)}): ${error.message}`,
    );
  }
  if (hostname !== `${EXPECTED_DEV_REF}.supabase.co`) {
    throw new Error('REFUSED: Supabase URL is not the approved DEV project.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportRoot = path.resolve('.dev-exports', `inventory-removal-${stamp}`);
  await fs.mkdir(exportRoot, { recursive: true });

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const counts = {};
  for (const table of EXPORT_TABLES) {
    const rows = await fetchTable(client, table);
    counts[table] = rows.length;
    await fs.writeFile(
      path.join(exportRoot, `${table}.json`),
      JSON.stringify(rows, null, 2),
      'utf8',
    );
  }

  const bucket = client.storage.from('stock-in-evidence');
  const evidencePaths = await listEvidenceFiles(bucket);
  const evidenceRoot = path.join(exportRoot, 'stock-in-evidence');
  for (const objectPath of evidencePaths) {
    const { data, error } = await bucket.download(objectPath);
    if (error) {
      throw new Error(`Could not export an evidence object: ${error.message}`);
    }
    const target = safeEvidenceTarget(evidenceRoot, objectPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, Buffer.from(await data.arrayBuffer()));
  }

  await fs.writeFile(
    path.join(exportRoot, 'manifest.json'),
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        source: 'cafe-elvira-dev',
        tables: counts,
        evidence_objects: evidencePaths,
      },
      null,
      2,
    ),
    'utf8',
  );

  if (evidencePaths.length > 0) {
    const { error } = await bucket.remove(evidencePaths);
    if (error) {
      throw new Error(`Evidence was exported but could not be removed: ${error.message}`);
    }
  }
  const remaining = await listEvidenceFiles(bucket);
  if (remaining.length > 0) {
    throw new Error('Evidence export verification failed: bucket is not empty.');
  }
  const { error: bucketError } = await client.storage.deleteBucket(
    'stock-in-evidence',
  );
  if (bucketError) {
    throw new Error(
      `Evidence was exported but the empty bucket could not be removed: ${bucketError.message}`,
    );
  }

  console.log(`DEV export created at ${path.relative(process.cwd(), exportRoot)}`);
  console.log(`Exported ${evidencePaths.length} private evidence object(s).`);
  console.log('The DEV evidence bucket was removed and migration 0012 may proceed.');
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
