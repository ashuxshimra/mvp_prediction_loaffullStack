// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./OutcomeToken.sol";

/**
 * @title PredictPro - PredictionMarket
 * @notice Core contract for PredictPro binary prediction markets with AMM liquidity
 * @dev Implements a constant product AMM for YES/NO outcome tokens
 */
contract PredictionMarket is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============
    
    struct Market {
        uint256 id;
        string question;
        address creator;
        uint256 resolutionTime;
        uint256 createdAt;
        MarketStatus status;
        Outcome outcome;
        uint256 totalYesShares;
        uint256 totalNoShares;
        uint256 liquidityPool; // Settlement token reserves
        uint256 feesCollected;
    }

    enum MarketStatus {
        Active,
        Resolved,
        Cancelled
    }

    enum Outcome {
        Unresolved,
        Yes,
        No,
        Invalid
    }

    // Market storage
    mapping(uint256 => Market) public markets;
    uint256 public marketCount;

    // Outcome tokens for each market
    mapping(uint256 => OutcomeToken) public yesTokens;
    mapping(uint256 => OutcomeToken) public noTokens;
    
    // Track how much each user has claimed from each market
    mapping(uint256 => mapping(address => uint256)) public userClaimedFees;

    // Settlement token (e.g., USDC)
    IERC20 public immutable settlementToken;

    // Fee configuration (in basis points, 100 = 1%)
    uint256 public tradingFee = 200; // 2%
    uint256 public constant MAX_FEE = 500; // 5% max
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Oracle role
    address public oracle;

    // Minimum liquidity to prevent division by zero
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    // AMM constant k for pricing
    uint256 public constant K_MULTIPLIER = 1e18;

    // ============ Events ============

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 resolutionTime
    );

    event LiquidityAdded(
        uint256 indexed marketId,
        address indexed provider,
        uint256 amount,
        uint256 yesShares,
        uint256 noShares
    );

    event LiquidityRemoved(
        uint256 indexed marketId,
        address indexed provider,
        uint256 yesShares,
        uint256 noShares,
        uint256 amount
    );

    event PositionBought(
        uint256 indexed marketId,
        address indexed buyer,
        bool isYes,
        uint256 amountIn,
        uint256 sharesOut,
        uint256 fee
    );

    event MarketResolved(
        uint256 indexed marketId,
        Outcome outcome,
        address indexed resolver
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed claimer,
        uint256 amount
    );

    event LiquidityProviderFeesClaimed(
        uint256 indexed marketId,
        address indexed provider,
        uint256 amount
    );

    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    // ============ Modifiers ============

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can resolve");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId < marketCount, "Market does not exist");
        _;
    }

    modifier marketActive(uint256 marketId) {
        require(markets[marketId].status == MarketStatus.Active, "Market not active");
        require(block.timestamp < markets[marketId].resolutionTime, "Market expired");
        _;
    }

    // ============ Constructor ============

    constructor(address _settlementToken, address _oracle) {
        require(_settlementToken != address(0), "Invalid settlement token");
        require(_oracle != address(0), "Invalid oracle address");
        
        settlementToken = IERC20(_settlementToken);
        oracle = _oracle;
    }

    // ============ Core Functions ============

    /**
     * @notice Create a new prediction market
     * @param question The question being predicted
     * @param resolutionTime When the market can be resolved (Unix timestamp)
     * @return marketId The ID of the created market
     */
    function createMarket(
        string calldata question,
        uint256 resolutionTime
    ) external returns (uint256 marketId) {
        require(bytes(question).length > 0, "Question cannot be empty");
        require(resolutionTime > block.timestamp, "Resolution time must be in future");
        require(resolutionTime < block.timestamp + 365 days, "Resolution time too far");

        marketId = marketCount++;

        // Deploy outcome tokens for this market
        yesTokens[marketId] = new OutcomeToken(
            string(abi.encodePacked("YES-", _uint2str(marketId))),
            "YES",
            true,
            marketId,
            address(this)
        );
        noTokens[marketId] = new OutcomeToken(
            string(abi.encodePacked("NO-", _uint2str(marketId))),
            "NO",
            false,
            marketId,
            address(this)
        );

        markets[marketId] = Market({
            id: marketId,
            question: question,
            creator: msg.sender,
            resolutionTime: resolutionTime,
            createdAt: block.timestamp,
            status: MarketStatus.Active,
            outcome: Outcome.Unresolved,
            totalYesShares: 0,
            totalNoShares: 0,
            liquidityPool: 0,
            feesCollected: 0
        });

        emit MarketCreated(marketId, msg.sender, question, resolutionTime);
    }

    /**
     * @notice Add liquidity to a market (receive YES + NO tokens)
     * @param marketId The market to add liquidity to
     * @param amount Amount of settlement tokens to add
     */
    function addLiquidity(
        uint256 marketId,
        uint256 amount
    ) external nonReentrant marketExists(marketId) marketActive(marketId) {
        require(amount > 0, "Amount must be positive");

        Market storage market = markets[marketId];

        // Transfer settlement tokens from user
        settlementToken.safeTransferFrom(msg.sender, address(this), amount);

        // Mint equal amounts of YES and NO tokens to the user
        // This maintains the invariant that total YES = total NO in the pool
        yesTokens[marketId].mint(msg.sender, amount);
        noTokens[marketId].mint(msg.sender, amount);

        market.totalYesShares += amount;
        market.totalNoShares += amount;
        market.liquidityPool += amount;

        emit LiquidityAdded(marketId, msg.sender, amount, amount, amount);
    }

    /**
     * @notice Remove liquidity from a market (burn YES + NO tokens)
     * @param marketId The market to remove liquidity from
     * @param yesAmount Amount of YES tokens to burn
     * @param noAmount Amount of NO tokens to burn
     */
    function removeLiquidity(
        uint256 marketId,
        uint256 yesAmount,
        uint256 noAmount
    ) external nonReentrant marketExists(marketId) {
        require(yesAmount > 0 || noAmount > 0, "Must remove some liquidity");
        
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active || market.status == MarketStatus.Resolved, "Market must be active or resolved");

        uint256 yesBalance = yesTokens[marketId].balanceOf(msg.sender);
        uint256 noBalance = noTokens[marketId].balanceOf(msg.sender);

        require(yesBalance >= yesAmount, "Insufficient YES tokens");
        require(noBalance >= noAmount, "Insufficient NO tokens");

        // Can only remove matched pairs (equal YES and NO)
        uint256 pairsToRemove = yesAmount < noAmount ? yesAmount : noAmount;
        require(pairsToRemove > 0, "Must have matching YES/NO pairs");

        // Burn the tokens
        yesTokens[marketId].burn(msg.sender, pairsToRemove);
        noTokens[marketId].burn(msg.sender, pairsToRemove);

        market.totalYesShares -= pairsToRemove;
        market.totalNoShares -= pairsToRemove;
        market.liquidityPool -= pairsToRemove;

        // Return settlement tokens
        settlementToken.safeTransfer(msg.sender, pairsToRemove);

        emit LiquidityRemoved(marketId, msg.sender, pairsToRemove, pairsToRemove, pairsToRemove);
    }

    /**
     * @notice Buy outcome shares (YES or NO)
     * @param marketId The market to buy from
     * @param isYes True to buy YES, false to buy NO
     * @param amountIn Amount of settlement tokens to spend
     * @param minSharesOut Minimum shares expected (slippage protection)
     * @return sharesOut Amount of outcome shares received
     */
    function buyShares(
        uint256 marketId,
        bool isYes,
        uint256 amountIn,
        uint256 minSharesOut
    ) external nonReentrant marketExists(marketId) marketActive(marketId) returns (uint256 sharesOut) {
        require(amountIn > 0, "Amount must be positive");
        
        Market storage market = markets[marketId];
        require(market.liquidityPool > MINIMUM_LIQUIDITY, "Insufficient liquidity");

        // Calculate fee
        uint256 fee = (amountIn * tradingFee) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        // Calculate shares out using constant product formula
        // For buying YES: sharesOut = noShares - (k / (yesShares + amountIn))
        // For buying NO: sharesOut = yesShares - (k / (noShares + amountIn))
        sharesOut = _calculateSharesOut(
            marketId,
            isYes,
            amountInAfterFee
        );

        require(sharesOut >= minSharesOut, "Slippage too high");
        require(sharesOut > 0, "Insufficient output amount");

        // Transfer settlement tokens from user
        settlementToken.safeTransferFrom(msg.sender, address(this), amountIn);

        // Update market state
        market.feesCollected += fee;
        market.liquidityPool += amountInAfterFee;

        if (isYes) {
            market.totalYesShares += amountInAfterFee;
            market.totalNoShares -= sharesOut;
            yesTokens[marketId].mint(msg.sender, sharesOut);
        } else {
            market.totalNoShares += amountInAfterFee;
            market.totalYesShares -= sharesOut;
            noTokens[marketId].mint(msg.sender, sharesOut);
        }

        emit PositionBought(marketId, msg.sender, isYes, amountIn, sharesOut, fee);
    }

    /**
     * @notice Resolve a market (oracle only)
     * @param marketId The market to resolve
     * @param outcome The winning outcome
     */
    function resolveMarket(
        uint256 marketId,
        Outcome outcome
    ) external onlyOracle marketExists(marketId) {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp >= market.resolutionTime, "Too early to resolve");
        require(outcome == Outcome.Yes || outcome == Outcome.No || outcome == Outcome.Invalid, "Invalid outcome");

        market.status = MarketStatus.Resolved;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome, msg.sender);
    }

    /**
     * @notice Force resolve a market immediately (oracle only) - for testing/demo purposes
     * @param marketId The market to resolve
     * @param outcome The winning outcome
     */
    function forceResolveMarket(
        uint256 marketId,
        Outcome outcome
    ) external onlyOracle marketExists(marketId) {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active, "Market not active");
        require(outcome == Outcome.Yes || outcome == Outcome.No || outcome == Outcome.Invalid, "Invalid outcome");

        market.status = MarketStatus.Resolved;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome, msg.sender);
    }

    /**
     * @notice Claim winnings after market resolution
     * @param marketId The market to claim from
     */
    function claimWinnings(
        uint256 marketId
    ) external nonReentrant marketExists(marketId) {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Resolved, "Market not resolved");

        uint256 payout = 0;

        if (market.outcome == Outcome.Yes) {
            uint256 yesBalance = yesTokens[marketId].balanceOf(msg.sender);
            require(yesBalance > 0, "No winning shares");
            
            yesTokens[marketId].burn(msg.sender, yesBalance);
            payout = yesBalance;
            
        } else if (market.outcome == Outcome.No) {
            uint256 noBalance = noTokens[marketId].balanceOf(msg.sender);
            require(noBalance > 0, "No winning shares");
            
            noTokens[marketId].burn(msg.sender, noBalance);
            payout = noBalance;
            
        } else if (market.outcome == Outcome.Invalid) {
            // Refund both YES and NO tokens at equal value
            uint256 yesBalance = yesTokens[marketId].balanceOf(msg.sender);
            uint256 noBalance = noTokens[marketId].balanceOf(msg.sender);
            require(yesBalance > 0 || noBalance > 0, "No shares to refund");
            
            if (yesBalance > 0) {
                yesTokens[marketId].burn(msg.sender, yesBalance);
            }
            if (noBalance > 0) {
                noTokens[marketId].burn(msg.sender, noBalance);
            }
            payout = yesBalance + noBalance;
        }

        require(payout > 0, "No payout");

        // Transfer winnings
        settlementToken.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    /**
     * @notice Claim accumulated liquidity provider fees without removing liquidity
     * @param marketId The market to claim fees from
     */
    function claimLiquidityProviderFees(
        uint256 marketId
    ) external nonReentrant marketExists(marketId) {
        Market storage market = markets[marketId];
        
        // Get user's liquidity tokens
        uint256 yesBalance = yesTokens[marketId].balanceOf(msg.sender);
        uint256 noBalance = noTokens[marketId].balanceOf(msg.sender);
        
        // Calculate user's liquidity contribution (minimum of YES and NO tokens)
        uint256 liquidityContribution = yesBalance < noBalance ? yesBalance : noBalance;
        
        require(liquidityContribution > 0, "No liquidity provided");
        require(market.liquidityPool > 0, "No liquidity in market");
        
        // Calculate user's total share of fees based on their liquidity contribution
        uint256 totalUserShare = (liquidityContribution * market.feesCollected) / market.liquidityPool;
        
        // Get how much user has already claimed
        uint256 alreadyClaimed = userClaimedFees[marketId][msg.sender];
        
        // Calculate how much user can claim now (prevent underflow)
        if (totalUserShare <= alreadyClaimed) {
            revert("No fees to claim");
        }
        uint256 claimableAmount = totalUserShare - alreadyClaimed;
        
        // Update user's claimed amount
        userClaimedFees[marketId][msg.sender] = totalUserShare;
        
        // Update market state (only reduce by the amount being claimed now)
        market.feesCollected -= claimableAmount;
        
        // Transfer fees to user
        settlementToken.safeTransfer(msg.sender, claimableAmount);
        
        emit LiquidityProviderFeesClaimed(marketId, msg.sender, claimableAmount);
    }

    /**
     * @notice Get how much fees a user can claim from a market
     * @param marketId The market to check
     * @param user The user address
     * @return claimableAmount Amount of fees the user can claim
     */
    function getClaimableLiquidityProviderFees(
        uint256 marketId,
        address user
    ) external view marketExists(marketId) returns (uint256 claimableAmount) {
        Market storage market = markets[marketId];
        
        // Get user's liquidity tokens
        uint256 yesBalance = yesTokens[marketId].balanceOf(user);
        uint256 noBalance = noTokens[marketId].balanceOf(user);
        
        // Calculate user's liquidity contribution (minimum of YES and NO tokens)
        uint256 liquidityContribution = yesBalance < noBalance ? yesBalance : noBalance;
        
        if (liquidityContribution == 0 || market.liquidityPool == 0) {
            return 0;
        }
        
        // Calculate user's total share of fees based on their liquidity contribution
        uint256 totalUserShare = (liquidityContribution * market.feesCollected) / market.liquidityPool;
        
        // Get how much user has already claimed
        uint256 alreadyClaimed = userClaimedFees[marketId][user];
        
        // Calculate how much user can claim now (prevent underflow)
        if (totalUserShare <= alreadyClaimed) {
            return 0;
        }
        return totalUserShare - alreadyClaimed;
    }

    // ============ View Functions ============

    /**
     * @notice Get current price of YES or NO shares
     * @param marketId The market to check
     * @param isYes True for YES price, false for NO price
     * @return price Price as a percentage (0-10000 represents 0-100%)
     */
    function getSharePrice(
        uint256 marketId,
        bool isYes
    ) external view marketExists(marketId) returns (uint256 price) {
        Market storage market = markets[marketId];
        
        if (market.totalYesShares == 0 || market.totalNoShares == 0) {
            return 5000; // 50% if no liquidity
        }

        uint256 total = market.totalYesShares + market.totalNoShares;
        
        if (isYes) {
            price = (market.totalNoShares * FEE_DENOMINATOR) / total;
        } else {
            price = (market.totalYesShares * FEE_DENOMINATOR) / total;
        }
    }

    /**
     * @notice Calculate shares received for a given input amount
     * @param marketId The market
     * @param isYes True for YES, false for NO
     * @param amountIn Amount of settlement tokens
     * @return sharesOut Expected shares output
     */
    function getSharesOut(
        uint256 marketId,
        bool isYes,
        uint256 amountIn
    ) external view marketExists(marketId) returns (uint256 sharesOut) {
        uint256 fee = (amountIn * tradingFee) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;
        return _calculateSharesOut(marketId, isYes, amountInAfterFee);
    }

    /**
     * @notice Get market details
     */
    function getMarket(uint256 marketId) external view marketExists(marketId) returns (Market memory) {
        return markets[marketId];
    }

    // ============ Internal Functions ============

    /**
     * @dev Calculate shares out using constant product formula
     */
    function _calculateSharesOut(
        uint256 marketId,
        bool isYes,
        uint256 amountIn
    ) internal view returns (uint256) {
        Market storage market = markets[marketId];
        
        uint256 yesReserve = market.totalYesShares;
        uint256 noReserve = market.totalNoShares;

        if (yesReserve == 0 || noReserve == 0) {
            return amountIn; // 1:1 if no liquidity
        }

        // Constant product formula: k = yesReserve * noReserve
        uint256 k = yesReserve * noReserve;

        if (isYes) {
            // Buying YES: add to YES reserve, remove from NO reserve
            uint256 newYesReserve = yesReserve + amountIn;
            uint256 newNoReserve = k / newYesReserve;
            return noReserve - newNoReserve;
        } else {
            // Buying NO: add to NO reserve, remove from YES reserve
            uint256 newNoReserve = noReserve + amountIn;
            uint256 newYesReserve = k / newNoReserve;
            return yesReserve - newYesReserve;
        }
    }

    /**
     * @dev Convert uint to string
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update oracle address
     */
    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid oracle");
        address oldOracle = oracle;
        oracle = newOracle;
        emit OracleUpdated(oldOracle, newOracle);
    }

    /**
     * @notice Update trading fee
     */
    function setTradingFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee too high");
        uint256 oldFee = tradingFee;
        tradingFee = newFee;
        emit FeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Withdraw collected fees (owner only)
     */
    function withdrawFees(uint256 marketId) external onlyOwner marketExists(marketId) {
        Market storage market = markets[marketId];
        uint256 fees = market.feesCollected;
        require(fees > 0, "No fees to withdraw");
        
        market.feesCollected = 0;
        settlementToken.safeTransfer(owner(), fees);
    }
}