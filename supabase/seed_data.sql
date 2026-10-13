-- Seed Data for Cafe Elvira (Categories, Products, and Staff Accounts)

-- 1. Categories
INSERT INTO category (category_id, name) VALUES
  ('9f5a3c3e-0000-4000-8000-000000000001', 'All Day Breakfast'),
  ('9f5a3c3e-0000-4000-8000-000000000002', 'Set Meal'),
  ('9f5a3c3e-0000-4000-8000-000000000003', 'Sandwiches'),
  ('9f5a3c3e-0000-4000-8000-000000000004', 'Short Order'),
  ('9f5a3c3e-0000-4000-8000-000000000005', 'Hot Drinks'),
  ('9f5a3c3e-0000-4000-8000-000000000006', 'Ice Drinks'),
  ('9f5a3c3e-0000-4000-8000-000000000007', 'Blended Coffee / Frappe'),
  ('9f5a3c3e-0000-4000-8000-000000000008', 'Blended Milkshake / Frappe'),
  ('9f5a3c3e-0000-4000-8000-000000000009', 'Fruit Smoothies'),
  ('9f5a3c3e-0000-4000-8000-000000000010', 'Fruit Soda'),
  ('9f5a3c3e-0000-4000-8000-000000000011', 'Lemonade / Tea')
ON CONFLICT (category_id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Products
INSERT INTO product (product_id, name, category_id, price, is_available, daily_quota_limit) VALUES
  (1, 'Corned Beef with Egg', '9f5a3c3e-0000-4000-8000-000000000001', 130, true, 30),
  (2, 'Tocino with Egg', '9f5a3c3e-0000-4000-8000-000000000001', 120, true, 30),
  (3, 'Longganisa with Egg', '9f5a3c3e-0000-4000-8000-000000000001', 120, true, 30),
  (4, 'Bacon with Egg', '9f5a3c3e-0000-4000-8000-000000000001', 130, true, 30),
  (5, 'Pork Tonkatsu', '9f5a3c3e-0000-4000-8000-000000000002', 125, true, 30),
  (6, 'Chicken Tonkatsu', '9f5a3c3e-0000-4000-8000-000000000002', 125, true, 30),
  (7, 'Chicken Karaage', '9f5a3c3e-0000-4000-8000-000000000002', 125, true, 30),
  (8, 'Shrimp Tempura', '9f5a3c3e-0000-4000-8000-000000000002', 145, true, 30),
  (9, 'Tuna Spread', '9f5a3c3e-0000-4000-8000-000000000003', 100, true, 30),
  (10, 'Ham and Cheese', '9f5a3c3e-0000-4000-8000-000000000003', 110, true, 30),
  (11, 'Club Sandwich', '9f5a3c3e-0000-4000-8000-000000000003', 125, true, 30),
  (12, 'Chicken Sandwich', '9f5a3c3e-0000-4000-8000-000000000003', 110, true, 30),
  (13, 'Pancit Canton w/ Egg', '9f5a3c3e-0000-4000-8000-000000000004', 69, true, 30),
  (14, 'Chicken Nuggets', '9f5a3c3e-0000-4000-8000-000000000004', 99, true, 30),
  (15, 'French Fries w/ Flavor', '9f5a3c3e-0000-4000-8000-000000000004', 95, true, 30),
  (16, 'Instant Ramen Noodles', '9f5a3c3e-0000-4000-8000-000000000004', 100, true, 30),
  (17, 'Espresso', '9f5a3c3e-0000-4000-8000-000000000005', 110, true, 30),
  (18, 'Café Americano', '9f5a3c3e-0000-4000-8000-000000000005', 110, true, 30),
  (19, 'Latte', '9f5a3c3e-0000-4000-8000-000000000005', 120, true, 30),
  (20, 'Café Elvira', '9f5a3c3e-0000-4000-8000-000000000005', 145, true, 30),
  (21, 'Black', '9f5a3c3e-0000-4000-8000-000000000006', 120, true, 30),
  (22, 'Latte', '9f5a3c3e-0000-4000-8000-000000000006', 120, true, 30),
  (23, 'Mocha', '9f5a3c3e-0000-4000-8000-000000000006', 130, true, 30),
  (24, 'Caramel', '9f5a3c3e-0000-4000-8000-000000000006', 130, true, 30),
  (25, 'Almond Mocha', '9f5a3c3e-0000-4000-8000-000000000007', 155, true, 30),
  (26, 'Salted Caramel', '9f5a3c3e-0000-4000-8000-000000000007', 155, true, 30),
  (27, 'Butterscotch Latte', '9f5a3c3e-0000-4000-8000-000000000007', 155, true, 30),
  (28, 'Matcha Latte', '9f5a3c3e-0000-4000-8000-000000000007', 160, true, 30),
  (29, 'Matcha', '9f5a3c3e-0000-4000-8000-000000000008', 155, true, 30),
  (30, 'Dark Chocolate', '9f5a3c3e-0000-4000-8000-000000000008', 150, true, 30),
  (31, 'Cookies N'' Cream', '9f5a3c3e-0000-4000-8000-000000000008', 150, true, 30),
  (32, 'White Vanilla', '9f5a3c3e-0000-4000-8000-000000000008', 150, true, 30),
  (33, 'Avocado', '9f5a3c3e-0000-4000-8000-000000000009', 150, true, 30),
  (34, 'Mango', '9f5a3c3e-0000-4000-8000-000000000009', 150, true, 30),
  (35, 'Peach', '9f5a3c3e-0000-4000-8000-000000000010', 95, true, 30),
  (36, 'Lemon', '9f5a3c3e-0000-4000-8000-000000000010', 95, true, 30),
  (37, 'Kiwi', '9f5a3c3e-0000-4000-8000-000000000010', 95, true, 30),
  (38, 'Strawberry', '9f5a3c3e-0000-4000-8000-000000000010', 95, true, 30),
  (39, 'Cucumber Lemonade', '9f5a3c3e-0000-4000-8000-000000000011', 58, true, 30),
  (40, 'Ice Tea', '9f5a3c3e-0000-4000-8000-000000000011', 55, true, 30),
  (41, 'Lipton Tea', '9f5a3c3e-0000-4000-8000-000000000011', 100, true, 30),
  (42, 'Ombre Tea', '9f5a3c3e-0000-4000-8000-000000000011', 100, true, NULL)
ON CONFLICT (product_id) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  is_available = EXCLUDED.is_available,
  daily_quota_limit = EXCLUDED.daily_quota_limit;

SELECT setval(pg_get_serial_sequence('product', 'product_id'), coalesce((select max(product_id) from product), 0), true);

-- 3. Auth Users & Staff Profiles
DO $$
DECLARE
  admin_id uuid := 'a0000000-0000-4000-8000-000000000001';
  cashier_id uuid := 'c0000000-0000-4000-8000-000000000002';
BEGIN
  -- Admin user in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@elvira.cafe') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@elvira.cafe', crypt('admin123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"username":"admin","role":"admin"}'::jsonb, now(), now(), '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (admin_id, admin_id, format('{"sub":"%s","email":"%s"}', admin_id, 'admin@elvira.cafe')::jsonb, 'email', admin_id::text, now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@elvira.cafe';
  END IF;

  -- Cashier user in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cashier@elvira.cafe') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', cashier_id, 'authenticated', 'authenticated',
      'cashier@elvira.cafe', crypt('cashier123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"],"role":"cashier"}'::jsonb,
      '{"username":"cashier","role":"cashier"}'::jsonb, now(), now(), '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (cashier_id, cashier_id, format('{"sub":"%s","email":"%s"}', cashier_id, 'cashier@elvira.cafe')::jsonb, 'email', cashier_id::text, now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO cashier_id FROM auth.users WHERE email = 'cashier@elvira.cafe';
  END IF;

  -- Upsert profiles into public.user
  INSERT INTO public."user" (user_id, username, password, role, is_active)
  VALUES
    (admin_id, 'admin', 'admin123', 'admin', true),
    (cashier_id, 'cashier', 'cashier123', 'cashier', true)
  ON CONFLICT (username) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;
END $$;
