# PredictPro Frontend

A Next.js frontend for PredictPro - Professional Prediction Markets built with Foundry.

## Features

- **Wallet Connection**: Connect with MetaMask wallet
- **Market Creation**: Create new prediction markets with custom questions and resolution times
- **Trading**: Buy YES/NO shares on active markets
- **Claiming**: Claim winnings from resolved markets
- **Real-time Updates**: View market status, liquidity, and outcomes

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables** (Optional):
   Create a `.env.local` file if you want to customize the RPC URL:
   ```env
   # Avalanche Fuji RPC URL (optional - defaults are already set)
   NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://avax-fuji.g.alchemy.com/v2/50NdBDj31gdaDbPdgk82R
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Contract Integration

The frontend integrates with the deployed contracts on Avalanche Fuji:

- **PredictionMarket**: `0xb247Ad117E7AB5b63Fd979d2d990807Ee4deF87C`
- **MockUSDC**: `0x7A83C3d4654DD1874CCc32Cd2b98d53EAa6a9Caf`

## Tech Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Wagmi v2**: React hooks for Ethereum
- **Ethers v6**: Ethereum library
- **TanStack Query**: Data fetching and caching

## Architecture

The frontend follows the same patterns as the governance-staking repo:

- **Contract Operations**: Centralized contract interaction logic
- **Type Safety**: Full TypeScript support with proper types
- **Error Handling**: Comprehensive error handling and user feedback
- **Responsive Design**: Mobile-first responsive design
- **Modern UI**: Clean, professional interface with Tailwind CSS

## Usage

1. **Connect Wallet**: Click "Connect MetaMask" to connect your wallet
2. **Create Market**: Click "Create New Market" to create a prediction market
3. **Trade**: Select a market, choose YES/NO, enter amount, and place your bet
4. **Claim**: After market resolution, claim your winnings if you won

## Development

- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Type Check**: `npm run typecheck`

## Deployment

The frontend can be deployed to Vercel, Netlify, or any static hosting service:

```bash
npm run build
npm run start
```