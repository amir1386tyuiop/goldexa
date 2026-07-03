-- Goldexa Database Schema
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    role VARCHAR(30) DEFAULT 'buyer',
    level VARCHAR(30) DEFAULT 'standard',
    avatar TEXT,
    is_blocked BOOLEAN DEFAULT false,
    addresses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE otp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RBAC Roles and Permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(80) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(80),
    action VARCHAR(80),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE kyc_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'none',
    full_name VARCHAR(255),
    national_code_hash VARCHAR(255),
    document_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    bio TEXT,
    birth_date DATE,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    street TEXT NOT NULL,
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number_hash VARCHAR(255) NOT NULL,
    account_holder VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    tagline TEXT,
    avatar_url TEXT,
    rating DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Gold Prices
CREATE TABLE gold_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    change DECIMAL(10,2) DEFAULT 0,
    change_percent DECIMAL(5,2) DEFAULT 0,
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Append-only price history (for trends and price-source auditing)
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    change DECIMAL(10,2) DEFAULT 0,
    change_percent DECIMAL(5,2) DEFAULT 0,
    source VARCHAR(40) DEFAULT 'system',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_price_history_type_time ON price_history(type, recorded_at DESC);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    weight DECIMAL(10,2) NOT NULL,
    karat INTEGER DEFAULT 18,
    labor DECIMAL(5,2) DEFAULT 0,
    profit DECIMAL(5,2) DEFAULT 0,
    tax DECIMAL(5,2) DEFAULT 9,
    base_price DECIMAL(15,2) DEFAULT 0,
    final_price DECIMAL(15,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    images TEXT[] DEFAULT '{}',
    video TEXT,
    seller_name VARCHAR(255),
    seller_location VARCHAR(255),
    stones JSONB DEFAULT '[]'::jsonb,
    dimensions JSONB,
    metal_color VARCHAR(50),
    lock_type VARCHAR(50),
    is_new BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    discount DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    items JSONB NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending',
    address JSONB NOT NULL,
    tracking_code VARCHAR(100),
    payment_method VARCHAR(20) DEFAULT 'online',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auctions
CREATE TABLE auctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    seller_id UUID NOT NULL REFERENCES users(id),
    seller_name VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending_review',
    payment_status VARCHAR(30) DEFAULT 'unpaid',
    quality_status VARCHAR(30) DEFAULT 'not_sent',
    quality_badge BOOLEAN DEFAULT false,
    expert_id UUID,
    expert_name VARCHAR(255),
    expert_notes TEXT,
    starting_price DECIMAL(15,2) NOT NULL,
    reserve_price DECIMAL(15,2) DEFAULT 0,
    current_price DECIMAL(15,2) DEFAULT 0,
    bid_increment_type VARCHAR(20) DEFAULT 'amount',
    minimum_bid_increment DECIMAL(15,2) DEFAULT 0,
    bid_increment_percent DECIMAL(5,2) DEFAULT 0,
    bid_count INTEGER DEFAULT 0,
    duration_days INTEGER DEFAULT 1,
    auto_extend_minutes INTEGER DEFAULT 2,
    auto_extend_seconds INTEGER DEFAULT 300,
    payment_window_minutes INTEGER DEFAULT 1440,
    payment_deadline_at TIMESTAMP,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    commission_amount DECIMAL(15,2) DEFAULT 0,
    shipping_method VARCHAR(30) DEFAULT 'post',
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    reserve_met BOOLEAN DEFAULT false,
    winning_bidder_id UUID REFERENCES users(id),
    winning_bidder_name VARCHAR(255),
    winning_amount DECIMAL(15,2),
    second_winner_id UUID REFERENCES users(id),
    second_winner_name VARCHAR(255),
    second_winner_amount DECIMAL(15,2),
    is_featured BOOLEAN DEFAULT true,
    notes TEXT,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auction Bid History
CREATE TABLE auction_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(id),
    bidder_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    is_winning BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- C2C Used Gold Listings
CREATE TABLE used_gold_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id),
    seller_name VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    source VARCHAR(30) DEFAULT 'manual',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    karat INTEGER DEFAULT 18,
    stones JSONB,
    dimensions JSONB,
    metal_color VARCHAR(50),
    lock_type VARCHAR(50),
    images TEXT[] DEFAULT '{}',
    video TEXT,
    sale_type VARCHAR(20) DEFAULT 'direct',
    fixed_price DECIMAL(15,2),
    starting_price DECIMAL(15,2),
    reserve_price DECIMAL(15,2),
    minimum_bid_increment DECIMAL(15,2),
    auction_duration_days INTEGER DEFAULT 3,
    auto_extend_enabled BOOLEAN DEFAULT true,
    auto_extend_minutes INTEGER DEFAULT 2,
    auto_extend_seconds INTEGER DEFAULT 300,
    payment_window_minutes INTEGER DEFAULT 1440,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    quality_status VARCHAR(30) DEFAULT 'not_sent',
    quality_badge BOOLEAN DEFAULT false,
    expert_id UUID,
    expert_name VARCHAR(255),
    expert_notes TEXT,
    status VARCHAR(30) DEFAULT 'pending_review',
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Smart Vault Assets
CREATE TABLE smart_vault_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    weight DECIMAL(10,2) NOT NULL,
    karat INTEGER DEFAULT 18,
    purchase_price DECIMAL(15,2) NOT NULL,
    purchase_date TIMESTAMP NOT NULL,
    current_raw_gold_value DECIMAL(15,2) DEFAULT 0,
    current_value DECIMAL(15,2) DEFAULT 0,
    profit_loss DECIMAL(15,2) DEFAULT 0,
    profit_loss_percent DECIMAL(5,2) DEFAULT 0,
    images TEXT[] DEFAULT '{}',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_valuation_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES smart_vault_assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    raw_gold_value DECIMAL(15,2) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    profit_loss DECIMAL(15,2) DEFAULT 0,
    gold_price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(30) DEFAULT 'gold_price',
    target_id UUID,
    target_price DECIMAL(15,2) NOT NULL,
    trigger_condition VARCHAR(50) DEFAULT 'greater_than_or_equal',
    is_active BOOLEAN DEFAULT true,
    notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Buying
CREATE TABLE group_buying_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leader_id UUID NOT NULL REFERENCES users(id),
    leader_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'draft',
    payment_mode VARCHAR(30) DEFAULT 'member',
    target_amount DECIMAL(15,2) DEFAULT 0,
    discount_rate DECIMAL(5,2) DEFAULT 0,
    invite_code VARCHAR(30) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_buying_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES group_buying_groups(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_buying_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES group_buying_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    user_name VARCHAR(255) NOT NULL,
    share_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'invited',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community and Design Challenges
CREATE TABLE design_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    theme VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    reward_type VARCHAR(50),
    reward_value DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'draft',
    winner_post_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE design_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    model_url TEXT,
    challenge_id UUID REFERENCES design_challenges(id) ON DELETE SET NULL,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE design_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES design_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    user_name VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE design_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES design_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- Subscriptions and Discounts
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    level VARCHAR(30) DEFAULT 'silver',
    price DECIMAL(15,2) DEFAULT 0,
    duration_days INTEGER DEFAULT 30,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(30) DEFAULT 'active',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) DEFAULT 'percent',
    discount_value DECIMAL(10,2) DEFAULT 0,
    min_purchase DECIMAL(15,2) DEFAULT 0,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(30) DEFAULT 'in_app',
    is_read BOOLEAN DEFAULT false,
    metadata JSONB,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom Jewelry Builder
CREATE TABLE jewelry_designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    base_type VARCHAR(50) DEFAULT 'simple',
    weight DECIMAL(10,2) NOT NULL,
    karat INTEGER DEFAULT 18,
    metal_color VARCHAR(50),
    stones JSONB DEFAULT '[]'::jsonb,
    dimensions JSONB,
    image_url TEXT,
    model_url TEXT,
    preview_3d_url TEXT,
    estimated_gold_price DECIMAL(15,2) DEFAULT 0,
    labor_cost DECIMAL(15,2) DEFAULT 0,
    profit DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(5,2) DEFAULT 9,
    total_price DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jewelry_design_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID REFERENCES jewelry_designs(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    changes JSONB NOT NULL,
    total_price DECIMAL(15,2) DEFAULT 0,
    model_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gemstone_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    color VARCHAR(100),
    price_per_carat DECIMAL(12,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE custom_builder_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID REFERENCES jewelry_designs(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    gold_price_snapshot DECIMAL(15,2) NOT NULL,
    gold_weight DECIMAL(10,2) NOT NULL,
    labor_cost DECIMAL(15,2) NOT NULL,
    profit DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(5,2) DEFAULT 9,
    total DECIMAL(15,2) NOT NULL,
    expires_at TIMESTAMP,
    status VARCHAR(30) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Engine
CREATE TABLE ai_price_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    current_price DECIMAL(15,2) NOT NULL,
    predicted_price DECIMAL(15,2) NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    horizon_days INTEGER NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    features JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_design_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    design_id UUID REFERENCES jewelry_designs(id) ON DELETE SET NULL,
    product_ids UUID[] DEFAULT '{}',
    score DECIMAL(5,2) NOT NULL,
    reason TEXT NOT NULL,
    source VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_market_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    listing_id UUID REFERENCES used_gold_listings(id) ON DELETE SET NULL,
    score DECIMAL(5,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_service_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    value DECIMAL(15,4) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Escrow and Ratings
CREATE TABLE escrow_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES used_gold_listings(id) ON DELETE SET NULL,
    auction_id UUID REFERENCES auctions(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    fee DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'held',
    authority VARCHAR(255),
    payment_url TEXT,
    tracking_code VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE marketplace_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    listing_id UUID REFERENCES used_gold_listings(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    rating INTEGER DEFAULT 5,
    body TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments and Tracking
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    auction_id UUID REFERENCES auctions(id) ON DELETE SET NULL,
    escrow_id UUID REFERENCES escrow_payments(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    authority VARCHAR(255),
    reference_id VARCHAR(255),
    tracking_code VARCHAR(100),
    idempotency_key VARCHAR(80),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_payment_idempotency ON payment_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE order_tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Catalog Extensions
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE occasion_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    url TEXT NOT NULL,
    alt TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    color VARCHAR(100),
    price_per_carat DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_stones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stone_id UUID NOT NULL REFERENCES stones(id),
    carat DECIMAL(10,3) DEFAULT 0,
    position VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    warehouse VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seller_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    store_name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    rating DECIMAL(5,2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart and Wallet
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    reserved_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    balance DECIMAL(15,2) DEFAULT 0,
    gold_balance_grams DECIMAL(15,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    amount_grams DECIMAL(15,4) DEFAULT 0,
    order_id UUID,
    escrow_id UUID,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing Rules
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    labor_rate DECIMAL(15,2) DEFAULT 0,
    profit_rate DECIMAL(15,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 9,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pricing_spreads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_category VARCHAR(50) NOT NULL,
    spread_percent DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tax_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_category VARCHAR(50),
    tax_rate DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE labor_cost_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_category VARCHAR(50) NOT NULL,
    base_labor DECIMAL(15,2) DEFAULT 0,
    per_gram_labor DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Liquidity Engine
CREATE TABLE liquidity_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    asset_id UUID REFERENCES smart_vault_assets(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES used_gold_listings(id) ON DELETE SET NULL,
    expected_price DECIMAL(15,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sell_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    asset_id UUID REFERENCES smart_vault_assets(id) ON DELETE SET NULL,
    recommended_price DECIMAL(15,2) NOT NULL,
    liquidity_score DECIMAL(5,2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE buyer_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50),
    min_weight DECIMAL(10,2) DEFAULT 0,
    max_weight DECIMAL(10,2) DEFAULT 0,
    budget DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AR and Content
CREATE TABLE ar_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    design_id UUID REFERENCES jewelry_designs(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    model_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ar_previews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    model_id UUID NOT NULL REFERENCES ar_models(id) ON DELETE CASCADE,
    screenshot_url TEXT,
    video_url TEXT,
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    body TEXT NOT NULL,
    cover_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_value DECIMAL(15,2) DEFAULT 0,
    discount_type VARCHAR(30) DEFAULT 'percent',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    description TEXT,
    budget DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit and Community Extensions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(100),
    aggregate_id UUID,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    in_app BOOLEAN DEFAULT true,
    sms BOOLEAN DEFAULT false,
    push BOOLEAN DEFAULT true,
    email BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id),
    following_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

CREATE TABLE design_saves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    post_id UUID REFERENCES design_posts(id) ON DELETE SET NULL,
    design_id UUID REFERENCES jewelry_designs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE challenge_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES design_challenges(id) ON DELETE CASCADE,
    post_id UUID REFERENCES design_posts(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    reward_type VARCHAR(50) NOT NULL,
    reward_value DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Lifecycle
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    carrier VARCHAR(255),
    tracking_code VARCHAR(100),
    status VARCHAR(50) DEFAULT 'registered',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_cancellations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_kyc_profiles_status ON kyc_profiles(status);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);
CREATE INDEX idx_public_profiles_user_id ON public_profiles(user_id);
CREATE INDEX idx_gold_prices_type ON gold_prices(type);
CREATE INDEX idx_gold_prices_created_at ON gold_prices(created_at DESC);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_ends_at ON auctions(ends_at);
CREATE INDEX idx_auctions_product_id ON auctions(product_id);
CREATE INDEX idx_auctions_winning_bidder_id ON auctions(winning_bidder_id);
CREATE INDEX idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX idx_auction_bids_created_at ON auction_bids(created_at);
CREATE INDEX idx_used_gold_listings_status ON used_gold_listings(status);
CREATE INDEX idx_used_gold_listings_sale_type ON used_gold_listings(sale_type);
CREATE INDEX idx_smart_vault_assets_user_id ON smart_vault_assets(user_id);
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_group_buying_groups_invite_code ON group_buying_groups(invite_code);
CREATE INDEX idx_design_posts_challenge_id ON design_posts(challenge_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_jewelry_designs_user_id ON jewelry_designs(user_id);
CREATE INDEX idx_jewelry_designs_category ON jewelry_designs(category);
CREATE INDEX idx_jewelry_design_versions_design_id ON jewelry_design_versions(design_id);
CREATE INDEX idx_gemstone_library_type ON gemstone_library(type);
CREATE INDEX idx_custom_builder_quotes_user_id ON custom_builder_quotes(user_id);
CREATE INDEX idx_ai_price_predictions_target ON ai_price_predictions(target_type, target_id);
CREATE INDEX idx_ai_design_recommendations_user_id ON ai_design_recommendations(user_id);
CREATE INDEX idx_ai_market_matches_buyer_id ON ai_market_matches(buyer_id);
CREATE INDEX idx_escrow_payments_order_id ON escrow_payments(order_id);
CREATE INDEX idx_marketplace_ratings_reviewee_id ON marketplace_ratings(reviewee_id);
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_order_tracking_events_order_id ON order_tracking_events(order_id);
CREATE INDEX idx_product_categories_active ON product_categories(is_active);
CREATE INDEX idx_product_media_product_id ON product_media(product_id);
CREATE INDEX idx_product_stones_product_id ON product_stones(product_id);
CREATE INDEX idx_inventories_product_id ON inventories(product_id);
CREATE INDEX idx_seller_profiles_user_id ON seller_profiles(user_id);
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_pricing_spreads_category ON pricing_spreads(product_category);
CREATE INDEX idx_tax_rules_category ON tax_rules(product_category);
CREATE INDEX idx_labor_cost_rules_category ON labor_cost_rules(product_category);
CREATE INDEX idx_liquidity_requests_user_id ON liquidity_requests(user_id);
CREATE INDEX idx_sell_recommendations_user_id ON sell_recommendations(user_id);
CREATE INDEX idx_buyer_requests_status ON buyer_requests(status);
CREATE INDEX idx_ar_models_product_id ON ar_models(product_id);
CREATE INDEX idx_ar_previews_model_id ON ar_previews(model_id);
CREATE INDEX idx_content_pages_slug ON content_pages(slug);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at DESC);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_design_saves_user_id ON design_saves(user_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_challenge_rewards_challenge_id ON challenge_rewards(challenge_id);
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_order_cancellations_order_id ON order_cancellations(order_id);

-- Insert sample data
INSERT INTO gold_prices (type, value, change, change_percent) VALUES
('mizaneh', 142500000, 1250000, 0.88),
('coin', 41500000, -350000, -0.84),
('ounce', 2035, 12, 0.59),
('gold18', 3560000, 28000, 0.79);

INSERT INTO products (name, category, description, weight, karat, labor, profit, tax, base_price, final_price, stock, images, is_new, is_featured) VALUES
('انگشتر طلای ۱۸ عیار طرح الماس', 'ring', 'انگشتر ظریف طلای ۱۸ عیار با نگین الماس طبیعی', 4.2, 18, 12, 8, 9, 14952000, 18500000, 12, ARRAY['/images/ring-1.jpg'], true, true),
('گردنبند طلای ۱۸ عیار طرح قلب', 'necklace', 'گردنبند طلای ۱۸ عیار با طرح قلب', 6.5, 18, 10, 7, 9, 23140000, 28200000, 8, ARRAY['/images/necklace-1.jpg'], false, true),
('دستبند طلای ۱۸ عیار طرح زنجیر', 'bracelet', 'دستبند طلای ۱۸ عیار با طرح زنجیر کلاسیک', 8.1, 18, 8, 6, 9, 28836000, 34500000, 5, ARRAY['/images/bracelet-1.jpg'], false, false),
('گوشواره طلای ۱۸ عیار طرح حلقه‌ای', 'earring', 'گوشواره طلای ۱۸ عیار با طرح حلقه‌ای مدرن', 3.8, 18, 11, 7, 9, 13528000, 16800000, 15, ARRAY['/images/earring-1.jpg'], true, false),
('آویز طلای ۱۸ عیار طرح ستاره', 'pendant', 'آویز طلای ۱۸ عیار با طرح ستاره', 2.5, 18, 9, 6, 9, 8900000, 11200000, 20, ARRAY['/images/pendant-1.jpg'], false, false),
('انگشتر طلای ۲۴ عیار طرح ساده', 'ring', 'انگشتر طلای ۲۴ عیار با طراحی ساده و کلاسیک', 5.0, 24, 5, 5, 9, 17800000, 20500000, 10, ARRAY['/images/ring-2.jpg'], false, true);
