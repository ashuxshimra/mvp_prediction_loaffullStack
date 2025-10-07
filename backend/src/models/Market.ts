import pool from '../config/database';

export interface MarketMetadata {
  marketId: number;
  question: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  creatorAddress: string;
  createdAt: Date;
  tags?: string[];
  sourceUrl?: string;
}

export interface MarketAnalytics {
  marketId: number;
  totalVolume: number;
  totalTrades: number;
  uniqueParticipants: number;
  yesVolume: number;
  noVolume: number;
  lastUpdated: Date;
}

export class MarketModel {
  // Create market metadata
  static async createMarket(metadata: Omit<MarketMetadata, 'createdAt'>): Promise<MarketMetadata> {
    const query = `
      INSERT INTO markets (market_id, question, description, category, image_url, creator_address, tags, source_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      metadata.marketId,
      metadata.question,
      metadata.description || null,
      metadata.category || null,
      metadata.imageUrl || null,
      metadata.creatorAddress,
      metadata.tags ? JSON.stringify(metadata.tags) : null,
      metadata.sourceUrl || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get market metadata
  static async getMarket(marketId: number): Promise<MarketMetadata | null> {
    const query = 'SELECT * FROM markets WHERE market_id = $1';
    const result = await pool.query(query, [marketId]);
    return result.rows[0] || null;
  }

  // Get all markets with pagination
  static async getAllMarkets(limit: number = 20, offset: number = 0): Promise<MarketMetadata[]> {
    const query = `
      SELECT * FROM markets 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  // Update market analytics
  static async updateAnalytics(analytics: Omit<MarketAnalytics, 'lastUpdated'>): Promise<void> {
    const query = `
      INSERT INTO market_analytics (market_id, total_volume, total_trades, unique_participants, yes_volume, no_volume)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (market_id) 
      DO UPDATE SET 
        total_volume = EXCLUDED.total_volume,
        total_trades = EXCLUDED.total_trades,
        unique_participants = EXCLUDED.unique_participants,
        yes_volume = EXCLUDED.yes_volume,
        no_volume = EXCLUDED.no_volume,
        last_updated = CURRENT_TIMESTAMP
    `;
    
    const values = [
      analytics.marketId,
      analytics.totalVolume,
      analytics.totalTrades,
      analytics.uniqueParticipants,
      analytics.yesVolume,
      analytics.noVolume
    ];

    await pool.query(query, values);
  }

  // Get market analytics
  static async getAnalytics(marketId: number): Promise<MarketAnalytics | null> {
    const query = 'SELECT * FROM market_analytics WHERE market_id = $1';
    const result = await pool.query(query, [marketId]);
    return result.rows[0] || null;
  }

  // Search markets
  static async searchMarkets(searchTerm: string, limit: number = 20): Promise<MarketMetadata[]> {
    const query = `
      SELECT * FROM markets 
      WHERE question ILIKE $1 OR description ILIKE $1 OR category ILIKE $1
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }
}
