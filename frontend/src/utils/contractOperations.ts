import { formatUnits, JsonRpcSigner, parseUnits } from "ethers";
import { avalancheFuji } from "wagmi/chains";
import {
  getContractInstance,
  getContractRead,
  getContractInstanceWithAddress,
} from "./contracts";
import { trackSuccessfulTransaction, trackFailedTransaction, createMarketMetadata } from "./api";

// Helper function to get signer from wagmi
const getSigner = async (): Promise<JsonRpcSigner | null> => {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      console.log('Getting signer from window.ethereum...');
      const provider = new (await import('ethers')).BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      console.log('Signer obtained:', await signer.getAddress());
      return signer as JsonRpcSigner;
    }
    console.log('window.ethereum not available');
    return null;
  } catch (error) {
    console.error('Error getting signer:', error);
    return null;
  }
};

// Types
export interface Market {
  id: number;
  question: string;
  creator: string;
  resolutionTime: number;
  createdAt: number;
  status: number; // 0: Active, 1: Resolved, 2: Cancelled
  outcome: number; // 0: Unresolved, 1: Yes, 2: No, 3: Invalid
  totalYesShares: bigint;
  totalNoShares: bigint;
  liquidityPool: bigint;
  feesCollected: bigint;
}

export interface MarketFormData {
  question: string;
  resolutionTime: number;
}

// Read Operations
export const PredictionMarketReader = {
  // Get market count
  async getMarketCount(chainId: number = avalancheFuji.id): Promise<number> {
    const contract = await getContractRead(chainId, "PredictionMarket");
    if (!contract) {
      console.error("Contract not found");
      return 0;
    }

    try {
      const count = await contract.marketCount();
      return Number(count);
    } catch (error) {
      console.error("Error getting market count", error);
      return 0;
    }
  },

  // Get market details
  async getMarket(marketId: number, chainId: number = avalancheFuji.id): Promise<Market | null> {
    const contract = await getContractRead(chainId, "PredictionMarket");
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const market = await contract.getMarket(marketId);
      return {
        id: Number(market.id),
        question: market.question,
        creator: market.creator,
        resolutionTime: Number(market.resolutionTime),
        createdAt: Number(market.createdAt),
        status: Number(market.status),
        outcome: Number(market.outcome),
        totalYesShares: market.totalYesShares,
        totalNoShares: market.totalNoShares,
        liquidityPool: market.liquidityPool,
        feesCollected: market.feesCollected,
      };
    } catch (error) {
      console.error("Error getting market", error);
      return null;
    }
  },

  // Get all markets
  async getAllMarkets(chainId: number = avalancheFuji.id): Promise<Market[]> {
    const count = await this.getMarketCount(chainId);
    const markets: Market[] = [];

    for (let i = 0; i < count; i++) {
      const market = await this.getMarket(i, chainId);
      if (market) {
        markets.push(market);
      }
    }

    return markets;
  },

  // Get share price
  async getSharePrice(
    marketId: number,
    isYes: boolean,
    chainId: number = avalancheFuji.id
  ): Promise<number> {
    const contract = await getContractRead(chainId, "PredictionMarket");
    if (!contract) {
      console.error("Contract not found");
      return 0;
    }

    try {
      const price = await contract.getSharePrice(marketId, isYes);
      return Number(price);
    } catch (error) {
      console.error("Error getting share price", error);
      return 0;
    }
  },

  // Get shares out for a given input
  async getSharesOut(
    marketId: number,
    isYes: boolean,
    amountIn: number,
    chainId: number = avalancheFuji.id
  ): Promise<number> {
    const contract = await getContractRead(chainId, "PredictionMarket");
    if (!contract) {
      console.error("Contract not found");
      return 0;
    }

    try {
      const parsedAmount = parseUnits(amountIn.toString(), 6); // USDC has 6 decimals
      const sharesOut = await contract.getSharesOut(marketId, isYes, parsedAmount);
      return Number(formatUnits(sharesOut, 6));
    } catch (error) {
      console.error("Error getting shares out", error);
      return 0;
    }
  },

  // Get USDC balance
  async getUSDCBalance(address: string, chainId: number = avalancheFuji.id): Promise<number> {
    const contract = await getContractRead(chainId, "MockUSDC");
    if (!contract) {
      console.error("Contract not found");
      return 0;
    }

    try {
      const balance = await contract.balanceOf(address);
      return Number(formatUnits(balance, 6));
    } catch (error) {
      console.error("Error getting USDC balance", error);
      return 0;
    }
  },

  // Get USDC allowance
  async getUSDCAllowance(
    owner: string,
    spender: string,
    chainId: number = avalancheFuji.id
  ): Promise<number> {
    const contract = await getContractRead(chainId, "MockUSDC");
    if (!contract) {
      console.error("Contract not found");
      return 0;
    }

    try {
      const allowance = await contract.allowance(owner, spender);
      return Number(formatUnits(allowance, 6));
    } catch (error) {
      console.error("Error getting USDC allowance", error);
      return 0;
    }
  },

  // Get outcome token balance
  async getOutcomeTokenBalance(
    marketId: number,
    isYes: boolean,
    address: string,
    chainId: number = avalancheFuji.id
  ): Promise<number> {
    const contract = await getContractRead(chainId, "PredictionMarket");
    if (!contract) {
      console.error("Contract not found");
      return 0;
    }

    try {
      const tokenAddress = isYes 
        ? await contract.yesTokens(marketId)
        : await contract.noTokens(marketId);
      
      const tokenContract = await getContractInstanceWithAddress(
        chainId,
        "OutcomeToken",
        tokenAddress
      );
      
      if (!tokenContract) return 0;
      
      const balance = await tokenContract.balanceOf(address);
      return Number(formatUnits(balance, 6));
    } catch (error) {
      console.error("Error getting outcome token balance", error);
      return 0;
    }
  },

  // Get oracle address
  async getOracle(chainId: number = avalancheFuji.id): Promise<string> {
    const contract = await getContractRead(chainId, "PredictionMarket");
    if (!contract) {
      console.error("Contract not found");
      return "";
    }

    try {
      return await contract.oracle();
    } catch (error) {
      console.error("Error getting oracle", error);
      return "";
    }
  },

  // Get user's token balance for a specific market
  async getUserTokenBalance(
    userAddress: string,
    marketId: number,
    isYes: boolean,
    chainId: number = avalancheFuji.id
  ): Promise<number> {
    try {
      const contract = await getContractRead(chainId, "PredictionMarket");
      if (!contract) {
        console.error("Contract not found");
        return 0;
      }
      
      // Get the token address for this market
      const tokenAddress = isYes 
        ? await contract.yesTokens(marketId)
        : await contract.noTokens(marketId);
      
      if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
        return 0;
      }
      
      // Get the token contract instance
      const tokenContract = await getContractInstanceWithAddress(chainId, "OutcomeToken", tokenAddress);
      if (!tokenContract) {
        console.error("Token contract not found");
        return 0;
      }
      
      // Get user's balance
      const balance = await tokenContract.balanceOf(userAddress);
      return Number(formatUnits(balance, 6)); // USDC has 6 decimals
    } catch (error) {
      console.error("Error getting user token balance:", error);
      return 0;
    }
  },

  // Get liquidity provider earnings for a user
  async getLiquidityProviderEarnings(
    userAddress: string,
    marketId: number,
    chainId: number = avalancheFuji.id
  ): Promise<number> {
    try {
      const contract = await getContractRead(chainId, "PredictionMarket");
      if (!contract) {
        console.error("Contract not found");
        return 0;
      }

      // Use the new getClaimableLiquidityProviderFees function
      const claimableAmount = await contract.getClaimableLiquidityProviderFees(marketId, userAddress);
      return Number(formatUnits(claimableAmount, 6));
    } catch (error) {
      console.error("Error getting liquidity provider earnings:", error);
      return 0;
    }
  },
};

// Write Operations
export const PredictionMarketWriter = {
  // Approve USDC spending
  async approveUSDC(
    amount: number,
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<string | null> {
    const signerToUse = signer || await getSigner();
    if (!signerToUse) {
      console.error("No signer available");
      return null;
    }
    
    const contract = await getContractInstance(chainId, "MockUSDC", signerToUse);
    const predictionMarket = await getContractRead(chainId, "PredictionMarket");
    
    if (!contract || !predictionMarket) {
      console.error("Contract not found");
      return null;
    }

    try {
      const parsedAmount = parseUnits(amount.toString(), 6);
      const tx = await contract.approve(predictionMarket.target, parsedAmount);
      const receipt = await tx.wait();
      return receipt?.hash || null;
    } catch (error: unknown) {
      console.error("Error approving USDC", error);
      if (error && typeof error === 'object' && 'reason' in error) {
        return (error as { reason: string }).reason;
      }
      return null;
    }
  },

  // Create market
  async createMarket(
    question: string,
    resolutionTime: number,
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<{ hash: string; marketId: number } | null> {
    const signerToUse = signer || await getSigner();
    if (!signerToUse) {
      console.error("No signer available");
      return null;
    }
    
    const contract = await getContractInstance(chainId, "PredictionMarket", signerToUse);
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const tx = await contract.createMarket(question, resolutionTime);
      const receipt = await tx.wait();

      // Get the MarketCreated event from the receipt
      const event = receipt?.logs
        .map((log: unknown) => {
          try {
            return contract.interface.parseLog(log as { topics: string[]; data: string });
          } catch {
            return null;
          }
        })
        .find((event: unknown) => event && typeof event === 'object' && 'name' in event && (event as { name: string }).name === "MarketCreated");

      const result = {
        hash: receipt?.hash || "",
        marketId: event ? Number((event as { args: { marketId: bigint } }).args.marketId) : 0,
      };

      // Track successful transaction in backend
      if (result.hash && result.marketId > 0) {
        const userAddress = await signerToUse.getAddress();
        await trackSuccessfulTransaction(
          result.hash,
          userAddress,
          result.marketId,
          'create',
          undefined,
          undefined,
          receipt?.blockNumber
        );

        // Create market metadata in backend
        await createMarketMetadata(
          result.marketId,
          question,
          userAddress,
          undefined, // description
          'General', // default category
          undefined, // imageUrl
          ['prediction', 'market'] // default tags
        );
      }

      return result;
    } catch (error: unknown) {
      console.error("Error creating market", error);
      
      // Track failed transaction
      if (signerToUse) {
        try {
          const userAddress = await signerToUse.getAddress();
          await trackFailedTransaction(
            '', // no tx hash for failed transactions
            userAddress,
            0, // no market ID for failed creation
            'create',
            error && typeof error === 'object' && 'reason' in error 
              ? (error as { reason: string }).reason 
              : 'Unknown error'
          );
        } catch (trackingError) {
          console.error('Failed to track failed transaction:', trackingError);
        }
      }

      if (error && typeof error === 'object' && 'reason' in error) {
        return { hash: "", marketId: 0 };
      }
      return null;
    }
  },

  // Add liquidity
  async addLiquidity(
    marketId: number,
    amount: number,
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<string | null> {
    const signerToUse = signer || await getSigner();
    if (!signerToUse) {
      console.error("No signer available");
      return null;
    }
    
    const contract = await getContractInstance(chainId, "PredictionMarket", signerToUse);
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const parsedAmount = parseUnits(amount.toString(), 6);
      const tx = await contract.addLiquidity(marketId, parsedAmount);
      const receipt = await tx.wait();
      
      const txHash = receipt?.hash || null;
      
      // Track successful transaction in backend
      if (txHash) {
        const userAddress = await signerToUse.getAddress();
        await trackSuccessfulTransaction(
          txHash,
          userAddress,
          marketId,
          'add_liquidity',
          amount,
          undefined,
          receipt?.blockNumber
        );
      }
      
      return txHash;
    } catch (error: unknown) {
      console.error("Error adding liquidity", error);
      
      // Track failed transaction
      if (signerToUse) {
        try {
          const userAddress = await signerToUse.getAddress();
          await trackFailedTransaction(
            '',
            userAddress,
            marketId,
            'add_liquidity',
            error && typeof error === 'object' && 'reason' in error 
              ? (error as { reason: string }).reason 
              : 'Unknown error'
          );
        } catch (trackingError) {
          console.error('Failed to track failed transaction:', trackingError);
        }
      }
      
      if (error && typeof error === 'object' && 'reason' in error) {
        return (error as { reason: string }).reason;
      }
      return null;
    }
  },

  // Buy shares
  async buyShares(
    marketId: number,
    isYes: boolean,
    amountIn: number,
    minSharesOut: number = 0,
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<string | null> {
    const signerToUse = signer || await getSigner();
    if (!signerToUse) {
      console.error("No signer available");
      return null;
    }
    
    const contract = await getContractInstance(chainId, "PredictionMarket", signerToUse);
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const parsedAmountIn = parseUnits(amountIn.toString(), 6);
      const parsedMinSharesOut = parseUnits(minSharesOut.toString(), 6);
      
      const tx = await contract.buyShares(marketId, isYes, parsedAmountIn, parsedMinSharesOut);
      const receipt = await tx.wait();
      
      const txHash = receipt?.hash || null;
      
      // Track successful transaction in backend
      if (txHash) {
        const userAddress = await signerToUse.getAddress();
        await trackSuccessfulTransaction(
          txHash,
          userAddress,
          marketId,
          'bet',
          amountIn,
          isYes ? 'yes' : 'no',
          receipt?.blockNumber
        );
      }
      
      return txHash;
    } catch (error: unknown) {
      console.error("Error buying shares", error);
      
      // Track failed transaction
      if (signerToUse) {
        try {
          const userAddress = await signerToUse.getAddress();
          await trackFailedTransaction(
            '',
            userAddress,
            marketId,
            'bet',
            error && typeof error === 'object' && 'reason' in error 
              ? (error as { reason: string }).reason 
              : 'Unknown error'
          );
        } catch (trackingError) {
          console.error('Failed to track failed transaction:', trackingError);
        }
      }
      
      if (error && typeof error === 'object' && 'reason' in error) {
        return (error as { reason: string }).reason;
      }
      return null;
    }
  },

  // Remove liquidity
  async removeLiquidity(
    marketId: number,
    yesAmount: number,
    noAmount: number,
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<string | null> {
    const contract = await getContractInstance(chainId, "PredictionMarket", signer);
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const parsedYesAmount = parseUnits(yesAmount.toString(), 6);
      const parsedNoAmount = parseUnits(noAmount.toString(), 6);
      
      const tx = await contract.removeLiquidity(marketId, parsedYesAmount, parsedNoAmount);
      const receipt = await tx.wait();
      return receipt?.hash || null;
    } catch (error: unknown) {
      console.error("Error removing liquidity", error);
      if (error && typeof error === 'object' && 'reason' in error) {
        return (error as { reason: string }).reason;
      }
      return null;
    }
  },

  // Force resolve market (oracle only)
  async forceResolveMarket(
    marketId: number,
    outcome: number, // 1: Yes, 2: No, 3: Invalid
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<string | null> {
    const signerToUse = signer || await getSigner();
    if (!signerToUse) {
      console.error("No signer available");
      return null;
    }
    
    const contract = await getContractInstance(chainId, "PredictionMarket", signerToUse);
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const tx = await contract.forceResolveMarket(marketId, outcome);
      const receipt = await tx.wait();
      return receipt?.hash || null;
    } catch (error: unknown) {
      console.error("Error force resolving market", error);
      if (error && typeof error === 'object' && 'reason' in error) {
        return (error as { reason: string }).reason;
      }
      return null;
    }
  },

  // Claim winnings
  async claimWinnings(
    marketId: number,
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<string | null> {
    const signerToUse = signer || await getSigner();
    if (!signerToUse) {
      console.error("No signer available");
      return null;
    }
    
    const contract = await getContractInstance(chainId, "PredictionMarket", signerToUse);
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const tx = await contract.claimWinnings(marketId);
      const receipt = await tx.wait();
      return receipt?.hash || null;
    } catch (error: unknown) {
      console.error("Error claiming winnings", error);
      if (error && typeof error === 'object' && 'reason' in error) {
        return (error as { reason: string }).reason;
      }
      return null;
    }
  },

  // Mint USDC (for testing purposes)
  async mintUSDC(
    amount: number,
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<string | null> {
    const signerToUse = signer || await getSigner();
    if (!signerToUse) {
      console.error("No signer available");
      return null;
    }
    
    const contract = await getContractInstance(chainId, "MockUSDC", signerToUse);
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const parsedAmount = parseUnits(amount.toString(), 6);
      const tx = await contract.mint(await signerToUse.getAddress(), parsedAmount);
      const receipt = await tx.wait();
      return receipt?.hash || null;
    } catch (error: unknown) {
      console.error("Error minting USDC", error);
      if (error && typeof error === 'object' && 'reason' in error) {
        return (error as { reason: string }).reason;
      }
      return null;
    }
  },

  // Remove liquidity (this claims LP earnings + returns principal)
  async removeLiquidity(
    marketId: number,
    yesAmount: number,
    noAmount: number,
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<string | null> {
    const signerToUse = signer || await getSigner();
    if (!signerToUse) {
      console.error("No signer available");
      return null;
    }
    
    const contract = await getContractInstance(chainId, "PredictionMarket", signerToUse);
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const parsedYesAmount = parseUnits(yesAmount.toString(), 6);
      const parsedNoAmount = parseUnits(noAmount.toString(), 6);
      
      const tx = await contract.removeLiquidity(marketId, parsedYesAmount, parsedNoAmount);
      const receipt = await tx.wait();
      return receipt?.hash || null;
    } catch (error: unknown) {
      console.error("Error removing liquidity", error);
      if (error && typeof error === 'object' && 'reason' in error) {
        return (error as { reason: string }).reason;
      }
      return null;
    }
  },

  // Claim liquidity provider fees without removing liquidity
  async claimLiquidityProviderFees(
    marketId: number,
    chainId: number = avalancheFuji.id,
    signer?: JsonRpcSigner
  ): Promise<string | null> {
    const signerToUse = signer || await getSigner();
    if (!signerToUse) {
      console.error("No signer available");
      return null;
    }
    
    const contract = await getContractInstance(chainId, "PredictionMarket", signerToUse);
    if (!contract) {
      console.error("Contract not found");
      return null;
    }

    try {
      const tx = await contract.claimLiquidityProviderFees(marketId);
      const receipt = await tx.wait();
      return receipt?.hash || null;
    } catch (error: unknown) {
      console.error("Error claiming liquidity provider fees", error);
      if (error && typeof error === 'object' && 'reason' in error) {
        return (error as { reason: string }).reason;
      }
      return null;
    }
  },
};
