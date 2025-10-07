// PredictPro Backend API Integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface MarketMetadata {
  marketId: number;
  question: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  creatorAddress: string;
  createdAt: string;
  tags?: string[];
  sourceUrl?: string;
}

export interface TransactionRecord {
  txHash: string;
  userAddress: string;
  marketId: number;
  actionType: 'create' | 'bet' | 'claim' | 'add_liquidity' | 'remove_liquidity' | 'claim_fees' | 'resolve';
  amount?: number;
  outcome?: 'yes' | 'no';
  success: boolean;
  blockNumber?: number;
  createdAt: string;
}

export interface UserActivity {
  userAddress: string;
  totalBets: number;
  totalVolume: number;
  totalWinnings: number;
  winRate: number;
  totalMarketsCreated: number;
  totalLiquidityProvided: number;
  lastActive: string;
}

export interface PlatformStats {
  totalMarkets: number;
  totalTransactions: number;
  totalVolume: number;
  activeUsers: number;
}

class PredictProAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  // Market endpoints
  async getMarkets(page: number = 1, limit: number = 20): Promise<{ data: MarketMetadata[]; pagination: any }> {
    return this.request(`/api/markets?page=${page}&limit=${limit}`);
  }

  async getMarket(marketId: number): Promise<{ data: MarketMetadata & { analytics?: any } }> {
    return this.request(`/api/markets/${marketId}`);
  }

  async createMarketMetadata(metadata: Omit<MarketMetadata, 'createdAt'>): Promise<{ data: MarketMetadata }> {
    return this.request(`/api/markets/${metadata.marketId}/metadata`, {
      method: 'POST',
      body: JSON.stringify(metadata),
    });
  }

  async updateMarketAnalytics(marketId: number, analytics: {
    totalVolume: number;
    totalTrades: number;
    uniqueParticipants: number;
    yesVolume: number;
    noVolume: number;
  }): Promise<{ success: boolean }> {
    return this.request(`/api/markets/${marketId}/analytics`, {
      method: 'POST',
      body: JSON.stringify(analytics),
    });
  }

  async searchMarkets(query: string, limit: number = 20): Promise<{ data: MarketMetadata[] }> {
    return this.request(`/api/markets/search/${encodeURIComponent(query)}?limit=${limit}`);
  }

  // Transaction endpoints
  async trackTransaction(transaction: Omit<TransactionRecord, 'createdAt'>): Promise<{ data: TransactionRecord }> {
    return this.request('/api/transactions/track', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  async getUserTransactions(userAddress: string, limit: number = 50): Promise<{ data: TransactionRecord[] }> {
    return this.request(`/api/transactions/user/${userAddress}?limit=${limit}`);
  }

  async getUserActivity(userAddress: string): Promise<{ data: UserActivity }> {
    return this.request(`/api/transactions/user/${userAddress}/activity`);
  }

  async getPlatformStats(): Promise<{ data: PlatformStats }> {
    return this.request('/api/transactions/stats/platform');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }
}

// Export singleton instance
export const predictProAPI = new PredictProAPI();

// Helper functions for common operations
export const trackSuccessfulTransaction = async (
  txHash: string,
  userAddress: string,
  marketId: number,
  actionType: TransactionRecord['actionType'],
  amount?: number,
  outcome?: 'yes' | 'no',
  blockNumber?: number
) => {
  try {
    await predictProAPI.trackTransaction({
      txHash,
      userAddress,
      marketId,
      actionType,
      amount,
      outcome,
      success: true,
      blockNumber,
    });
    console.log(`✅ Transaction tracked: ${actionType} for market ${marketId}`);
  } catch (error) {
    console.error('❌ Failed to track transaction:', error);
    // Don't throw - tracking failure shouldn't break the main flow
  }
};

export const trackFailedTransaction = async (
  txHash: string,
  userAddress: string,
  marketId: number,
  actionType: TransactionRecord['actionType'],
  errorMessage: string
) => {
  try {
    await predictProAPI.trackTransaction({
      txHash,
      userAddress,
      marketId,
      actionType,
      success: false,
      errorMessage,
    });
    console.log(`❌ Failed transaction tracked: ${actionType} for market ${marketId}`);
  } catch (error) {
    console.error('❌ Failed to track failed transaction:', error);
  }
};

export const createMarketMetadata = async (
  marketId: number,
  question: string,
  creatorAddress: string,
  description?: string,
  category?: string,
  imageUrl?: string,
  tags?: string[]
) => {
  try {
    await predictProAPI.createMarketMetadata({
      marketId,
      question,
      description,
      category,
      imageUrl,
      creatorAddress,
      tags,
    });
    console.log(`✅ Market metadata created for market ${marketId}`);
  } catch (error) {
    console.error('❌ Failed to create market metadata:', error);
  }
};
