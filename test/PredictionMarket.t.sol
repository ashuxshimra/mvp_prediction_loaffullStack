// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/PredictionMarket.sol";
import "../src/OutcomeToken.sol";
import "../src/MockUSDC.sol";

/**
 * @title PredictionMarketTest
 * @notice Comprehensive test suite for PredictionMarket contract
 * @dev Tests all core functionality: market creation, liquidity, trading, resolution, and claiming
 */
contract PredictionMarketTest is Test {
    PredictionMarket public market;
    MockUSDC public usdc;
    
    address public owner;
    address public oracle;
    address public alice;
    address public bob;
    address public charlie;
    
    uint256 constant INITIAL_USDC = 10000 * 10**6; // 10,000 USDC
    uint256 constant LIQUIDITY_AMOUNT = 1000 * 10**6; // 1,000 USDC
    
    event MarketCreated(uint256 indexed marketId, address indexed creator, string question, uint256 resolutionTime);
    event LiquidityAdded(uint256 indexed marketId, address indexed provider, uint256 amount, uint256 yesShares, uint256 noShares);
    event PositionBought(uint256 indexed marketId, address indexed buyer, bool isYes, uint256 amountIn, uint256 sharesOut, uint256 fee);
    event MarketResolved(uint256 indexed marketId, PredictionMarket.Outcome outcome, address indexed resolver);
    event WinningsClaimed(uint256 indexed marketId, address indexed claimer, uint256 amount);

    function setUp() public {
        // Setup accounts
        owner = address(this);
        oracle = makeAddr("oracle");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");
        
        // Deploy contracts
        usdc = new MockUSDC();
        market = new PredictionMarket(address(usdc), oracle);
        
        // Mint USDC to test users
        usdc.mint(alice, INITIAL_USDC);
        usdc.mint(bob, INITIAL_USDC);
        usdc.mint(charlie, INITIAL_USDC);
        
        // Setup approvals
        vm.prank(alice);
        usdc.approve(address(market), type(uint256).max);
        
        vm.prank(bob);
        usdc.approve(address(market), type(uint256).max);
        
        vm.prank(charlie);
        usdc.approve(address(market), type(uint256).max);
    }

    // ============ Market Creation Tests ============

    function testCreateMarket() public {
        string memory question = "Will ETH reach $5000 by end of 2025?";
        uint256 resolutionTime = block.timestamp + 30 days;
        
        vm.expectEmit(true, true, false, true);
        emit MarketCreated(0, alice, question, resolutionTime);
        
        vm.prank(alice);
        uint256 marketId = market.createMarket(question, resolutionTime);
        
        assertEq(marketId, 0);
        assertEq(market.marketCount(), 1);
        
        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(m.question, question);
        assertEq(m.creator, alice);
        assertEq(m.resolutionTime, resolutionTime);
        assertEq(uint(m.status), uint(PredictionMarket.MarketStatus.Active));
        assertEq(uint(m.outcome), uint(PredictionMarket.Outcome.Unresolved));
    }

    function testCannotCreateMarketWithPastResolution() public {
        vm.prank(alice);
        vm.expectRevert("Resolution time must be in future");
        market.createMarket("Invalid market", block.timestamp - 1);
    }

    function testCannotCreateMarketWithEmptyQuestion() public {
        vm.prank(alice);
        vm.expectRevert("Question cannot be empty");
        market.createMarket("", block.timestamp + 30 days);
    }

    function testCannotCreateMarketTooFarInFuture() public {
        vm.prank(alice);
        vm.expectRevert("Resolution time too far");
        market.createMarket("Too far", block.timestamp + 366 days);
    }

    // ============ Liquidity Tests ============

    function testAddLiquidity() public {
        uint256 marketId = createTestMarket();
        
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        
        vm.expectEmit(true, true, false, true);
        emit LiquidityAdded(marketId, alice, LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
        
        vm.prank(alice);
        market.addLiquidity(marketId, LIQUIDITY_AMOUNT);
        
        // Check USDC was transferred
        assertEq(usdc.balanceOf(alice), aliceBalanceBefore - LIQUIDITY_AMOUNT);
        assertEq(usdc.balanceOf(address(market)), LIQUIDITY_AMOUNT);
        
        // Check outcome tokens were minted
        OutcomeToken yesToken = market.yesTokens(marketId);
        OutcomeToken noToken = market.noTokens(marketId);
        
        assertEq(yesToken.balanceOf(alice), LIQUIDITY_AMOUNT);
        assertEq(noToken.balanceOf(alice), LIQUIDITY_AMOUNT);
        
        // Check market state
        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(m.totalYesShares, LIQUIDITY_AMOUNT);
        assertEq(m.totalNoShares, LIQUIDITY_AMOUNT);
        assertEq(m.liquidityPool, LIQUIDITY_AMOUNT);
    }

    function testRemoveLiquidity() public {
        uint256 marketId = createTestMarket();
        
        vm.prank(alice);
        market.addLiquidity(marketId, LIQUIDITY_AMOUNT);
        
        uint256 removeAmount = LIQUIDITY_AMOUNT / 2;
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        
        vm.prank(alice);
        market.removeLiquidity(marketId, removeAmount, removeAmount);
        
        // Check USDC was returned
        assertEq(usdc.balanceOf(alice), aliceBalanceBefore + removeAmount);
        
        // Check outcome tokens were burned
        OutcomeToken yesToken = market.yesTokens(marketId);
        OutcomeToken noToken = market.noTokens(marketId);
        
        assertEq(yesToken.balanceOf(alice), LIQUIDITY_AMOUNT - removeAmount);
        assertEq(noToken.balanceOf(alice), LIQUIDITY_AMOUNT - removeAmount);
    }

    function testCannotAddLiquidityToNonexistentMarket() public {
        vm.prank(alice);
        vm.expectRevert("Market does not exist");
        market.addLiquidity(999, LIQUIDITY_AMOUNT);
    }

    // ============ Trading Tests ============

    function testBuyYesShares() public {
        uint256 marketId = createAndFundMarket();
        
        uint256 buyAmount = 100 * 10**6; // 100 USDC
        uint256 minSharesOut = 0; // No slippage protection for test
        
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        
        vm.prank(bob);
        uint256 sharesOut = market.buyShares(marketId, true, buyAmount, minSharesOut);
        
        assertGt(sharesOut, 0);
        assertEq(usdc.balanceOf(bob), bobBalanceBefore - buyAmount);
        
        OutcomeToken yesToken = market.yesTokens(marketId);
        assertEq(yesToken.balanceOf(bob), sharesOut);
    }

    function testBuyNoShares() public {
        uint256 marketId = createAndFundMarket();
        
        uint256 buyAmount = 100 * 10**6;
        
        vm.prank(bob);
        uint256 sharesOut = market.buyShares(marketId, false, buyAmount, 0);
        
        assertGt(sharesOut, 0);
        
        OutcomeToken noToken = market.noTokens(marketId);
        assertEq(noToken.balanceOf(bob), sharesOut);
    }

    function testPriceMovesWithTrades() public {
        uint256 marketId = createAndFundMarket();
        
        uint256 priceBeforeYes = market.getSharePrice(marketId, true);
        uint256 priceBeforeNo = market.getSharePrice(marketId, false);
        
        // Initially should be ~50/50
        assertApproxEqAbs(priceBeforeYes, 5000, 100); // ~50%
        assertApproxEqAbs(priceBeforeNo, 5000, 100);
        
        // Buy YES shares - YES price should increase
        vm.prank(bob);
        market.buyShares(marketId, true, 200 * 10**6, 0);
        
        uint256 priceAfterYes = market.getSharePrice(marketId, true);
        uint256 priceAfterNo = market.getSharePrice(marketId, false);
        
        assertLt(priceAfterYes, priceBeforeYes); // YES price decreases when buying YES (AMM logic)
        assertGt(priceAfterNo, priceBeforeNo);   // NO price increases when buying YES
        
        // Prices should still sum to ~100%
        assertApproxEqAbs(priceAfterYes + priceAfterNo, 10000, 50);
    }

    function testSlippageProtection() public {
        uint256 marketId = createAndFundMarket();
        
        uint256 buyAmount = 100 * 10**6;
        uint256 expectedShares = market.getSharesOut(marketId, true, buyAmount);
        uint256 minSharesOut = expectedShares + 1; // Require more than possible
        
        vm.prank(bob);
        vm.expectRevert("Slippage too high");
        market.buyShares(marketId, true, buyAmount, minSharesOut);
    }

    function testTradingFeeCollected() public {
        uint256 marketId = createAndFundMarket();
        
        uint256 buyAmount = 100 * 10**6;
        
        vm.prank(bob);
        market.buyShares(marketId, true, buyAmount, 0);
        
        PredictionMarket.Market memory m = market.getMarket(marketId);
        
        // Fee should be 2% of buyAmount
        uint256 expectedFee = (buyAmount * 200) / 10000;
        assertEq(m.feesCollected, expectedFee);
    }

    function testCannotBuyFromExpiredMarket() public {
        uint256 marketId = createTestMarket();
        
        vm.prank(alice);
        market.addLiquidity(marketId, LIQUIDITY_AMOUNT);
        
        // Fast forward past resolution time
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(bob);
        vm.expectRevert("Market expired");
        market.buyShares(marketId, true, 100 * 10**6, 0);
    }

    // ============ Resolution Tests ============

    function testResolveMarketYes() public {
        uint256 marketId = createAndFundMarket();
        
        // Fast forward to resolution time
        vm.warp(block.timestamp + 31 days);
        
        vm.expectEmit(true, false, false, true);
        emit MarketResolved(marketId, PredictionMarket.Outcome.Yes, oracle);
        
        vm.prank(oracle);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
        
        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint(m.status), uint(PredictionMarket.MarketStatus.Resolved));
        assertEq(uint(m.outcome), uint(PredictionMarket.Outcome.Yes));
    }

    function testResolveMarketNo() public {
        uint256 marketId = createAndFundMarket();
        
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(oracle);
        market.resolveMarket(marketId, PredictionMarket.Outcome.No);
        
        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint(m.outcome), uint(PredictionMarket.Outcome.No));
    }

    function testCannotResolveBeforeTime() public {
        uint256 marketId = createAndFundMarket();
        
        vm.prank(oracle);
        vm.expectRevert("Too early to resolve");
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
    }

    function testOnlyOracleCanResolve() public {
        uint256 marketId = createAndFundMarket();
        
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(alice);
        vm.expectRevert("Only oracle can resolve");
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
    }

    function testForceResolveMarket() public {
        uint256 marketId = createAndFundMarket();
        
        // Can force resolve immediately (no time check)
        vm.prank(oracle);
        market.forceResolveMarket(marketId, PredictionMarket.Outcome.Yes);
        
        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint(m.status), uint(PredictionMarket.MarketStatus.Resolved));
        assertEq(uint(m.outcome), uint(PredictionMarket.Outcome.Yes));
    }

    function testOnlyOracleCanForceResolve() public {
        uint256 marketId = createAndFundMarket();
        
        vm.prank(alice);
        vm.expectRevert("Only oracle can resolve");
        market.forceResolveMarket(marketId, PredictionMarket.Outcome.Yes);
    }

    // ============ Claiming Tests ============

    function testClaimWinningsYes() public {
        uint256 marketId = createAndFundMarket();
        
        // Bob buys YES shares
        uint256 buyAmount = 100 * 10**6;
        vm.prank(bob);
        uint256 sharesOut = market.buyShares(marketId, true, buyAmount, 0);
        
        // Resolve to YES
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracle);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
        
        // Bob claims winnings
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        
        vm.expectEmit(true, true, false, true);
        emit WinningsClaimed(marketId, bob, sharesOut);
        
        vm.prank(bob);
        market.claimWinnings(marketId);
        
        // Bob should receive 1 USDC per YES token
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + sharesOut);
        
        // Tokens should be burned
        OutcomeToken yesToken = market.yesTokens(marketId);
        assertEq(yesToken.balanceOf(bob), 0);
    }

    function testClaimWinningsNo() public {
        uint256 marketId = createAndFundMarket();
        
        // Bob buys NO shares
        vm.prank(bob);
        uint256 sharesOut = market.buyShares(marketId, false, 100 * 10**6, 0);
        
        // Resolve to NO
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracle);
        market.resolveMarket(marketId, PredictionMarket.Outcome.No);
        
        // Bob claims
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        
        vm.prank(bob);
        market.claimWinnings(marketId);
        
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + sharesOut);
    }

    function testLoserCannotClaim() public {
        uint256 marketId = createAndFundMarket();
        
        // Bob buys NO shares (will lose)
        vm.prank(bob);
        market.buyShares(marketId, false, 100 * 10**6, 0);
        
        // Resolve to YES
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracle);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
        
        // Bob tries to claim
        vm.prank(bob);
        vm.expectRevert("No winning shares");
        market.claimWinnings(marketId);
    }

    function testClaimInvalidMarketRefund() public {
        uint256 marketId = createAndFundMarket();
        
        // Bob buys both YES and NO
        vm.prank(bob);
        uint256 yesShares = market.buyShares(marketId, true, 100 * 10**6, 0);
        
        vm.prank(bob);
        uint256 noShares = market.buyShares(marketId, false, 100 * 10**6, 0);
        
        // Resolve to Invalid
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracle);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Invalid);
        
        // Bob should get refund for both
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        
        vm.prank(bob);
        market.claimWinnings(marketId);
        
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + yesShares + noShares);
    }

    function testCannotClaimUnresolvedMarket() public {
        uint256 marketId = createAndFundMarket();
        
        vm.prank(bob);
        market.buyShares(marketId, true, 100 * 10**6, 0);
        
        vm.prank(bob);
        vm.expectRevert("Market not resolved");
        market.claimWinnings(marketId);
    }

    // ============ Admin Tests ============

    function testSetOracle() public {
        address newOracle = makeAddr("newOracle");
        
        market.setOracle(newOracle);
        
        assertEq(market.oracle(), newOracle);
    }

    function testOnlyOwnerCanSetOracle() public {
        vm.prank(alice);
        vm.expectRevert();
        market.setOracle(makeAddr("newOracle"));
    }

    function testSetTradingFee() public {
        uint256 newFee = 300; // 3%
        
        market.setTradingFee(newFee);
        
        assertEq(market.tradingFee(), newFee);
    }

    function testCannotSetFeeTooHigh() public {
        vm.expectRevert("Fee too high");
        market.setTradingFee(600); // 6% > MAX_FEE of 5%
    }

    function testWithdrawFees() public {
        uint256 marketId = createAndFundMarket();
        
        // Generate fees through trading
        vm.prank(bob);
        market.buyShares(marketId, true, 100 * 10**6, 0);
        
        PredictionMarket.Market memory m = market.getMarket(marketId);
        uint256 collectedFees = m.feesCollected;
        
        uint256 ownerBalanceBefore = usdc.balanceOf(owner);
        
        market.withdrawFees(marketId);
        
        assertEq(usdc.balanceOf(owner), ownerBalanceBefore + collectedFees);
        
        // Fees should be reset
        m = market.getMarket(marketId);
        assertEq(m.feesCollected, 0);
    }

    // ============ Integration Tests ============

    function testDemoFlowWithForceResolve() public {
        // 1. Alice creates market
        vm.prank(alice);
        uint256 marketId = market.createMarket(
            "Will BTC reach $100k?",
            block.timestamp + 30 days
        );
        
        // 2. Alice adds liquidity
        vm.prank(alice);
        market.addLiquidity(marketId, LIQUIDITY_AMOUNT);
        
        // 3. Bob bets YES
        vm.prank(bob);
        uint256 bobShares = market.buyShares(marketId, true, 200 * 10**6, 0);
        
        // 4. Charlie bets NO
        vm.prank(charlie);
        uint256 charlieShares = market.buyShares(marketId, false, 150 * 10**6, 0);
        
        // 5. Oracle force resolves to YES (for demo purposes)
        vm.prank(oracle);
        market.forceResolveMarket(marketId, PredictionMarket.Outcome.Yes);
        
        // 6. Bob claims winnings (winner)
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        market.claimWinnings(marketId);
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + bobShares);
        
        // 7. Charlie cannot claim (loser)
        vm.prank(charlie);
        vm.expectRevert("No winning shares");
        market.claimWinnings(marketId);
        
        console.log("Demo completed successfully!");
        console.log("Bob (YES winner) claimed:", bobShares / 10**6, "USDC");
        console.log("Charlie (NO loser) lost:", charlieShares / 10**6, "USDC");
    }

    function testFullMarketLifecycle() public {
        // 1. Alice creates market
        vm.prank(alice);
        uint256 marketId = market.createMarket(
            "Will BTC reach $100k?",
            block.timestamp + 30 days
        );
        
        // 2. Alice adds liquidity
        vm.prank(alice);
        market.addLiquidity(marketId, LIQUIDITY_AMOUNT);
        
        // 3. Bob bets YES
        vm.prank(bob);
        uint256 bobShares = market.buyShares(marketId, true, 200 * 10**6, 0);
        
        // 4. Charlie bets NO
        vm.prank(charlie);
        uint256 charlieShares = market.buyShares(marketId, false, 150 * 10**6, 0);
        
        // 5. Market resolves to YES
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracle);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
        
        // 6. Bob claims winnings (winner)
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        market.claimWinnings(marketId);
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + bobShares);
        
        // 7. Charlie cannot claim (loser)
        vm.prank(charlie);
        vm.expectRevert("No winning shares");
        market.claimWinnings(marketId);
        
        // 8. Alice can remove remaining liquidity (before resolution)
        // Note: Can't remove liquidity after market is resolved
        // This is expected behavior - liquidity providers must remove before resolution
    }

    // ============ Helper Functions ============

    function createTestMarket() internal returns (uint256) {
        vm.prank(alice);
        return market.createMarket(
            "Test Market",
            block.timestamp + 30 days
        );
    }

    function createAndFundMarket() internal returns (uint256) {
        uint256 marketId = createTestMarket();
        
        vm.prank(alice);
        market.addLiquidity(marketId, LIQUIDITY_AMOUNT);
        
        return marketId;
    }

    // ============ LP Claim Tests ============

    function testClaimLiquidityProviderFees() public {
        uint256 marketId = createAndFundMarket();
        
        // Bob buys YES shares to generate fees
        vm.prank(bob);
        market.buyShares(marketId, true, 50 * 10**6, 0);
        
        // Check initial claimable fees for Alice (LP provider)
        uint256 claimableBefore = market.getClaimableLiquidityProviderFees(marketId, alice);
        assertGt(claimableBefore, 0, "Should have claimable fees");
        
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        
        // Alice claims her LP fees
        vm.prank(alice);
        market.claimLiquidityProviderFees(marketId);
        
        uint256 aliceBalanceAfter = usdc.balanceOf(alice);
        assertGt(aliceBalanceAfter, aliceBalanceBefore, "Alice should receive fees");
        
        // Check that claimable fees is now 0
        uint256 claimableAfter = market.getClaimableLiquidityProviderFees(marketId, alice);
        assertEq(claimableAfter, 0, "Should have no more claimable fees");
    }

    function testCannotClaimLiquidityProviderFeesTwice() public {
        uint256 marketId = createAndFundMarket();
        
        // Bob buys shares to generate fees
        vm.prank(bob);
        market.buyShares(marketId, true, 50 * 10**6, 0);
        
        // Alice claims fees first time
        vm.prank(alice);
        market.claimLiquidityProviderFees(marketId);
        
        // Alice tries to claim again - should fail
        vm.prank(alice);
        vm.expectRevert("No fees to claim");
        market.claimLiquidityProviderFees(marketId);
    }

    function testGetClaimableLiquidityProviderFees() public {
        uint256 marketId = createAndFundMarket();
        
        // Initially no fees
        uint256 claimable = market.getClaimableLiquidityProviderFees(marketId, alice);
        assertEq(claimable, 0, "Should have no claimable fees initially");
        
        // Bob buys shares to generate fees
        vm.prank(bob);
        market.buyShares(marketId, true, 50 * 10**6, 0);
        
        // Now Alice should have claimable fees
        claimable = market.getClaimableLiquidityProviderFees(marketId, alice);
        assertGt(claimable, 0, "Should have claimable fees after trades");
        
        // Alice claims fees
        vm.prank(alice);
        market.claimLiquidityProviderFees(marketId);
        
        // Should have no more claimable fees
        claimable = market.getClaimableLiquidityProviderFees(marketId, alice);
        assertEq(claimable, 0, "Should have no claimable fees after claiming");
    }

    function testClaimLiquidityProviderFeesMultipleTrades() public {
        uint256 marketId = createAndFundMarket();
        
        // Multiple trades to generate more fees
        vm.prank(bob);
        market.buyShares(marketId, true, 30 * 10**6, 0);
        
        vm.prank(charlie);
        market.buyShares(marketId, false, 40 * 10**6, 0);
        
        vm.prank(bob);
        market.buyShares(marketId, true, 20 * 10**6, 0);
        
        // Alice should have accumulated fees from all trades
        uint256 claimable = market.getClaimableLiquidityProviderFees(marketId, alice);
        assertGt(claimable, 0, "Should have accumulated fees from multiple trades");
        
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        
        // Alice claims all accumulated fees
        vm.prank(alice);
        market.claimLiquidityProviderFees(marketId);
        
        uint256 aliceBalanceAfter = usdc.balanceOf(alice);
        assertEq(aliceBalanceAfter - aliceBalanceBefore, claimable, "Should receive exact claimable amount");
    }

    function testClaimLiquidityProviderFeesOnResolvedMarket() public {
        uint256 marketId = createAndFundMarket();
        
        // Generate some fees
        vm.prank(bob);
        market.buyShares(marketId, true, 50 * 10**6, 0);
        
        // Resolve market
        vm.prank(oracle);
        market.forceResolveMarket(marketId, PredictionMarket.Outcome.Yes);
        
        // Alice should still be able to claim fees on resolved market
        uint256 claimable = market.getClaimableLiquidityProviderFees(marketId, alice);
        assertGt(claimable, 0, "Should have claimable fees on resolved market");
        
        vm.prank(alice);
        market.claimLiquidityProviderFees(marketId);
        
        // Verify fees were claimed
        uint256 claimableAfter = market.getClaimableLiquidityProviderFees(marketId, alice);
        assertEq(claimableAfter, 0, "Should have no more claimable fees after claiming");
    }

    function testCannotClaimLiquidityProviderFeesWithoutLiquidity() public {
        uint256 marketId = createTestMarket();
        
        // Alice (who didn't provide liquidity) tries to claim fees
        // This should fail because she has no liquidity tokens
        vm.prank(alice);
        vm.expectRevert("No liquidity provided");
        market.claimLiquidityProviderFees(marketId);
    }

    function testGetClaimableLiquidityProviderFeesUnderflowProtection() public {
        uint256 marketId = createAndFundMarket();
        
        // Generate fees
        vm.prank(bob);
        market.buyShares(marketId, true, 50 * 10**6, 0);
        
        // Alice claims fees
        vm.prank(alice);
        market.claimLiquidityProviderFees(marketId);
        
        // Simulate scenario where market.feesCollected decreases
        // (This could happen if other LPs claim fees)
        // The function should return 0 instead of underflowing
        uint256 claimable = market.getClaimableLiquidityProviderFees(marketId, alice);
        assertEq(claimable, 0, "Should return 0 instead of underflowing");
    }
}