# PredictPro Backend API

Off-chain infrastructure for PredictPro prediction markets, providing enhanced data storage, analytics, and user experience features.

## 🏗️ Architecture

- **Express.js**: RESTful API server
- **PostgreSQL**: Relational database for metadata and analytics
- **TypeScript**: Type-safe development
- **Node.js**: Runtime environment

## 📊 Features

### Core Functionality
- ✅ **Market Metadata Storage**: Rich market descriptions, categories, images
- ✅ **Transaction Tracking**: Complete transaction history and analytics
- ✅ **User Activity**: Trading statistics and performance metrics
- ✅ **Search & Discovery**: Advanced market search capabilities
- ✅ **Platform Analytics**: Real-time platform statistics

### API Endpoints

#### Markets
- `GET /api/markets` - Get all markets (paginated)
- `GET /api/markets/:id` - Get specific market with analytics
- `POST /api/markets/:id/metadata` - Create market metadata
- `POST /api/markets/:id/analytics` - Update market analytics
- `GET /api/markets/:id/transactions` - Get market transactions
- `GET /api/markets/search/:query` - Search markets

#### Transactions
- `POST /api/transactions/track` - Record new transaction
- `GET /api/transactions/user/:address` - Get user transaction history
- `GET /api/transactions/user/:address/activity` - Get user activity stats
- `GET /api/transactions/stats/platform` - Get platform statistics

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb predictpro

# Run schema
psql predictpro < schema.sql
```

### 3. Environment Configuration
Copy `env.example` to `.env` and configure:
```bash
cp env.example .env
```

Required environment variables:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/predictpro
DB_HOST=localhost
DB_PORT=5432
DB_NAME=predictpro
DB_USER=username
DB_PASSWORD=password
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 4. Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📈 Database Schema

### Tables
- **markets**: Market metadata and descriptions
- **market_analytics**: Trading volume and statistics
- **transactions**: Complete transaction history
- **user_activity**: User trading statistics
- **notifications**: User notifications (future feature)

### Key Features
- Automatic timestamps with triggers
- Foreign key constraints for data integrity
- Indexes for optimal query performance
- JSONB support for flexible data storage

## 🔌 Frontend Integration

### Transaction Tracking
When a blockchain transaction succeeds, call the backend:

```typescript
// After successful transaction
await fetch('/api/transactions/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txHash: '0x...',
    userAddress: '0x...',
    marketId: 1,
    actionType: 'bet',
    amount: 100,
    outcome: 'yes',
    success: true,
    blockNumber: 12345
  })
});
```

### Market Metadata
Store rich market data:

```typescript
// After market creation
await fetch('/api/markets/1/metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'Will Bitcoin reach $100k?',
    description: 'Bitcoin price prediction...',
    category: 'Crypto',
    imageUrl: 'https://...',
    creatorAddress: '0x...',
    tags: ['bitcoin', 'crypto', 'price']
  })
});
```

## 🚀 Production Deployment

### Docker (Recommended)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/predictpro
FRONTEND_URL=https://your-frontend.com
```

## 📊 Analytics & Monitoring

### Key Metrics Tracked
- Total markets created
- Trading volume per market
- User activity and performance
- Platform-wide statistics
- Transaction success rates

### Future Enhancements
- Real-time notifications
- Email/SMS alerts
- Advanced analytics dashboard
- Machine learning insights
- API rate limiting
- Caching layer (Redis)

## 🔒 Security

- **Helmet.js**: Security headers
- **CORS**: Cross-origin protection
- **Input Validation**: Request validation
- **SQL Injection**: Parameterized queries
- **Rate Limiting**: (Future implementation)

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Test API endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/markets
```

## 📝 API Documentation

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... } // For paginated endpoints
}
```

### Error Format
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... } // In development
}
```

---

**PredictPro Backend** - Powering the future of prediction markets 🚀
