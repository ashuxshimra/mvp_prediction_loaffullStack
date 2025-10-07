# PredictPro - Professional Prediction Markets

A decentralized prediction market platform built with Foundry and Next.js, deployed on Avalanche Fuji testnet.

## 🎯 Overview

PredictPro is a comprehensive prediction market platform that allows users to:
- Create prediction markets on real-world events
- Bet on market outcomes (YES/NO)
- Provide liquidity and earn trading fees
- Claim winnings when markets resolve
- Oracle-controlled market resolution

## 🏗️ Architecture

### Smart Contracts (Foundry)
- **PredictionMarket.sol**: Core prediction market logic with AMM-based pricing
- **OutcomeToken.sol**: ERC20 tokens representing YES/NO shares
- **MockUSDC.sol**: Mock USDC token for testing

### Frontend (Next.js)
- **React/TypeScript**: Modern web interface
- **Wagmi/Reown**: Wallet connection and blockchain interaction
- **Tailwind CSS**: Responsive dark mode UI
- **Ethers.js**: Blockchain communication

## 🚀 Features

### Core Functionality
- ✅ **Market Creation**: Create prediction markets with custom questions and resolution times
- ✅ **Trading**: Buy/sell YES/NO shares with AMM pricing
- ✅ **Liquidity Provision**: Add liquidity to earn trading fees
- ✅ **Market Resolution**: Oracle-controlled outcome resolution
- ✅ **Winner Claims**: Automatic winner detection and claim functionality

### Advanced Features
- ✅ **Fee Management**: Liquidity providers can claim accumulated fees anytime
- ✅ **Partial Liquidity Removal**: Remove liquidity in custom amounts
- ✅ **Duplicate Claim Prevention**: Secure fee claiming with tracking
- ✅ **Underflow Protection**: Robust arithmetic operations
- ✅ **Oracle Controls**: Only designated oracle can resolve markets

## 📋 Prerequisites

- Node.js 18+
- Foundry
- MetaMask wallet
- Avalanche Fuji testnet AVAX

## 🛠️ Setup

### 1. Clone and Install Dependencies

```bash
# Install Foundry dependencies
forge install

# Install frontend dependencies
cd frontend
npm install
```

### 2. Environment Configuration

Create `.env` file in the root directory:

```bash
# Private key for deployment (with 0x prefix)
PRIVATE_KEY=0x...

# Avalanche Fuji RPC URL
AVAX_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Snowtrace API key for contract verification
SNOWTRACE_API_KEY=...
```

### 3. Build and Test

```bash
# Build contracts
forge build

# Run tests
forge test

# Run specific test
forge test --match-test testClaimLiquidityProviderFees -vv
```

### 4. Deploy Contracts

```bash
# Deploy to Avalanche Fuji
forge script script/Deploy.s.sol:Deploy --rpc-url avalanche_fuji --broadcast --verify
```

### 5. Run Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to access PredictPro.

## 📊 Contract Addresses (Avalanche Fuji)

- **PredictionMarket**: `0xb247Ad117E7AB5b63Fd979d2d990807Ee4deF87C`
- **MockUSDC**: `0x7A83C3d4654DD1874CCc32Cd2b98d53EAa6a9Caf`
- **Oracle**: `0xc247F825faF92014d10FA57822f0CfEC9Db050A9`

## 🎮 User Flow

### 1. Market Creation
1. Connect MetaMask wallet
2. Mint USDC tokens for testing
3. Create a new prediction market
4. Add initial liquidity

### 2. Trading
1. Browse active markets
2. Choose YES or NO outcome
3. Enter bet amount
4. Confirm transaction

### 3. Liquidity Provision
1. Add liquidity to existing markets
2. Earn trading fees from all trades
3. Claim accumulated fees anytime
4. Remove liquidity after market resolution

### 4. Market Resolution
1. Oracle resolves market outcome
2. Winners automatically detected
3. Claim winnings with one click
4. Liquidity providers can remove funds

## 🔒 Security Features

- **Reentrancy Protection**: All state-changing functions protected
- **Access Controls**: Oracle-only market resolution
- **Arithmetic Safety**: Underflow/overflow protection
- **Duplicate Prevention**: Secure fee claiming tracking
- **Slippage Protection**: Price impact limits on trades

## 🧪 Testing

The platform includes comprehensive tests covering:

- Market creation and resolution
- Trading and liquidity provision
- Fee claiming and duplicate prevention
- Error handling and edge cases
- Oracle access controls

Run tests with:
```bash
forge test -vv
```

## 🚀 Deployment

### Smart Contracts
Deployed on Avalanche Fuji testnet with verified source code.

### Frontend
Deployed on Vercel with automatic deployments from main branch.

## 📈 Performance

- **Gas Optimized**: Efficient contract operations
- **Fast UI**: Optimized React components with proper state management
- **Responsive**: Mobile-friendly interface
- **Real-time**: Live balance and market updates

## 🔧 Development

### Project Structure
```
├── src/                    # Smart contracts
├── test/                   # Foundry tests
├── script/                 # Deployment scripts
├── frontend/               # Next.js application
│   ├── src/app/           # App router pages
│   ├── src/components/    # React components
│   ├── src/utils/         # Contract operations
│   └── src/config/        # Configuration
└── README.md              # This file
```

### Key Commands
```bash
# Smart contract development
forge build
forge test
forge script script/Deploy.s.sol:Deploy --rpc-url avalanche_fuji --broadcast

# Frontend development
cd frontend
npm run dev
npm run build
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the test suite for usage examples
- Review contract comments for implementation details
- Open an issue for bugs or feature requests

---

**PredictPro** - Professional Prediction Markets on Avalanche 🚀
