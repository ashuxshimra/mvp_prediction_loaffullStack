import { Router, Request, Response } from 'express';
import { MarketModel } from '../models/Market';
import { TransactionModel } from '../models/Transaction';

const router = Router();

// Get all markets with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const markets = await MarketModel.getAllMarkets(limit, offset);
    
    res.json({
      success: true,
      data: markets,
      pagination: {
        page,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch markets'
    });
  }
});

// Get specific market by ID
router.get('/:marketId', async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.marketId);
    
    if (isNaN(marketId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market ID'
      });
    }

    const market = await MarketModel.getMarket(marketId);
    
    if (!market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found'
      });
    }

    // Get market analytics
    const analytics = await MarketModel.getAnalytics(marketId);
    
    res.json({
      success: true,
      data: {
        ...market,
        analytics
      }
    });
  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market'
    });
  }
});

// Create or update market metadata
router.post('/:marketId/metadata', async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.marketId);
    const { question, description, category, imageUrl, creatorAddress, tags, sourceUrl } = req.body;

    if (isNaN(marketId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market ID'
      });
    }

    if (!question || !creatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Question and creator address are required'
      });
    }

    // Check if market already exists
    const existingMarket = await MarketModel.getMarket(marketId);
    
    if (existingMarket) {
      // Market already exists, return existing data
      return res.status(200).json({
        success: true,
        data: existingMarket,
        message: 'Market metadata already exists'
      });
    }

    // Create new market metadata
    const market = await MarketModel.createMarket({
      marketId,
      question,
      description,
      category,
      imageUrl,
      creatorAddress,
      tags,
      sourceUrl
    });

    res.status(201).json({
      success: true,
      data: market
    });
  } catch (error) {
    console.error('Error creating market metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create market metadata'
    });
  }
});

// Update market analytics
router.post('/:marketId/analytics', async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.marketId);
    const { totalVolume, totalTrades, uniqueParticipants, yesVolume, noVolume } = req.body;

    if (isNaN(marketId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market ID'
      });
    }

    await MarketModel.updateAnalytics({
      marketId,
      totalVolume: totalVolume || 0,
      totalTrades: totalTrades || 0,
      uniqueParticipants: uniqueParticipants || 0,
      yesVolume: yesVolume || 0,
      noVolume: noVolume || 0
    });

    res.json({
      success: true,
      message: 'Analytics updated successfully'
    });
  } catch (error) {
    console.error('Error updating analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update analytics'
    });
  }
});

// Get market transactions
router.get('/:marketId/transactions', async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.marketId);
    const limit = parseInt(req.query.limit as string) || 50;

    if (isNaN(marketId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market ID'
      });
    }

    const transactions = await TransactionModel.getMarketTransactions(marketId, limit);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching market transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market transactions'
    });
  }
});

// Search markets
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.params.query;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search term must be at least 2 characters'
      });
    }

    const markets = await MarketModel.searchMarkets(searchTerm, limit);
    
    res.json({
      success: true,
      data: markets,
      query: searchTerm
    });
  } catch (error) {
    console.error('Error searching markets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search markets'
    });
  }
});

export default router;
