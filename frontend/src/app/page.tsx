'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useWallet } from '@/hooks/useWallet'
import { PredictionMarketReader, PredictionMarketWriter, type Market } from '@/utils/contractOperations'
import { avalancheFuji } from 'wagmi/chains'
import { Wallet, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/Modal'

export default function Home() {
  const { address, isConnected, balance } = useWallet()
  const { disconnect } = useDisconnect()
  const { open: openWalletModal } = useAppKit()
  
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(false)
  const [minting, setMinting] = useState(false)
  const [creatingMarket, setCreatingMarket] = useState(false)
  const [betting, setBetting] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [addingLiquidity, setAddingLiquidity] = useState(false)
  const [removingLiquidity, setRemovingLiquidity] = useState(false)
  const [claimingLPFees, setClaimingLPFees] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [betAmount, setBetAmount] = useState('')
  const [betType, setBetType] = useState<'yes' | 'no'>('yes')
  const [usdcBalance, setUsdcBalance] = useState(0)
  const [showCreateMarket, setShowCreateMarket] = useState(false)
  const [newMarketQuestion, setNewMarketQuestion] = useState('')
  const [newMarketResolutionTime, setNewMarketResolutionTime] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLiquidityModal, setShowLiquidityModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [liquidityAmount, setLiquidityAmount] = useState('')
  const [resolveOutcome, setResolveOutcome] = useState('')
  const [selectedMarketForAction, setSelectedMarketForAction] = useState<Market | null>(null)
  const [userFeesEarned, setUserFeesEarned] = useState(0)
  const [oracleAddress, setOracleAddress] = useState<string>('')
  const [claimEligibility, setClaimEligibility] = useState<Record<number, { canClaim: boolean; hasClaimed: boolean }>>({})
  const [userTokenBalances, setUserTokenBalances] = useState<Record<number, { yesBalance: number; noBalance: number }>>({})
  const [liquidityProviderEarnings, setLiquidityProviderEarnings] = useState<Record<number, number>>({})
  const [showRemoveLiquidityModal, setShowRemoveLiquidityModal] = useState(false)
  const [removeLiquidityAmount, setRemoveLiquidityAmount] = useState('')

  const loadClaimEligibility = useCallback(async (markets: Market[]) => {
    if (!address) return
    
    try {
      const eligibility: Record<number, { canClaim: boolean; hasClaimed: boolean }> = {}
      const balances: Record<number, { yesBalance: number; noBalance: number }> = {}
      const earnings: Record<number, number> = {}
      
      for (const market of markets) {
        // Load token balances for all markets (active and resolved)
        const yesBalance = await PredictionMarketReader.getUserTokenBalance(address, market.id, true)
        const noBalance = await PredictionMarketReader.getUserTokenBalance(address, market.id, false)
        balances[market.id] = { yesBalance, noBalance }
        
        // Load liquidity provider earnings
        const lpEarnings = await PredictionMarketReader.getLiquidityProviderEarnings(address, market.id)
        earnings[market.id] = lpEarnings
        
        // Check claim eligibility for resolved markets
        if (market.status === 1) {
          const canClaim = await canUserClaim(market)
          const hasClaimed = await hasUserClaimed(market)
          eligibility[market.id] = { canClaim, hasClaimed }
        }
      }
      
      setClaimEligibility(eligibility)
      setUserTokenBalances(balances)
      setLiquidityProviderEarnings(earnings)
    } catch (error) {
      console.error('Error loading claim eligibility:', error)
    }
  }, [address])

  const loadMarkets = useCallback(async () => {
    setLoading(true)
    try {
      const allMarkets = await PredictionMarketReader.getAllMarkets()
      setMarkets(allMarkets)
      
      // Load claim eligibility for resolved markets
      if (address) {
        await loadClaimEligibility(allMarkets)
      }
    } catch (error) {
      console.error('Error loading markets:', error)
    } finally {
      setLoading(false)
    }
  }, [address, loadClaimEligibility])

  const loadUSDCBalance = useCallback(async () => {
    if (!address) return
    try {
      const balance = await PredictionMarketReader.getUSDCBalance(address)
      setUsdcBalance(balance)
    } catch (error) {
      console.error('Error loading USDC balance:', error)
    }
  }, [address])

  const loadOracleAddress = useCallback(async () => {
    try {
      const oracle = await PredictionMarketReader.getOracle()
      setOracleAddress(oracle)
    } catch (error) {
      console.error('Error loading oracle address:', error)
    }
  }, [])

  // Check if current user is the oracle
  const isOracle = address && oracleAddress && address.toLowerCase() === oracleAddress.toLowerCase()

  // Load markets on component mount
  useEffect(() => {
    if (isConnected) {
      loadMarkets()
      loadUSDCBalance()
      loadOracleAddress()
    }
  }, [isConnected, address, loadUSDCBalance, loadMarkets, loadOracleAddress])

  const handleBet = async () => {
    if (!selectedMarket || !betAmount || !address) return

    // Check if user has enough USDC balance
    if (usdcBalance < parseFloat(betAmount)) {
      toast.error(`Insufficient USDC balance. You have ${usdcBalance.toFixed(2)} USDC but need ${parseFloat(betAmount).toFixed(2)} USDC`)
      return
    }

    try {
      setBetting(true)
      
      // First approve USDC spending
      const approveResult = await PredictionMarketWriter.approveUSDC(
        parseFloat(betAmount)
      )
      
      if (!approveResult) {
        toast.error('Failed to approve USDC spending')
        return
      }

      // Then buy shares
      const betResult = await PredictionMarketWriter.buyShares(
        selectedMarket.id,
        betType === 'yes',
        parseFloat(betAmount)
      )

      if (betResult) {
        toast.success('Bet placed successfully!')
        setBetAmount('')
        loadMarkets()
        loadUSDCBalance()
      } else {
        toast.error('Failed to place bet')
      }
    } catch (error) {
      console.error('Error placing bet:', error)
      // Check for specific error messages
      if (error && typeof error === 'object' && 'reason' in error) {
        const reason = (error as { reason: string }).reason
        if (reason.includes('transfer amount exceeds balance')) {
          toast.error('Insufficient USDC balance for this bet')
        } else if (reason.includes('No winning shares')) {
          toast.error('No winning shares to claim')
        } else {
          toast.error(`Transaction failed: ${reason}`)
        }
      } else {
        toast.error('Error placing bet')
      }
    } finally {
      setBetting(false)
    }
  }

  const handleCreateMarket = async () => {
    if (!newMarketQuestion || !newMarketResolutionTime) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setCreatingMarket(true)
      const resolutionTime = Math.floor(new Date(newMarketResolutionTime).getTime() / 1000)
      
      const result = await PredictionMarketWriter.createMarket(
        newMarketQuestion,
        resolutionTime
      )

      if (result) {
        toast.success('Market created successfully!')
        setNewMarketQuestion('')
        setNewMarketResolutionTime('')
        setShowCreateModal(false)
        loadMarkets()
      } else {
        toast.error('Failed to create market')
      }
    } catch (error) {
      console.error('Error creating market:', error)
      toast.error('Error creating market')
    } finally {
      setCreatingMarket(false)
    }
  }

  const handleClaimWinnings = async (marketId: number) => {
    try {
      setLoading(true)
      const result = await PredictionMarketWriter.claimWinnings(marketId)
      
      if (result) {
        toast.success('Winnings claimed successfully!')
        loadMarkets() // This will also refresh claim eligibility
        loadUSDCBalance()
      } else {
        toast.error('Failed to claim winnings')
      }
    } catch (error) {
      console.error('Error claiming winnings:', error)
      // Check for specific error messages
      if (error && typeof error === 'object' && 'reason' in error) {
        const reason = (error as { reason: string }).reason
        if (reason.includes('No winning shares')) {
          toast.error('No winning shares to claim')
        } else if (reason.includes('Already claimed')) {
          toast.error('Winnings already claimed')
        } else {
          toast.error(`Claim failed: ${reason}`)
        }
      } else {
        toast.error('Error claiming winnings')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMintUSDC = async () => {
    try {
      setMinting(true)
      const result = await PredictionMarketWriter.mintUSDC(1000) // Mint 1000 USDC
      
      if (result) {
        toast.success('1000 USDC minted successfully!')
        loadUSDCBalance()
      } else {
        toast.error('Failed to mint USDC')
      }
    } catch (error) {
      console.error('Error minting USDC:', error)
      toast.error('Error minting USDC')
    } finally {
      setMinting(false)
    }
  }

  const handleAddLiquidity = async () => {
    if (!liquidityAmount || isNaN(Number(liquidityAmount)) || Number(liquidityAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!selectedMarketForAction) return

    // Check if user has enough USDC balance
    if (usdcBalance < Number(liquidityAmount)) {
      toast.error(`Insufficient USDC balance. You have ${usdcBalance.toFixed(2)} USDC but need ${Number(liquidityAmount).toFixed(2)} USDC`)
      return
    }

    try {
      setLoading(true)
      
      // First approve USDC spending
      const approveResult = await PredictionMarketWriter.approveUSDC(Number(liquidityAmount))
      if (!approveResult) {
        toast.error('Failed to approve USDC spending')
        return
      }
      
      // Then add liquidity
      const liquidityResult = await PredictionMarketWriter.addLiquidity(selectedMarketForAction.id, Number(liquidityAmount))
      if (liquidityResult) {
        toast.success('Liquidity added successfully!')
        setShowLiquidityModal(false)
        setLiquidityAmount('')
        loadMarkets()
        loadUSDCBalance()
      } else {
        toast.error('Failed to add liquidity')
      }
    } catch (error) {
      console.error('Error adding liquidity:', error)
      // Check for specific error messages
      if (error && typeof error === 'object' && 'reason' in error) {
        const reason = (error as { reason: string }).reason
        if (reason.includes('transfer amount exceeds balance')) {
          toast.error('Insufficient USDC balance for adding liquidity')
        } else {
          toast.error(`Liquidity failed: ${reason}`)
        }
      } else {
        toast.error('Error adding liquidity')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForceResolve = async () => {
    if (!resolveOutcome || isNaN(Number(resolveOutcome)) || Number(resolveOutcome) < 1 || Number(resolveOutcome) > 3) {
      toast.error('Please enter a valid outcome (1=YES, 2=NO, 3=INVALID)')
      return
    }

    if (!selectedMarketForAction) return

    try {
      setLoading(true)
      const result = await PredictionMarketWriter.forceResolveMarket(selectedMarketForAction.id, Number(resolveOutcome))
      
      if (result) {
        toast.success('Market resolved successfully!')
        setShowResolveModal(false)
        setResolveOutcome('')
        loadMarkets()
      } else {
        toast.error('Failed to resolve market')
      }
    } catch (error) {
      console.error('Error resolving market:', error)
      toast.error('Error resolving market')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveLiquidity = async (marketId: number) => {
    try {
      setLoading(true)
      
      // Find the market to check its status
      const market = markets.find(m => m.id === marketId)
      if (!market) {
        toast.error('Market not found')
        return
      }
      
      // Check if market is active or resolved (can remove liquidity from both)
      if (market.status !== 0 && market.status !== 1) {
        toast.error('Cannot remove liquidity from cancelled markets')
        return
      }
      
      // Get user's token balances for this market
      const yesBalance = userTokenBalances[marketId]?.yesBalance || 0
      const noBalance = userTokenBalances[marketId]?.noBalance || 0
      
      console.log(`User balances - YES: ${yesBalance}, NO: ${noBalance}`)
      console.log(`Market liquidity pool: ${(Number(market.liquidityPool) / 1e6).toFixed(2)}`)
      
      // For liquidity providers, they should have equal YES and NO tokens
      // We'll remove the minimum amount (matching pairs)
      const amountToRemove = Math.min(yesBalance, noBalance)
      
      if (amountToRemove <= 0) {
        toast.error('No liquidity to remove')
        return
      }
      
      // Validate amounts are reasonable (not too small)
      if (amountToRemove < 0.01) {
        toast.error('Amount too small to remove')
        return
      }
      
      // Check if user has enough tokens
      if (yesBalance < amountToRemove || noBalance < amountToRemove) {
        toast.error('Insufficient token balance for removal')
        return
      }
      
      // Check if market has enough liquidity
      const marketLiquidity = Number(market.liquidityPool) / 1e6
      if (amountToRemove > marketLiquidity) {
        toast.error('Cannot remove more liquidity than available in market')
        return
      }
      
      // Safety check: don't remove more than 50% of market liquidity in one go
      const maxRemoval = marketLiquidity * 0.5
      if (amountToRemove > maxRemoval) {
        toast.error(`Cannot remove more than 50% of market liquidity (max: ${maxRemoval.toFixed(2)} USDC)`)
        return
      }
      
      console.log(`Attempting to remove ${amountToRemove} USDC worth of liquidity`)
      console.log(`Market liquidity: ${marketLiquidity.toFixed(2)} USDC, Max removal: ${maxRemoval.toFixed(2)} USDC`)
      
      const result = await PredictionMarketWriter.removeLiquidity(marketId, amountToRemove, amountToRemove)
      
      if (result) {
        toast.success('Liquidity removed successfully! You received your principal + fees.')
        loadMarkets() // This will refresh the balances
        loadUSDCBalance()
      } else {
        toast.error('Failed to remove liquidity')
      }
    } catch (error) {
      console.error('Error removing liquidity:', error)
      // Check for specific error messages
      if (error && typeof error === 'object' && 'reason' in error) {
        const reason = (error as { reason: string }).reason
        if (reason.includes('OVERFLOW')) {
          toast.error('Arithmetic overflow - please try with smaller amounts')
        } else if (reason.includes('Market not active')) {
          toast.error('Cannot remove liquidity from resolved markets')
        } else if (reason.includes('Insufficient')) {
          toast.error('Insufficient token balance')
        } else {
          toast.error(`Remove liquidity failed: ${reason}`)
        }
      } else {
        toast.error('Error removing liquidity')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveLiquidityWithAmount = async (marketId: number, amount: number) => {
    try {
      setLoading(true)
      
      // Find the market to check its status
      const market = markets.find(m => m.id === marketId)
      if (!market) {
        toast.error('Market not found')
        return
      }
      
      // Check if market is active or resolved (not cancelled)
      if (market.status !== 0 && market.status !== 1) {
        toast.error('Cannot remove liquidity from cancelled markets')
        return
      }
      
      // Get user's token balances
      const yesBalance = userTokenBalances[marketId]?.yesBalance || 0
      const noBalance = userTokenBalances[marketId]?.noBalance || 0
      
      // Validate amount
      if (amount <= 0) {
        toast.error('Amount must be positive')
        return
      }
      
      if (amount > yesBalance || amount > noBalance) {
        toast.error('Amount exceeds your token balance')
        return
      }
      
      // Check market liquidity
      const marketLiquidity = Number(market.liquidityPool) / 1e6
      if (amount > marketLiquidity) {
        toast.error('Cannot remove more liquidity than available in market')
        return
      }
      
      console.log(`Removing ${amount} USDC worth of liquidity from market ${marketId}`)
      
      const result = await PredictionMarketWriter.removeLiquidity(marketId, amount, amount)
      
      if (result) {
        toast.success('Liquidity removed successfully! You received your principal + fees.')
        setShowRemoveLiquidityModal(false)
        setRemoveLiquidityAmount('')
        loadMarkets()
        loadUSDCBalance()
      } else {
        toast.error('Failed to remove liquidity')
      }
    } catch (error) {
      console.error('Error removing liquidity:', error)
      if (error && typeof error === 'object' && 'reason' in error) {
        const reason = (error as { reason: string }).reason
        if (reason.includes('OVERFLOW')) {
          toast.error('Arithmetic overflow - try removing a smaller amount')
        } else {
          toast.error(`Remove liquidity failed: ${reason}`)
        }
      } else {
        toast.error('Error removing liquidity')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClaimLiquidityProviderFees = async (marketId: number) => {
    try {
      setClaimingLPFees(true)
      
      console.log(`Claiming LP fees for market ${marketId}`)
      
      const result = await PredictionMarketWriter.claimLiquidityProviderFees(marketId)
      
      if (result) {
        toast.success('LP fees claimed successfully! You received your accumulated fees.')
        // Refresh all data to update UI state
        loadMarkets()
        loadUSDCBalance()
        // Force refresh claim eligibility to hide the button
        if (address) {
          await loadClaimEligibility(markets)
        }
      } else {
        toast.error('Failed to claim LP fees')
      }
    } catch (error) {
      console.error('Error claiming LP fees:', error)
      if (error && typeof error === 'object' && 'reason' in error) {
        const reason = (error as { reason: string }).reason
        if (reason.includes('No fees to claim')) {
          toast.error('No fees available to claim')
        } else if (reason.includes('No liquidity provided')) {
          toast.error('You have not provided liquidity to this market')
        } else {
          toast.error(`Claim LP fees failed: ${reason}`)
        }
      } else {
        toast.error('Error claiming LP fees')
      }
    } finally {
      setClaimingLPFees(false)
    }
  }

  // Check if user is winner and can claim
  const canUserClaim = async (market: Market): Promise<boolean> => {
    if (market.status !== 1) return false // Not resolved
    if (!address) return false
    
    try {
      // Get user's token balances for this market
      const yesBalance = await PredictionMarketReader.getUserTokenBalance(address, market.id, true)
      const noBalance = await PredictionMarketReader.getUserTokenBalance(address, market.id, false)
      
      // Check if user has winning tokens
      if (market.outcome === 1) { // YES outcome
        return yesBalance > 0
      } else if (market.outcome === 2) { // NO outcome
        return noBalance > 0
      } else if (market.outcome === 3) { // INVALID outcome
        return yesBalance > 0 || noBalance > 0 // Can claim if has any tokens
      }
      
      return false
    } catch (error) {
      console.error('Error checking user claim eligibility:', error)
      return false
    }
  }

  // Check if user has already claimed
  const hasUserClaimed = async (market: Market): Promise<boolean> => {
    if (!address) return false
    
    try {
      // Check if user has any remaining tokens (if claimed, tokens should be 0)
      const yesBalance = await PredictionMarketReader.getUserTokenBalance(address, market.id, true)
      const noBalance = await PredictionMarketReader.getUserTokenBalance(address, market.id, false)
      
      // If user has no tokens left, they likely already claimed
      return yesBalance === 0 && noBalance === 0
    } catch (error) {
      console.error('Error checking if user claimed:', error)
      return false
    }
  }

  const getMarketStatus = (market: Market) => {
    if (market.status === 1) return 'Resolved'
    if (market.status === 2) return 'Cancelled'
    return 'Active'
  }

  const getOutcomeText = (outcome: number) => {
    switch (outcome) {
      case 1: return 'Yes'
      case 2: return 'No'
      case 3: return 'Invalid'
      default: return 'Unresolved'
    }
  }

  const getOutcomeIcon = (outcome: number) => {
    switch (outcome) {
      case 1: return <CheckCircle className="w-5 h-5 text-green-500" />
      case 2: return <XCircle className="w-5 h-5 text-red-500" />
      case 3: return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default: return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border border-gray-700">
          <div className="text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white mb-2">PredictPro</h1>
            <p className="text-gray-300 mb-6">Connect your wallet to start trading predictions</p>
            
                            <button
                                onClick={() => openWalletModal({ view: "Connect" })}
                                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Connect Wallet
                            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-indigo-400" />
              <h1 className="text-2xl font-bold text-white">PredictPro</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                <div>USDC Balance: {usdcBalance.toFixed(2)}</div>
                <div>AVAX Balance: {balance}</div>
                {Object.values(liquidityProviderEarnings).some(earnings => earnings > 0) && (
                  <div className="text-yellow-400 font-medium">
                    LP Earnings: ${Object.values(liquidityProviderEarnings).reduce((sum, earnings) => sum + earnings, 0).toFixed(2)}
                  </div>
                )}
                <div className="text-xs text-gray-400">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
                {isOracle && (
                  <div className="text-xs text-orange-400 font-medium">🔮 Oracle</div>
                )}
              </div>
              <button
                onClick={() => disconnect()}
                className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-6 flex space-x-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create New Market
          </button>
          <button
            onClick={handleMintUSDC}
            disabled={minting}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {minting ? 'Minting...' : 'Mint 1000 USDC'}
          </button>
        </div>


        {/* Markets List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Active Markets</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
              <p className="mt-4 text-gray-300">Loading markets...</p>
            </div>
          ) : markets.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-16 h-16 mx-auto text-gray-500 mb-4" />
              <p className="text-gray-300">No markets found. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {markets.map((market) => (
                <div key={market.id} className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getOutcomeIcon(market.outcome)}
                      <span className="text-sm font-medium text-gray-300">
                        {getMarketStatus(market)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">#{market.id}</span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {market.question}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Resolution:</span>
                      <span className="text-white">
                        {new Date(market.resolutionTime * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Liquidity:</span>
                      <span className="text-white">
                        ${(Number(market.liquidityPool) / 1e6).toFixed(2)}
                      </span>
                    </div>
                    {market.status === 1 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Outcome:</span>
                        <span className="text-white font-medium">
                          {getOutcomeText(market.outcome)}
                        </span>
                      </div>
                    )}
                    
                    {/* Show user's token balances if they have any */}
                    {address && (userTokenBalances[market.id]?.yesBalance > 0 || userTokenBalances[market.id]?.noBalance > 0) && (
                      <div className="mt-2 pt-2 border-t border-gray-600">
                        <div className="text-xs text-gray-400 mb-1">Your Tokens:</div>
                        <div className="flex justify-between text-xs">
                          <span className={`${market.status === 1 && market.outcome === 1 ? 'text-green-400 font-bold' : 'text-green-300'}`}>
                            YES: {userTokenBalances[market.id]?.yesBalance.toFixed(2) || '0.00'}
                            {market.status === 1 && market.outcome === 1 && ' 🏆'}
                          </span>
                          <span className={`${market.status === 1 && market.outcome === 2 ? 'text-red-400 font-bold' : 'text-red-300'}`}>
                            NO: {userTokenBalances[market.id]?.noBalance.toFixed(2) || '0.00'}
                            {market.status === 1 && market.outcome === 2 && ' 🏆'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Show liquidity provider earnings if user has any */}
                    {address && liquidityProviderEarnings[market.id] > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-600">
                        <div className="text-xs text-gray-400 mb-2">
                          LP Earnings: <span className="text-yellow-400 font-bold">${liquidityProviderEarnings[market.id].toFixed(2)}</span>
                        </div>
                        <div className="flex space-x-2">
                          {/* Claim LP Fees Button - Works on both active and resolved markets */}
                          <button
                            onClick={() => handleClaimLiquidityProviderFees(market.id)}
                            disabled={claimingLPFees || liquidityProviderEarnings[market.id] <= 0}
                            className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {claimingLPFees ? 'Claiming...' : 'Claim LP Fees'}
                          </button>
                          
                          {/* Remove LP Button - Only works on resolved markets */}
                          {market.status === 1 && (
                            <button
                              onClick={() => {
                                setSelectedMarketForAction(market)
                                setShowRemoveLiquidityModal(true)
                              }}
                              className="flex-1 bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 transition-colors"
                            >
                              Remove LP
                            </button>
                          )}
                        </div>
                        {market.status === 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            💡 Keep liquidity active to earn more fees! Remove after resolution.
                          </div>
                        )}
                        {market.status === 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            💡 Market resolved! You can now remove your liquidity.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {market.status === 0 && (
                    <div className="space-y-3">
                      {/* Add Liquidity Button */}
                      <button
                        onClick={() => {
                          setSelectedMarketForAction(market)
                          setShowLiquidityModal(true)
                        }}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Add Liquidity
                      </button>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedMarket(market)
                            setBetType('yes')
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            selectedMarket?.id === market.id && betType === 'yes'
                              ? 'bg-green-600 text-white border-2 border-green-400'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          YES
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMarket(market)
                            setBetType('no')
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            selectedMarket?.id === market.id && betType === 'no'
                              ? 'bg-red-600 text-white border-2 border-red-400'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          NO
                        </button>
                      </div>
                      
                      {selectedMarket?.id === market.id && (
                        <div className="space-y-2">
                          <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            placeholder="Amount (USDC)"
                            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          <button
                            onClick={handleBet}
                            disabled={betting || !betAmount}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {betting ? 'Placing Bet...' : `Bet ${betType.toUpperCase()}`}
                          </button>
                        </div>
                      )}
                      
                      {/* Force Resolve Button (for oracle only) */}
                      {isOracle && (
                        <button
                          onClick={() => {
                            setSelectedMarketForAction(market)
                            setShowResolveModal(true)
                          }}
                          className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                        >
                          Force Resolve (Oracle)
                        </button>
                      )}
                    </div>
                  )}

                  {market.status === 1 && claimEligibility[market.id]?.canClaim && !claimEligibility[market.id]?.hasClaimed && (
                    <button
                      onClick={() => handleClaimWinnings(market.id)}
                      disabled={loading}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Claiming...' : 'Claim Winnings'}
                    </button>
                  )}
                  
                  {market.status === 1 && claimEligibility[market.id]?.hasClaimed && (
                    <button
                      disabled
                      className="w-full bg-gray-600 text-gray-400 py-2 px-4 rounded-lg cursor-not-allowed transition-colors"
                    >
                      Already Claimed
                    </button>
                  )}
                  
                  {market.status === 1 && !claimEligibility[market.id]?.canClaim && !claimEligibility[market.id]?.hasClaimed && (
                    <div className="w-full bg-gray-700 text-gray-400 py-2 px-4 rounded-lg text-center text-sm">
                      No winning shares to claim
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Market Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Market"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Question
            </label>
            <input
              type="text"
              value={newMarketQuestion}
              onChange={(e) => setNewMarketQuestion(e.target.value)}
              placeholder="e.g., Will ETH reach $5000 by end of 2025?"
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resolution Time
            </label>
            <input
              type="datetime-local"
              value={newMarketResolutionTime}
              onChange={(e) => setNewMarketResolutionTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCreateMarket}
              disabled={creatingMarket || !newMarketQuestion || !newMarketResolutionTime}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creatingMarket ? 'Creating...' : 'Create Market'}
            </button>
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 bg-gray-600 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Liquidity Modal */}
      <Modal
        isOpen={showLiquidityModal}
        onClose={() => setShowLiquidityModal(false)}
        title="Add Liquidity"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              value={liquidityAmount}
              onChange={(e) => setLiquidityAmount(e.target.value)}
              placeholder="Enter amount to add as liquidity"
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleAddLiquidity}
              disabled={loading || !liquidityAmount}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : 'Add Liquidity'}
            </button>
            <button
              onClick={() => setShowLiquidityModal(false)}
              className="flex-1 bg-gray-600 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Force Resolve Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Force Resolve Market"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Outcome
            </label>
            <select
              value={resolveOutcome}
              onChange={(e) => setResolveOutcome(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select outcome</option>
              <option value="1">YES</option>
              <option value="2">NO</option>
              <option value="3">INVALID</option>
            </select>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleForceResolve}
              disabled={loading || !resolveOutcome}
              className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Resolving...' : 'Resolve Market'}
            </button>
            <button
              onClick={() => setShowResolveModal(false)}
              className="flex-1 bg-gray-600 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Remove Liquidity Modal */}
      <Modal
        isOpen={showRemoveLiquidityModal}
        onClose={() => setShowRemoveLiquidityModal(false)}
        title="Remove Liquidity"
      >
        <div className="space-y-4">
          {selectedMarketForAction && (
            <>
              <div className="text-sm text-gray-300">
                <div>Market: {selectedMarketForAction.question}</div>
                <div>Your YES tokens: {userTokenBalances[selectedMarketForAction.id]?.yesBalance.toFixed(2) || '0.00'}</div>
                <div>Your NO tokens: {userTokenBalances[selectedMarketForAction.id]?.noBalance.toFixed(2) || '0.00'}</div>
                <div>Max removable: {Math.min(userTokenBalances[selectedMarketForAction.id]?.yesBalance || 0, userTokenBalances[selectedMarketForAction.id]?.noBalance || 0).toFixed(2)} USDC</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount to Remove (USDC)
                </label>
                <input
                  type="number"
                  value={removeLiquidityAmount}
                  onChange={(e) => setRemoveLiquidityAmount(e.target.value)}
                  placeholder="Enter amount to remove"
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (selectedMarketForAction) {
                      const amount = parseFloat(removeLiquidityAmount)
                      if (amount > 0) {
                        handleRemoveLiquidityWithAmount(selectedMarketForAction.id, amount)
                      }
                    }
                  }}
                  disabled={loading || !removeLiquidityAmount || parseFloat(removeLiquidityAmount) <= 0}
                  className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Removing...' : 'Remove Liquidity'}
                </button>
                <button
                  onClick={() => setShowRemoveLiquidityModal(false)}
                  className="flex-1 bg-gray-600 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}