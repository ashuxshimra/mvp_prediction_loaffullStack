import pool from '../config/database';

export interface TransactionRecord {
  id?: number;
  txHash: string;
  userAddress: string;
  marketId: number;
  actionType: 'create' | 'bet' | 'claim' | 'add_liquidity' | 'remove_liquidity' | 'claim_fees' | 'resolve';
  amount?: number;
  outcome?: 'yes' | 'no';
  success: boolean;
  blockNumber?: number;
  gasUsed?: number;
  gasPrice?: number;
  createdAt: Date;
  errorMessage?: string;
}

export interface UserActivity {
  userAddress: string;
  totalBets: number;
  totalVolume: number;
  totalWinnings: number;
  winRate: number;
  totalMarketsCreated: number;
  totalLiquidityProvided: number;
  lastActive: Date;
}

export class TransactionModel {
  // Record a transaction
  static async recordTransaction(transaction: Omit<TransactionRecord, 'id' | 'createdAt'>): Promise<TransactionRecord> {
    const query = `
      INSERT INTO transactions (tx_hash, user_address, market_id, action_type, amount, outcome, success, block_number, gas_used, gas_price, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      transaction.txHash,
      transaction.userAddress,
      transaction.marketId,
      transaction.actionType,
      transaction.amount || null,
      transaction.outcome || null,
      transaction.success,
      transaction.blockNumber || null,
      transaction.gasUsed || null,
      transaction.gasPrice || null,
      transaction.errorMessage || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get user's transaction history
  static async getUserTransactions(userAddress: string, limit: number = 50): Promise<TransactionRecord[]> {
    const query = `
      SELECT * FROM transactions 
      WHERE user_address = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [userAddress, limit]);
    return result.rows;
  }

  // Get market transactions
  static async getMarketTransactions(marketId: number, limit: number = 100): Promise<TransactionRecord[]> {
    const query = `
      SELECT * FROM transactions 
      WHERE market_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [marketId, limit]);
    return result.rows;
  }

  // Update user activity
  static async updateUserActivity(userAddress: string): Promise<UserActivity> {
    // Calculate user statistics
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN action_type = 'bet' THEN 1 END) as total_bets,
        COALESCE(SUM(CASE WHEN action_type = 'bet' THEN amount ELSE 0 END), 0) as total_volume,
        COUNT(CASE WHEN action_type = 'create' THEN 1 END) as total_markets_created,
        COALESCE(SUM(CASE WHEN action_type = 'add_liquidity' THEN amount ELSE 0 END), 0) as total_liquidity_provided,
        MAX(created_at) as last_active
      FROM transactions 
      WHERE user_address = $1 AND success = true
    `;
    
    const statsResult = await pool.query(statsQuery, [userAddress]);
    const stats = statsResult.rows[0];

    // Calculate win rate (simplified - would need more complex logic for actual wins)
    const winQuery = `
      SELECT COUNT(*) as winning_claims
      FROM transactions 
      WHERE user_address = $1 AND action_type = 'claim' AND success = true
    `;
    const winResult = await pool.query(winQuery, [userAddress]);
    const winRate = stats.total_bets > 0 ? (winResult.rows[0].winning_claims / stats.total_bets) * 100 : 0;

    const userActivity: UserActivity = {
      userAddress,
      totalBets: parseInt(stats.total_bets) || 0,
      totalVolume: parseFloat(stats.total_volume) || 0,
      totalWinnings: 0, // Would need to calculate from claim transactions
      winRate: parseFloat(winRate.toFixed(2)),
      totalMarketsCreated: parseInt(stats.total_markets_created) || 0,
      totalLiquidityProvided: parseFloat(stats.total_liquidity_provided) || 0,
      lastActive: stats.last_active || new Date()
    };

    // Upsert user activity
    const upsertQuery = `
      INSERT INTO user_activity (user_address, total_bets, total_volume, total_winnings, win_rate, total_markets_created, total_liquidity_provided, last_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_address) 
      DO UPDATE SET 
        total_bets = EXCLUDED.total_bets,
        total_volume = EXCLUDED.total_volume,
        total_winnings = EXCLUDED.total_winnings,
        win_rate = EXCLUDED.win_rate,
        total_markets_created = EXCLUDED.total_markets_created,
        total_liquidity_provided = EXCLUDED.total_liquidity_provided,
        last_active = EXCLUDED.last_active
    `;
    
    const values = [
      userActivity.userAddress,
      userActivity.totalBets,
      userActivity.totalVolume,
      userActivity.totalWinnings,
      userActivity.winRate,
      userActivity.totalMarketsCreated,
      userActivity.totalLiquidityProvided,
      userActivity.lastActive
    ];

    await pool.query(upsertQuery, values);
    return userActivity;
  }

  // Get user activity
  static async getUserActivity(userAddress: string): Promise<UserActivity | null> {
    const query = 'SELECT * FROM user_activity WHERE user_address = $1';
    const result = await pool.query(query, [userAddress]);
    return result.rows[0] || null;
  }

  // Get platform statistics
  static async getPlatformStats(): Promise<{
    totalMarkets: number;
    totalTransactions: number;
    totalVolume: number;
    activeUsers: number;
  }> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM markets) as total_markets,
        (SELECT COUNT(*) FROM transactions WHERE success = true) as total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE action_type = 'bet' AND success = true) as total_volume,
        (SELECT COUNT(DISTINCT user_address) FROM transactions WHERE success = true) as active_users
    `;
    
    const result = await pool.query(query);
    const stats = result.rows[0];
    
    return {
      totalMarkets: parseInt(stats.total_markets),
      totalTransactions: parseInt(stats.total_transactions),
      totalVolume: parseFloat(stats.total_volume),
      activeUsers: parseInt(stats.active_users)
    };
  }
}
