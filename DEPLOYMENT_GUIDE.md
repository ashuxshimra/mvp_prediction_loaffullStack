# PredictPro - Deployment Guide

## 🚀 Deployment Overview

This guide provides comprehensive deployment instructions for the PredictPro prediction market platform, covering smart contracts, backend services, and frontend applications.

## 📋 Prerequisites

### Required Tools
- **Foundry**: Latest version for smart contract deployment
- **Node.js**: 18+ for backend and frontend
- **PostgreSQL**: 13+ for database
- **MetaMask**: For wallet management
- **Git**: For version control

### Required Accounts
- **Avalanche Fuji**: Testnet AVAX for gas fees
- **Snowtrace**: API key for contract verification
- **Vercel**: Account for frontend deployment (optional)
- **Railway/Render**: Account for backend deployment (optional)

## 🔧 Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/ashuxshimra/mvp_prediction_loaffullStack.git
cd mvp_prediction_loaffullStack
```

### 2. Install Dependencies

```bash
# Install Foundry dependencies
forge install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Environment Configuration

Create `.env` file in root directory:

```bash
# Private key for deployment (with 0x prefix)
PRIVATE_KEY=0x1234567890abcdef...

# Avalanche Fuji RPC URL
AVAX_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Snowtrace API key for contract verification
SNOWTRACE_API_KEY=your_snowtrace_api_key_here

# Oracle address (can be same as deployer for testnet)
ORACLE_ADDRESS=0x1234567890abcdef...
```

## 🏗️ Smart Contract Deployment

### 1. Build Contracts

```bash
# Build all contracts
forge build

# Verify build success
ls out/
# Should see: PredictionMarket.sol, OutcomeToken.sol, MockUSDC.sol
```

### 2. Run Tests

```bash
# Run all tests
forge test

# Run with verbose output
forge test -vv

# Run specific test
forge test --match-test testClaimLiquidityProviderFees -vv
```

### 3. Deploy to Avalanche Fuji

```bash
# Deploy with verification
forge script script/Deploy.s.sol:Deploy --rpc-url avalanche_fuji --broadcast --verify

# Alternative: Use Makefile
make deploy-fuji
```

### 4. Verify Deployment

```bash
# Check deployment status
forge script script/Deploy.s.sol:Deploy --rpc-url avalanche_fuji

# Verify contracts on Snowtrace
# Visit: https://testnet.snowtrace.io/address/[CONTRACT_ADDRESS]
```

### 5. Update Frontend Configuration

Update `frontend/src/utils/contracts.ts` with deployed addresses:

```typescript
export const ContractConfigs: ContractConfigs = {
  [avalancheFuji.id]: {
    PredictionMarket: {
      address: "0x[YOUR_DEPLOYED_ADDRESS]", // Update this
      abi: PredictionMarketAbi.abi,
    },
    MockUSDC: {
      address: "0x[YOUR_DEPLOYED_ADDRESS]", // Update this
      abi: MockUSDCAbi.abi,
      decimals: 6,
    },
    // ...
  },
};
```

## 🗄️ Backend Deployment

### 1. Database Setup

#### Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb predictpro

# Create user (optional)
createuser -s postgres

# Apply schema
cd backend
psql -U postgres -d predictpro -f schema.sql
```

#### Cloud PostgreSQL (Railway)

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb predictpro

# Create user (optional)
createuser -s postgres

# Apply schema
cd backend
psql -U postgres -d predictpro -f schema.sql
```

#### Cloud PostgreSQL (Optional for Production)

For production, you can use:
- **Railway**: Simple PostgreSQL hosting
- **Supabase**: PostgreSQL with additional features
- **Neon**: Serverless PostgreSQL
- **AWS RDS**: Managed PostgreSQL
- **Google Cloud SQL**: Managed PostgreSQL

### 2. Backend Configuration

Create `backend/.env`:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/predictpro
DB_HOST=localhost
DB_PORT=5432
DB_NAME=predictpro
DB_USER=postgres
DB_PASSWORD=password

# Server Configuration
PORT=3001
NODE_ENV=production

# Blockchain Configuration
AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
PREDICTION_MARKET_ADDRESS=0x[YOUR_DEPLOYED_ADDRESS]
MOCK_USDC_ADDRESS=0x[YOUR_DEPLOYED_ADDRESS]

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com
```

### 3. Deploy Backend

#### Local Development

```bash
cd backend

# Copy environment template
cp env.example .env

# Edit .env with your database settings
# DATABASE_URL=postgresql://postgres:password@localhost:5432/predictpro
# PORT=3001
# NODE_ENV=development
# FRONTEND_URL=http://localhost:3000

# Start development server
npm run dev
```

#### Production Deployment Options

**Option 1: Railway (Recommended for beginners)**
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up
```

**Option 2: Render (Free tier available)**
```bash
# 1. Connect GitHub repository to Render
# 2. Create new Web Service
# 3. Configure build and start commands
# 4. Add environment variables
# 5. Deploy
```

**Option 3: DigitalOcean App Platform**
```bash
# 1. Create new app on DigitalOcean
# 2. Connect GitHub repository
# 3. Configure build settings
# 4. Add environment variables
# 5. Deploy
```

#### Render Deployment

```bash
# 1. Connect GitHub repository to Render
# 2. Create new Web Service
# 3. Configure:
#    - Build Command: npm install && npm run build
#    - Start Command: npm start
#    - Environment: Node.js
# 4. Add environment variables
# 5. Deploy
```

### 4. Verify Backend Deployment

```bash
# Test health endpoint
curl https://your-backend-domain.com/health

# Test API endpoints
curl https://your-backend-domain.com/api/markets
```

## 🎨 Frontend Deployment

### 1. Frontend Configuration

Create `frontend/.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend-domain.com

# Blockchain Configuration
NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CHAIN_ID=43113

# Contract Addresses
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x[YOUR_DEPLOYED_ADDRESS]
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0x[YOUR_DEPLOYED_ADDRESS]
```

### 2. Build Frontend

```bash
cd frontend
npm run build

# Test production build locally
npm start
```

### 3. Deploy Frontend

#### Vercel Deployment

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Configure environment variables in Vercel dashboard
```

#### Netlify Deployment

```bash
# 1. Build for production
npm run build

# 2. Deploy dist folder to Netlify
# 3. Configure environment variables
# 4. Set up custom domain (optional)
```

#### Manual Deployment

```bash
# 1. Build static files
npm run build

# 2. Upload out/ folder to web server
# 3. Configure web server for SPA routing
# 4. Set up SSL certificate
```

### 4. Verify Frontend Deployment

```bash
# Test frontend
curl https://your-frontend-domain.com

# Test wallet connection
# Test contract interaction
# Test all user flows
```

## 🔒 Security Configuration

### 1. Environment Variables Security

```bash
# Never commit .env files
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Use environment-specific files
.env.development
.env.production
.env.staging
```

### 2. Database Security

```sql
-- Create dedicated database user
CREATE USER predictpro_user WITH PASSWORD 'secure_password';

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE predictpro TO predictpro_user;
GRANT USAGE ON SCHEMA public TO predictpro_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO predictpro_user;
```

### 3. API Security

```typescript
// Enable CORS for production
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. Frontend Security

```typescript
// Content Security Policy
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];
```

## 📊 Monitoring and Analytics

### 1. Backend Monitoring

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PredictPro Backend API',
    version: '1.0.0'
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    totalMarkets: await getTotalMarkets(),
    totalTransactions: await getTotalTransactions(),
    activeUsers: await getActiveUsers()
  });
});
```

### 2. Database Monitoring

```sql
-- Monitor database performance
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public';

-- Monitor query performance
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY total_time DESC;
```

### 3. Frontend Monitoring

```typescript
// Error tracking
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Performance monitoring
export function reportWebVitals(metric) {
  console.log(metric);
  // Send to analytics service
}
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      - name: Run tests
        run: forge test
      - name: Build contracts
        run: forge build

  deploy-smart-contracts:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      - name: Deploy contracts
        run: forge script script/Deploy.s.sol:Deploy --rpc-url avalanche_fuji --broadcast --verify
        env:
          PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
          SNOWTRACE_API_KEY: ${{ secrets.SNOWTRACE_API_KEY }}

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    needs: [deploy-smart-contracts, deploy-backend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

### 2. Environment Management

```bash
# Development
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/predictpro_dev

# Staging
NODE_ENV=staging
DATABASE_URL=postgresql://staging-host:5432/predictpro_staging

# Production
NODE_ENV=production
DATABASE_URL=postgresql://prod-host:5432/predictpro_prod
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Contract Deployment Fails

```bash
# Check RPC connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://api.avax-test.network/ext/bc/C/rpc

# Check private key format
echo $PRIVATE_KEY | wc -c
# Should be 66 characters (0x + 64 hex)

# Check gas estimation
forge script script/Deploy.s.sol:Deploy --rpc-url avalanche_fuji --dry-run
```

#### 2. Backend Connection Issues

```bash
# Check database connection
psql -h localhost -U postgres -d predictpro -c "SELECT 1;"

# Check environment variables
echo $DATABASE_URL

# Check port availability
lsof -i :3001
```

#### 3. Frontend Build Issues

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check environment variables
echo $NEXT_PUBLIC_API_URL
```

### Debug Commands

```bash
# Smart contract debugging
forge test --debug testFunctionName

# Backend debugging
NODE_ENV=development npm run dev

# Frontend debugging
npm run dev
# Open browser dev tools
```

## 📈 Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_markets_created_at ON markets(created_at);
CREATE INDEX idx_transactions_user_address ON transactions(user_address);
CREATE INDEX idx_transactions_market_id ON transactions(market_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM markets WHERE market_id = 1;
```

### 2. Backend Optimization

```typescript
// Connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Caching
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

### 3. Frontend Optimization

```typescript
// Code splitting
const MarketList = dynamic(() => import('./MarketList'), {
  loading: () => <p>Loading...</p>
});

// Image optimization
import Image from 'next/image';

// Bundle analysis
npm run build
npm run analyze
```

## 🎯 Production Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### Post-Deployment

- [ ] Health checks passing
- [ ] Contract verification complete
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] Wallet connection working
- [ ] Transaction flow tested
- [ ] Error handling verified
- [ ] Performance metrics acceptable

### Ongoing Maintenance

- [ ] Regular security updates
- [ ] Database backups
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] User feedback collection
- [ ] Feature updates
- [ ] Bug fixes

---

**This deployment guide ensures PredictPro is deployed securely and efficiently to production environments.**
