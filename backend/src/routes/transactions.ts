import { Router, Request, Response } from 'express';
import { TransactionModel } from '../models/Transaction';

const router = Router();

// Record a transaction
router.post('/track', async (req: Request, res: Response) => {
  try {
    const {
      txHash,
      userAddress,
      marketId,
      actionType,
      amount,
      outcome,
      success,
      blockNumber,
      gasUsed,
      gasPrice,
      errorMessage
    } = req.body;

    // Validate required fields
    if (!txHash || !userAddress || !marketId || !actionType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: txHash, userAddress, marketId, actionType'
      });
    }

    // Validate action type
    const validActionTypes = ['create', 'bet', 'claim', 'add_liquidity', 'remove_liquidity', 'claim_fees', 'resolve'];
    if (!validActionTypes.includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action type. Must be one of: ${validActionTypes.join(', ')}`
      });
    }

    const transaction = await TransactionModel.recordTransaction({
      txHash,
      userAddress,
      marketId: parseInt(marketId),
      actionType,
      amount: amount ? parseFloat(amount) : undefined,
      outcome,
      success: success !== false, // Default to true if not specified
      blockNumber: blockNumber ? parseInt(blockNumber) : undefined,
      gasUsed: gasUsed ? parseInt(gasUsed) : undefined,
      gasPrice: gasPrice ? parseInt(gasPrice) : undefined,
      errorMessage
    });

    // Update user activity if transaction was successful
    if (transaction.success) {
      await TransactionModel.updateUserActivity(userAddress);
    }

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error recording transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record transaction'
    });
  }
});

// Get user's transaction history
router.get('/user/:address', async (req: Request, res: Response) => {
  try {
    const userAddress = req.params.address;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address'
      });
    }

    const transactions = await TransactionModel.getUserTransactions(userAddress, limit);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user transactions'
    });
  }
});

// Get user activity/stats
router.get('/user/:address/activity', async (req: Request, res: Response) => {
  try {
    const userAddress = req.params.address;

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address'
      });
    }

    const activity = await TransactionModel.getUserActivity(userAddress);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'User activity not found'
      });
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    });
  }
});

// Get platform statistics
router.get('/stats/platform', async (req: Request, res: Response) => {
  try {
    const stats = await TransactionModel.getPlatformStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform statistics'
    });
  }
});

// Get transaction by hash
router.get('/hash/:txHash', async (req: Request, res: Response) => {
  try {
    const txHash = req.params.txHash;

    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash'
      });
    }

    // This would need to be implemented in the TransactionModel
    // For now, we'll return a placeholder
    res.json({
      success: true,
      data: {
        txHash,
        message: 'Transaction lookup by hash not yet implemented'
      }
    });
  } catch (error) {
    console.error('Error fetching transaction by hash:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction'
    });
  }
});

export default router;
