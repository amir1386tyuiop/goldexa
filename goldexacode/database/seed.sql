CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO users (id, name, phone, email, role, level, avatar, addresses) VALUES
('11111111-1111-1111-1111-111111111111', 'داود احمدی', '09120000001', 'davood@goldeksa.test', 'buyer', 'gold', NULL, '[{"id":"a1","title":"خانه","province":"اصفهان","city":"اصفهان","street":"خیابان چهارباغ، پلاک ۱۲","postalCode":"81467","isDefault":true}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'مریم احمدی', '09120000000', 'maryam@goldeksa.test', 'admin', 'diamond', NULL, '[]'::jsonb),
('33333333-3333-3333-3333-333333333333', 'گالری نگین', '09120000002', 'gallery@goldeksa.test', 'seller', 'platinum', NULL, '[]'::jsonb),
('44444444-4444-4444-4444-444444444444', 'طراح طلای گلدکسا', '09120000003', 'designer@goldeksa.test', 'designer', 'diamond', NULL, '[]'::jsonb),
('55555555-5555-5555-5555-555555555555', 'کارشناس رسمی طلا', '09120000004', 'expert@goldeksa.test', 'expert', 'platinum', NULL, '[]'::jsonb),
('66666666-6666-6666-6666-666666666666', 'کاربر ویژه', '09120000005', 'premium@goldeksa.test', 'premium', 'diamond', NULL, '[]'::jsonb),
('77777777-7777-7777-7777-777777777777', 'رهبر خرید گروهی', '09120000006', 'group@goldeksa.test', 'group_buyer', 'silver', NULL, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  level = EXCLUDED.level,
  addresses = EXCLUDED.addresses;

INSERT INTO otp_sessions (phone, code_hash, is_verified, expires_at) VALUES
('09120000001', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false, NOW() + INTERVAL '5 minutes'),
('09120000000', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false, NOW() + INTERVAL '5 minutes'),
('09120000002', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false, NOW() + INTERVAL '5 minutes'),
('09120000003', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false, NOW() + INTERVAL '5 minutes'),
('09120000004', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false, NOW() + INTERVAL '5 minutes'),
('09120000005', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false, NOW() + INTERVAL '5 minutes'),
('09120000006', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false, NOW() + INTERVAL '5 minutes');

INSERT INTO roles (name, description) VALUES
('admin', 'Full platform management.'),
('customer', 'Customer role used by buyers and group buyers.'),
('seller', 'Seller role used for marketplace flows.'),
('designer', 'Designer role used for custom jewelry design services.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO permissions (code, resource, action, description) VALUES
('VIEW_USERS', 'user', 'view', 'View all users'),
('CREATE_USER', 'user', 'create', 'Create users'),
('UPDATE_USER', 'user', 'update', 'Update users'),
('BLOCK_USER', 'user', 'block', 'Block or unblock users'),
('CREATE_PRODUCT', 'product', 'create', 'Create products'),
('UPDATE_ANY_PRODUCT', 'product', 'update', 'Update any product'),
('DELETE_PRODUCT', 'product', 'delete', 'Delete products'),
('VIEW_ALL_ORDERS', 'order', 'view', 'View all orders'),
('UPDATE_ORDER_STATUS', 'order', 'update_status', 'Update order status'),
('VIEW_PAYMENTS', 'payment', 'view', 'View payment transactions'),
('VERIFY_PAYMENT', 'payment', 'verify', 'Verify payments'),
('REFUND_PAYMENT', 'payment', 'refund', 'Refund payments'),
('VIEW_REPORTS', 'report', 'view', 'View reports and analytics'),
('MANAGE_SETTINGS', 'setting', 'manage', 'Manage system settings'),
('VIEW_AUDIT_LOG', 'audit', 'view', 'View audit logs'),
('VIEW_PROFILE', 'profile', 'view', 'View own profile'),
('UPDATE_PROFILE', 'profile', 'update', 'Update own profile'),
('CREATE_ORDER', 'order', 'create', 'Create orders'),
('VIEW_OWN_ORDERS', 'order', 'view_own', 'View own orders'),
('USE_WALLET', 'wallet', 'use', 'Use wallet and digital gold'),
('USE_PRICING', 'pricing', 'use', 'View pricing and quotes'),
('CREATE_LISTING', 'listing', 'create', 'Create marketplace listings'),
('UPDATE_OWN_LISTING', 'listing', 'update_own', 'Update own marketplace listings'),
('DELETE_OWN_LISTING', 'listing', 'delete_own', 'Delete own marketplace listings'),
('CREATE_DESIGN', 'design', 'create', 'Create jewelry designs'),
('UPDATE_OWN_DESIGN', 'design', 'update_own', 'Update own jewelry designs'),
('VIEW_OWN_DESIGNS', 'design', 'view_own', 'View own jewelry designs')
ON CONFLICT (code) DO UPDATE SET
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  description = EXCLUDED.description;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = CASE
  WHEN u.role IN ('buyer', 'customer') THEN 'customer'
  WHEN u.role = 'seller' THEN 'seller'
  WHEN u.role = 'designer' THEN 'designer'
  WHEN u.role = 'admin' THEN 'admin'
  ELSE 'customer'
END
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE (r.name = 'admin' AND p.code IN (
  'VIEW_USERS', 'CREATE_USER', 'UPDATE_USER', 'BLOCK_USER',
  'CREATE_PRODUCT', 'UPDATE_ANY_PRODUCT', 'DELETE_PRODUCT',
  'VIEW_ALL_ORDERS', 'UPDATE_ORDER_STATUS',
  'VIEW_PAYMENTS', 'VERIFY_PAYMENT', 'REFUND_PAYMENT',
  'VIEW_REPORTS', 'MANAGE_SETTINGS', 'VIEW_AUDIT_LOG'
))
OR (r.name = 'customer' AND p.code IN (
  'VIEW_PROFILE', 'UPDATE_PROFILE', 'CREATE_ORDER', 'VIEW_OWN_ORDERS', 'USE_WALLET', 'USE_PRICING'
))
OR (r.name = 'seller' AND p.code IN (
  'CREATE_LISTING', 'UPDATE_OWN_LISTING', 'DELETE_OWN_LISTING', 'VIEW_OWN_ORDERS'
))
OR (r.name = 'designer' AND p.code IN (
  'CREATE_DESIGN', 'UPDATE_OWN_DESIGN', 'VIEW_OWN_DESIGNS'
))
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO kyc_profiles (user_id, status, full_name, national_code_hash, document_url, rejection_reason) VALUES
('11111111-1111-1111-1111-111111111111', 'verified', 'داود احمدی', 'hash-national-code', '/docs/kyc.pdf', NULL);

INSERT INTO user_profiles (user_id, avatar_url, bio, birth_date, is_public) VALUES
('11111111-1111-1111-1111-111111111111', '/images/avatar.svg', 'علاقه‌مند به طلای سفارشی و سرمایه‌گذاری امن', DATE '1990-01-01', true);

INSERT INTO user_addresses (user_id, province, city, street, postal_code, is_default) VALUES
('11111111-1111-1111-1111-111111111111', 'اصفهان', 'اصفهان', 'خیابان چهارباغ، پلاک ۱', '8146773461', true);

INSERT INTO user_bank_accounts (user_id, bank_name, account_number_hash, account_holder, is_default) VALUES
('11111111-1111-1111-1111-111111111111', 'بانک ملت', 'hash-account', 'داود احمدی', true);

INSERT INTO public_profiles (user_id, display_name, tagline, avatar_url, rating) VALUES
('11111111-1111-1111-1111-111111111111', 'داود احمدی', 'خریدار طلای سفارشی', '/images/avatar.svg', 4.8);
INSERT INTO gold_prices
 (type, value, change, change_percent, is_valid) VALUES
('mizaneh', 142500000, 1250000, 0.88, true),
('coin', 41500000, -350000, -0.84, true),
('ounce', 2035, 12, 0.59, true),
('gold18', 3560000, 28000, 0.79, true)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, category, description, weight, karat, labor, profit, tax, base_price, final_price, stock, images, is_new, is_featured) VALUES
('انگشتر طلای ۱۸ عیار طرح الماس', 'ring', 'انگشتر ظریف طلای ۱۸ عیار با نگین الماس طبیعی، مناسب برای استفاده روزمره و مناسبت‌های خاص', 4.2, 18, 12, 8, 9, 14952000, 18500000, 12, ARRAY['/images/ring-1.svg'], true, true),
('گردنبند طلای ۱۸ عیار طرح قلب', 'necklace', 'گردنبند طلای ۱۸ عیار با طرح قلب، مناسب برای هدیه و استفاده روزمره', 6.5, 18, 10, 7, 9, 23140000, 28200000, 8, ARRAY['/images/necklace-1.svg'], false, true),
('دستبند طلای ۱۸ عیار طرح زنجیر', 'bracelet', 'دستبند طلای ۱۸ عیار با طرح زنجیر کلاسیک، مناسب برای استفاده روزمره', 8.1, 18, 8, 6, 9, 28836000, 34500000, 5, ARRAY['/images/bracelet-1.svg'], false, false),
('گوشواره طلای ۱۸ عیار طرح حلقه‌ای', 'earring', 'گوشواره طلای ۱۸ عیار با طرح حلقه‌ای مدرن، مناسب برای استفاده روزمره و مهمانی', 3.8, 18, 11, 7, 9, 13528000, 16800000, 15, ARRAY['/images/earring-1.svg'], true, false),
('آویز طلای ۱۸ عیار طرح ستاره', 'pendant', 'آویز طلای ۱۸ عیار با طرح ستاره، مناسب برای استفاده روزمره و هدیه', 2.5, 18, 9, 6, 9, 8900000, 11200000, 20, ARRAY['/images/pendant-1.svg'], false, false),
('انگشتر طلای ۲۴ عیار طرح ساده', 'ring', 'انگشتر طلای ۲۴ عیار با طراحی ساده و کلاسیک، مناسب برای سرمایه‌گذاری', 5.0, 24, 5, 5, 9, 17800000, 20500000, 10, ARRAY['/images/ring-2.svg'], false, true)
ON CONFLICT DO NOTHING;

INSERT INTO orders (user_id, order_number, items, total_amount, shipping_cost, status, address, payment_method) VALUES
('11111111-1111-1111-1111-111111111111', 'GX-SEED-001', '[{"productId":"product-seed","name":"محصول نمونه","quantity":1,"unitPrice":18500000,"totalPrice":18500000}]'::jsonb, 18500000, 0, 'paid', '{"title":"خانه","province":"اصفهان","city":"اصفهان","street":"خیابان چهارباغ، پلاک ۱۲","postalCode":"81467","isDefault":true}'::jsonb, 'online');

INSERT INTO auctions (product_id, seller_id, seller_name, starting_price, reserve_price, current_price, minimum_bid_increment, bid_count, winning_bidder_id, winning_bidder_name, winning_amount, status, payment_status, starts_at, ends_at, is_featured, notes, duration_days, auto_extend_minutes, auto_extend_seconds, payment_window_minutes, commission_rate) VALUES
((SELECT id FROM products WHERE name = 'انگشتر طلای ۱۸ عیار طرح الماس' LIMIT 1), '33333333-3333-3333-3333-333333333333', 'گالری نگین', 18500000, 20000000, 18500000, 500000, 0, NULL, NULL, NULL, 'scheduled', 'unpaid', NOW() + INTERVAL '1 day', NOW() + INTERVAL '3 days', true, 'مزایده ویژه طلای ۱۸ عیار', 3, 2, 300, 1440, 3),
((SELECT id FROM products WHERE name = 'گردنبند طلای ۱۸ عیار طرح قلب' LIMIT 1), '33333333-3333-3333-3333-333333333333', 'گالری نگین', 28200000, 30000000, 28200000, 750000, 0, NULL, NULL, NULL, 'scheduled', 'unpaid', NOW() + INTERVAL '2 days', NOW() + INTERVAL '5 days', true, 'مزایده ویژه گردنبند', 3, 2, 300, 1440, 3);

INSERT INTO auction_bids (auction_id, bidder_id, bidder_name, amount, is_winning) VALUES
((SELECT id FROM auctions ORDER BY created_at DESC LIMIT 1), '11111111-1111-1111-1111-111111111111', 'داود احمدی', 19000000, true);

INSERT INTO used_gold_listings (seller_id, seller_name, title, description, weight, karat, images, sale_type, fixed_price, starting_price, reserve_price, minimum_bid_increment, auction_duration_days, quality_status, status, source) VALUES
('33333333-3333-3333-3333-333333333333', 'گالری نگین', 'دستبند طلای دست دوم طرح زنجیر', 'دستبند سالم با فاکتور خرید از گلدکسا', 8.1, 18, ARRAY['/images/bracelet-used-1.svg'], 'auction', NULL, 32000000, 35000000, 500000, 3, 'not_sent', 'pending_review', 'goldeksa_purchase');

INSERT INTO smart_vault_assets (user_id, product_id, name, category, weight, karat, purchase_price, purchase_date, current_raw_gold_value, current_value) VALUES
('11111111-1111-1111-1111-111111111111', (SELECT id FROM products WHERE name = 'انگشتر طلای ۱۸ عیار طرح الماس' LIMIT 1), 'انگشتر طلای ۱۸ عیار طرح الماس', 'ring', 4.2, 18, 18500000, NOW() - INTERVAL '30 days', 18500000, 18500000);

INSERT INTO price_alerts (user_id, target_type, target_price, trigger_condition) VALUES
('11111111-1111-1111-1111-111111111111', 'gold_price', 3800000, 'greater_than_or_equal');

INSERT INTO group_buying_groups (leader_id, leader_name, title, status, payment_mode, target_amount, discount_rate, invite_code) VALUES
('77777777-7777-7777-7777-777777777777', 'رهبر خرید گروهی', 'خرید گروهی سرویس طلا', 'open', 'member', 60000000, 5, 'GX-GOLD1');

INSERT INTO subscription_plans (name, level, price, duration_days, features, is_active) VALUES
('گلدکسا نقره‌ای', 'silver', 0, 30, '["پرو پایه", "هشدار قیمت محدود"]'::jsonb, true),
('گلدکسا طلایی', 'gold', 4900000, 30, '["پرو پیشرفته", "تحلیل دارایی", "هشدار نامحدود"]'::jsonb, true),
('گلدکسا الماسی', 'diamond', 9900000, 30, '["همه امکانات", "پشتیبانی ویژه", "اشتراک جامعه حرفه‌ای"]'::jsonb, true);

INSERT INTO discount_codes (code, description, discount_type, discount_value, min_purchase, expires_at, is_active) VALUES
('WELCOME10', 'تخفیف اولین خرید', 'percent', 10, 10000000, NOW() + INTERVAL '30 days', true);

INSERT INTO jewelry_designs (user_id, user_name, title, category, base_type, weight, karat, metal_color, stones, image_url, model_url, preview_3d_url, estimated_gold_price, labor_cost, profit, tax, total_price, status) VALUES
('44444444-4444-4444-4444-444444444444', 'طراح طلای گلدکسا', 'انگشتر طلای سفارشی الماس', 'ring', 'stone_center', 5.2, 18, 'white', '[{"name":"الماس","carat":0.3,"color":"white"}]'::jsonb, '/images/custom-ring.svg', '/models/custom-ring.glb', '/models/custom-ring-preview.glb', 19000000, 3200000, 1800000, 9, 25800000, 'in_progress');

INSERT INTO gemstone_library (name, type, color, price_per_carat, stock, image_url) VALUES
('الماس گرد', 'diamond', 'white', 12000000, 20, '/images/diamond.svg'),
('یاقوت سرخ', 'ruby', 'red', 7500000, 12, '/images/ruby.svg'),
('زمرد', 'emerald', 'green', 6800000, 8, '/images/emerald.svg');

INSERT INTO custom_builder_quotes (design_id, user_id, gold_price_snapshot, gold_weight, labor_cost, profit, tax, total, expires_at, status) VALUES
((SELECT id FROM jewelry_designs LIMIT 1), '11111111-1111-1111-1111-111111111111', 3560000, 5.2, 3200000, 1800000, 9, 25800000, NOW() + INTERVAL '7 days', 'sent');

INSERT INTO ai_price_predictions (target_type, target_id, current_price, predicted_price, confidence_score, horizon_days, model_version, features) VALUES
('gold_price', NULL, 3560000, 3640000, 78.5, 7, 'lstm-gold-v1', '{"currency":"IRR","karat":18}'::jsonb);

INSERT INTO ai_design_recommendations (user_id, product_ids, score, reason, source) VALUES
('11111111-1111-1111-1111-111111111111', ARRAY[(SELECT id FROM products WHERE name = 'انگشتر طلای ۱۸ عیار طرح الماس' LIMIT 1)], 92.5, 'بر اساس علاقه شما به انگشترهای ظریف با نگین', 'collaborative_filtering');

INSERT INTO ai_market_matches (buyer_id, seller_id, listing_id, score, reason, status) VALUES
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', (SELECT id FROM used_gold_listings LIMIT 1), 88.0, 'تطابق وزن، عیار و بودجه خریدار', 'sent');

INSERT INTO ai_service_metrics (name, value, metadata) VALUES
('model_confidence_avg', 84.2, '{"model":"lstm-gold-v1"}'::jsonb);

INSERT INTO escrow_payments (listing_id, buyer_id, seller_id, amount, fee, status, tracking_code) VALUES
((SELECT id FROM used_gold_listings LIMIT 1), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 35000000, 1050000, 'held', 'ESC-001');

INSERT INTO marketplace_ratings (reviewer_id, reviewee_id, listing_id, rating, body, category) VALUES
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', (SELECT id FROM used_gold_listings LIMIT 1), 5, 'معامله امن و شفاف', 'seller');

INSERT INTO payment_transactions (order_id, auction_id, escrow_id, user_id, amount, payment_method, status, tracking_code) VALUES
(NULL, NULL, (SELECT id FROM escrow_payments LIMIT 1), '11111111-1111-1111-1111-111111111111', 35000000, 'zarinpal', 'pending', 'PAY-001');

INSERT INTO order_tracking_events (order_id, status, location, description) VALUES
((SELECT id FROM orders LIMIT 1), 'registered', 'انبار گلدکسا', 'سفارش ثبت شد و آماده پردازش است');

INSERT INTO product_categories (name, slug, description, icon_url) VALUES
('انگشتر', 'ring', 'انگشترهای طلای زنانه و مردانه', '/icons/ring.svg'),
('گردنبند', 'necklace', 'گردنبندهای طلای روزمره و مجلسی', '/icons/necklace.svg'),
('دستبند', 'bracelet', 'دستبندهای طلای ظریف و کلاسیک', '/icons/bracelet.svg');

INSERT INTO occasion_categories (name, slug) VALUES
('روزمره', 'daily'),
('نامزدی', 'engagement'),
('هدیه', 'gift');

INSERT INTO stones (name, type, color, price_per_carat) VALUES
('الماس', 'diamond', 'white', 12000000),
('یاقوت', 'ruby', 'red', 7500000);

INSERT INTO product_media (product_id, type, url, alt, sort_order) VALUES
((SELECT id FROM products WHERE name = 'انگشتر طلای ۱۸ عیار طرح الماس' LIMIT 1), 'image', '/images/ring-1.svg', 'انگشتر طلای طرح الماس', 0),
((SELECT id FROM products WHERE name = 'انگشتر طلای ۱۸ عیار طرح الماس' LIMIT 1), 'model_3d', '/models/ring-1.glb', 'مدل سه‌بعدی انگشتر', 1);

INSERT INTO product_stones (product_id, stone_id, carat, position) VALUES
((SELECT id FROM products WHERE name = 'انگشتر طلای ۱۸ عیار طرح الماس' LIMIT 1), (SELECT id FROM stones WHERE name = 'الماس' LIMIT 1), 0.3, 'center');

INSERT INTO inventories (product_id, stock, reserved_stock, warehouse) VALUES
((SELECT id FROM products WHERE name = 'انگشتر طلای ۱۸ عیار طرح الماس' LIMIT 1), 12, 0, 'تهران');

INSERT INTO seller_profiles (user_id, store_name, description, location, rating, is_verified) VALUES
('33333333-3333-3333-3333-333333333333', 'گالری نگین', 'گالری رسمی فروش طلا و جواهر', 'تهران', 4.9, true);

INSERT INTO carts (user_id) VALUES
('11111111-1111-1111-1111-111111111111');

INSERT INTO cart_items (cart_id, product_id, name, quantity, unit_price, total_price, reserved_until) VALUES
((SELECT id FROM carts ORDER BY created_at DESC LIMIT 1), (SELECT id FROM products WHERE name = 'انگشتر طلای ۱۸ عیار طرح الماس' LIMIT 1), 'انگشتر طلای ۱۸ عیار طرح الماس', 1, 18500000, 18500000, NOW() + INTERVAL '5 minutes');

INSERT INTO wallets (user_id, balance, gold_balance_grams) VALUES
('11111111-1111-1111-1111-111111111111', 5000000, 4.2);

INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description) VALUES
((SELECT id FROM wallets LIMIT 1), '11111111-1111-1111-1111-111111111111', 'deposit', 5000000, 'شارژ اولیه کیف پول');

INSERT INTO pricing_rules (name, description, labor_rate, profit_rate, tax_rate) VALUES
('قانون قیمت‌گذاری پایه', 'محاسبه اجرت، سود و مالیات پایه', 0, 8, 9);

INSERT INTO pricing_spreads (product_category, spread_percent) VALUES
('ring', 2.5),
('necklace', 2);

INSERT INTO tax_rules (product_category, tax_rate) VALUES
(NULL, 9);

INSERT INTO labor_cost_rules (product_category, base_labor, per_gram_labor) VALUES
('ring', 1200000, 350000),
('necklace', 1500000, 420000);

INSERT INTO liquidity_requests (user_id, asset_id, expected_price, status, notes) VALUES
('11111111-1111-1111-1111-111111111111', (SELECT id FROM smart_vault_assets LIMIT 1), 19000000, 'pending_review', 'درخواست فروش فوری');

INSERT INTO sell_recommendations (user_id, asset_id, recommended_price, liquidity_score, reason) VALUES
('11111111-1111-1111-1111-111111111111', (SELECT id FROM smart_vault_assets LIMIT 1), 19000000, 86.5, 'تقاضای بالا برای انگشترهای ظریف');

INSERT INTO buyer_requests (user_id, category, min_weight, max_weight, budget) VALUES
('11111111-1111-1111-1111-111111111111', 'ring', 3, 6, 25000000);

INSERT INTO ar_models (product_id, design_id, name, model_url, thumbnail_url) VALUES
((SELECT id FROM products WHERE name = 'انگشتر طلای ۱۸ عیار طرح الماس' LIMIT 1), NULL, 'پرو انگشتر الماس', '/models/ring-1.glb', '/images/ring-1.svg');

INSERT INTO ar_previews (user_id, model_id, screenshot_url, is_shared) VALUES
('11111111-1111-1111-1111-111111111111', (SELECT id FROM ar_models LIMIT 1), '/images/ar-preview.svg', false);

INSERT INTO content_pages (title, slug, body, cover_url) VALUES
('راهنمای خرید طلا', 'buying-guide', 'راهنمای خرید طلا با قیمت شفاف، عیار، اجرت و مالیات', '/images/guide.svg');

INSERT INTO promotions (title, description, discount_value, discount_type) VALUES
('تخفیف افتتاحیه', 'تخفیف ویژه کاربران جدید', 10, 'percent');

INSERT INTO ad_campaigns (title, brand_name, description, budget) VALUES
('کمپین سرویس طلا', 'گلدکسا', 'کمپین معرفی سرویس طلا', 200000000);

INSERT INTO audit_logs (user_id, action, entity_type, metadata) VALUES
('22222222-2222-2222-2222-222222222222', 'seed_created', 'system', '{"source":"seed.sql"}'::jsonb);

INSERT INTO event_logs (name, aggregate_type, payload) VALUES
('seed.completed', 'system', '{"source":"seed.sql"}'::jsonb);

INSERT INTO system_settings (key, value, description) VALUES
('pricing.default_tax_rate', '{"value":9}'::jsonb, 'مالیات پیش‌فرض محصولات');

INSERT INTO notification_preferences (user_id) VALUES
('11111111-1111-1111-1111-111111111111');

INSERT INTO user_follows (follower_id, following_id) VALUES
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

INSERT INTO design_saves (user_id, design_id) VALUES
('11111111-1111-1111-1111-111111111111', (SELECT id FROM jewelry_designs LIMIT 1));

INSERT INTO user_badges (user_id, name, description, icon_url) VALUES
('11111111-1111-1111-1111-111111111111', 'طراح طلایی', 'اولین طرح سفارشی ثبت شد', '/icons/badge.svg');

INSERT INTO design_challenges (title, description, theme, start_date, end_date, reward_type, reward_value, status) VALUES
('بهترین انگشتر طلای سفارشی', 'چالش طراحی انگشتر با سنگ تولد', 'stone_center', NOW() - INTERVAL '30 days', NOW() + INTERVAL '30 days', 'credit', 1000000, 'active');

INSERT INTO challenge_rewards (challenge_id, post_id, user_id, reward_type, reward_value) VALUES
((SELECT id FROM design_challenges LIMIT 1), NULL, '11111111-1111-1111-1111-111111111111', 'credit', 1000000);

INSERT INTO order_status_history (order_id, status, note) VALUES
((SELECT id FROM orders LIMIT 1), 'registered', 'سفارش ثبت شد');

INSERT INTO shipments (order_id, carrier, tracking_code, status) VALUES
((SELECT id FROM orders LIMIT 1), 'پست', 'TRACK-SEED-001', 'registered');

INSERT INTO invoices (order_id, invoice_number, total_amount, pdf_url) VALUES
((SELECT id FROM orders LIMIT 1), 'INV-SEED-001', 18500000, '/invoices/INV-SEED-001.pdf');

