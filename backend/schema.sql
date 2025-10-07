-- PredictPro Database Schema
-- PostgreSQL database schema for off-chain infrastructure

-- Create database (run this separately)
-- CREATE DATABASE predictpro;

-- Markets table - stores market metadata
CREATE TABLE IF NOT EXISTS markets (
    id SERIAL PRIMARY KEY,
    market_id BIGINT UNIQUE NOT NULL,
    question TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    image_url TEXT,
    creator_address VARCHAR(42) NOT NULL,
    tags JSONB,
    source_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market analytics table - stores trading statistics
CREATE TABLE IF NOT EXISTS market_analytics (
    id SERIAL PRIMARY KEY,
    market_id BIGINT UNIQUE NOT NULL,
    total_volume DECIMAL(20, 6) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    unique_participants INTEGER DEFAULT 0,
    yes_volume DECIMAL(20, 6) DEFAULT 0,
    no_volume DECIMAL(20, 6) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE
);

-- Transactions table - tracks all blockchain transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    market_id BIGINT NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('create', 'bet', 'claim', 'add_liquidity', 'remove_liquidity', 'claim_fees', 'resolve')),
    amount DECIMAL(20, 6),
    outcome VARCHAR(3) CHECK (outcome IN ('yes', 'no')),
    success BOOLEAN NOT NULL DEFAULT true,
    block_number BIGINT,
    gas_used BIGINT,
    gas_price BIGINT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE
);

-- User activity table - stores user statistics
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) UNIQUE NOT NULL,
    total_bets INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 6) DEFAULT 0,
    total_winnings DECIMAL(20, 6) DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    total_markets_created INTEGER DEFAULT 0,
    total_liquidity_provided DECIMAL(20, 6) DEFAULT 0,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table - stores user notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    market_id BIGINT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('market_created', 'market_resolved', 'bet_placed', 'claim_available', 'liquidity_added')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_markets_market_id ON markets(market_id);
CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator_address);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_transactions_market ON transactions(market_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);

CREATE INDEX IF NOT EXISTS idx_user_activity_address ON user_activity(user_address);
CREATE INDEX IF NOT EXISTS idx_user_activity_volume ON user_activity(total_volume);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_address);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_activity_updated_at BEFORE UPDATE ON user_activity
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO markets (market_id, question, description, category, creator_address, tags) VALUES
(1, 'Will Bitcoin reach $100,000 by end of 2024?', 'Bitcoin price prediction for end of year', 'Crypto', '0xc247F825faF92014d10FA57822f0CfEC9Db050A9', '["bitcoin", "crypto", "price"]'),
(2, 'Will Ethereum 2.0 be fully implemented by Q2 2024?', 'Ethereum upgrade completion prediction', 'Crypto', '0xc247F825faF92014d10FA57822f0CfEC9Db050A9', '["ethereum", "upgrade", "technology"]'),
(3, 'Will the S&P 500 close above 5000 by year end?', 'Stock market index prediction', 'Finance', '0xc247F825faF92014d10FA57822f0CfEC9Db050A9', '["stocks", "sp500", "finance"]')
ON CONFLICT (market_id) DO NOTHING;
