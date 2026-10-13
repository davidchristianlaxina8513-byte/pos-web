const fs = require('fs');

const CATEGORIES = [
  { name: 'All Day Breakfast', id: 1 },
  { name: 'Set Meal', id: 2 },
  { name: 'Sandwiches', id: 3 },
  { name: 'Short Order', id: 4 },
  { name: 'Hot Drinks', id: 5 },
  { name: 'Ice Drinks', id: 6 },
  { name: 'Blended Coffee / Frappe', id: 7 },
  { name: 'Blended Milkshake / Frappe', id: 8 },
  { name: 'Fruit Smoothies', id: 9 },
  { name: 'Fruit Soda', id: 10 },
  { name: 'Lemonade / Tea', id: 11 },
].map(({ name, id }) => ({
  name,
  category_id: '9f5a3c3e-0000-4000-8000-0000000000' + String(id).padStart(2, '0'),
}));

const CATEGORY_ID_BY_NAME = Object.fromEntries(
  CATEGORIES.map((category) => [category.name, category.category_id]),
);

const MENU = [
  ['All Day Breakfast', '1000000001', 'Corned Beef with Egg', 130],
  ['All Day Breakfast', '1000000002', 'Tocino with Egg', 120],
  ['All Day Breakfast', '1000000003', 'Longganisa with Egg', 120],
  ['All Day Breakfast', '1000000004', 'Bacon with Egg', 130],
  ['Set Meal', '1000000005', 'Pork Tonkatsu', 125],
  ['Set Meal', '1000000006', 'Chicken Tonkatsu', 125],
  ['Set Meal', '1000000007', 'Chicken Karaage', 125],
  ['Set Meal', '1000000008', 'Shrimp Tempura', 145],
  ['Sandwiches', '1000000009', 'Tuna Spread', 100],
  ['Sandwiches', '1000000010', 'Ham and Cheese', 110],
  ['Sandwiches', '1000000011', 'Club Sandwich', 125],
  ['Sandwiches', '1000000012', 'Chicken Sandwich', 110],
  ['Short Order', '1000000013', 'Pancit Canton w/ Egg', 69],
  ['Short Order', '1000000014', 'Chicken Nuggets', 99],
  ['Short Order', '1000000015', 'French Fries w/ Flavor', 95],
  ['Short Order', '1000000016', 'Instant Ramen Noodles', 100],
  ['Hot Drinks', '1000000017', 'Espresso', 110],
  ['Hot Drinks', '1000000018', 'Café Americano', 110],
  ['Hot Drinks', '1000000019', 'Latte', 120],
  ['Hot Drinks', '1000000020', 'Café Elvira', 145],
  ['Ice Drinks', '1000000021', 'Black', 120],
  ['Ice Drinks', '1000000022', 'Latte', 120],
  ['Ice Drinks', '1000000023', 'Mocha', 130],
  ['Ice Drinks', '1000000024', 'Caramel', 130],
  ['Blended Coffee / Frappe', '1000000025', 'Almond Mocha', 155],
  ['Blended Coffee / Frappe', '1000000026', 'Salted Caramel', 155],
  ['Blended Coffee / Frappe', '1000000027', 'Butterscotch Latte', 155],
  ['Blended Coffee / Frappe', '1000000028', 'Matcha Latte', 160],
  ['Blended Milkshake / Frappe', '1000000029', 'Matcha', 155],
  ['Blended Milkshake / Frappe', '1000000030', 'Dark Chocolate', 150],
  ['Blended Milkshake / Frappe', '1000000031', "Cookies N' Cream", 150],
  ['Blended Milkshake / Frappe', '1000000032', 'White Vanilla', 150],
  ['Fruit Smoothies', '1000000033', 'Avocado', 150],
  ['Fruit Smoothies', '1000000034', 'Mango', 150],
  ['Fruit Soda', '1000000035', 'Peach', 95],
  ['Fruit Soda', '1000000036', 'Lemon', 95],
  ['Fruit Soda', '1000000037', 'Kiwi', 95],
  ['Fruit Soda', '1000000038', 'Strawberry', 95],
  ['Lemonade / Tea', '1000000039', 'Cucumber Lemonade', 58],
  ['Lemonade / Tea', '1000000040', 'Ice Tea', 55],
  ['Lemonade / Tea', '1000000041', 'Lipton Tea', 100],
  ['Lemonade / Tea', '1000000042', 'Ombre Tea', 100],
];

let sql = '-- Seed Data for Cafe Elvira (Categories, Products, and Staff Accounts)\n\n';

// 1. Categories
sql += '-- 1. Categories\n';
sql += 'INSERT INTO category (category_id, name) VALUES\n';
sql += CATEGORIES.map(c => `  ('${c.category_id}', '${c.name}')`).join(',\n');
sql += '\nON CONFLICT (category_id) DO UPDATE SET name = EXCLUDED.name;\n\n';

// 2. Products
sql += '-- 2. Products\n';
sql += 'INSERT INTO product (product_id, name, category_id, price, is_available, daily_quota_limit) VALUES\n';
sql += MENU.map(([cat, _, name, price], i) => {
  const catId = CATEGORY_ID_BY_NAME[cat];
  const quota = i === MENU.length - 1 ? 'NULL' : '30';
  const escapedName = name.replace(/'/g, "''");
  return `  (${i + 1}, '${escapedName}', '${catId}', ${price}, true, ${quota})`;
}).join(',\n');
sql += '\nON CONFLICT (product_id) DO UPDATE SET\n';
sql += '  name = EXCLUDED.name,\n';
sql += '  category_id = EXCLUDED.category_id,\n';
sql += '  price = EXCLUDED.price,\n';
sql += '  is_available = EXCLUDED.is_available,\n';
sql += '  daily_quota_limit = EXCLUDED.daily_quota_limit;\n\n';

// Sync sequence
sql += 'SELECT setval(pg_get_serial_sequence(\'product\', \'product_id\'), coalesce((select max(product_id) from product), 0), true);\n\n';

// 3. Auth Users & Profiles
sql += '-- 3. Auth Users & Staff Profiles\n';
sql += 'DO $$\n';
sql += 'DECLARE\n';
sql += '  admin_id uuid := \'a0000000-0000-4000-8000-000000000001\';\n';
sql += '  cashier_id uuid := \'c0000000-0000-4000-8000-000000000002\';\n';
sql += 'BEGIN\n';
sql += '  -- Admin user in auth.users\n';
sql += '  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = \'admin@elvira.cafe\') THEN\n';
sql += '    INSERT INTO auth.users (\n';
sql += '      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,\n';
sql += '      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,\n';
sql += '      confirmation_token, recovery_token\n';
sql += '    ) VALUES (\n';
sql += '      \'00000000-0000-0000-0000-000000000000\', admin_id, \'authenticated\', \'authenticated\',\n';
sql += '      \'admin@elvira.cafe\', crypt(\'admin123\', gen_salt(\'bf\')), now(),\n';
sql += '      \'{"provider":"email","providers":["email"],"role":"admin"}\'::jsonb,\n';
sql += '      \'{"username":"admin","role":"admin"}\'::jsonb, now(), now(), \'\', \'\'\n';
sql += '    );\n';
sql += '    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)\n';
sql += '    VALUES (admin_id, admin_id, format(\'{"sub":"%s","email":"%s"}\', admin_id, \'admin@elvira.cafe\')::jsonb, \'email\', admin_id::text, now(), now(), now())\n';
sql += '    ON CONFLICT DO NOTHING;\n';
sql += '  ELSE\n';
sql += '    SELECT id INTO admin_id FROM auth.users WHERE email = \'admin@elvira.cafe\';\n';
sql += '  END IF;\n\n';
sql += '  -- Cashier user in auth.users\n';
sql += '  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = \'cashier@elvira.cafe\') THEN\n';
sql += '    INSERT INTO auth.users (\n';
sql += '      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,\n';
sql += '      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,\n';
sql += '      confirmation_token, recovery_token\n';
sql += '    ) VALUES (\n';
sql += '      \'00000000-0000-0000-0000-000000000000\', cashier_id, \'authenticated\', \'authenticated\',\n';
sql += '      \'cashier@elvira.cafe\', crypt(\'cashier123\', gen_salt(\'bf\')), now(),\n';
sql += '      \'{"provider":"email","providers":["email"],"role":"cashier"}\'::jsonb,\n';
sql += '      \'{"username":"cashier","role":"cashier"}\'::jsonb, now(), now(), \'\', \'\'\n';
sql += '    );\n';
sql += '    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)\n';
sql += '    VALUES (cashier_id, cashier_id, format(\'{"sub":"%s","email":"%s"}\', cashier_id, \'cashier@elvira.cafe\')::jsonb, \'email\', cashier_id::text, now(), now(), now())\n';
sql += '    ON CONFLICT DO NOTHING;\n';
sql += '  ELSE\n';
sql += '    SELECT id INTO cashier_id FROM auth.users WHERE email = \'cashier@elvira.cafe\';\n';
sql += '  END IF;\n\n';

sql += '  -- Upsert profiles into public.user\n';
sql += '  INSERT INTO public."user" (user_id, username, password, role, is_active)\n';
sql += '  VALUES\n';
sql += '    (admin_id, \'admin\', \'admin123\', \'admin\', true),\n';
sql += '    (cashier_id, \'cashier\', \'cashier123\', \'cashier\', true)\n';
sql += '  ON CONFLICT (username) DO UPDATE SET\n';
sql += '    user_id = EXCLUDED.user_id,\n';
sql += '    role = EXCLUDED.role,\n';
sql += '    is_active = EXCLUDED.is_active;\n';
sql += 'END $$;\n';

fs.writeFileSync('supabase/seed_data.sql', sql, 'utf8');
console.log('Successfully written supabase/seed_data.sql');

