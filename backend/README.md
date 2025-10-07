# PredictPro Backend API

Off-chain infrastructure for PredictPro prediction markets, providing enhanced data storage, analytics, and user experience features.

## 🏗️ Architecture

- **Express.js**: RESTful API server
- **PostgreSQL**: Relational database for metadata and analytics
- **TypeScript**: Type-safe development
- **Node.js**: Runtime environment

### Technology Stack Trade-offs

**Node.js + TypeScript**
- ✅ **Pros**: Fast development, large ecosystem, excellent TypeScript support
- ❌ **Cons**: Single-threaded, memory usage
- **Alternative Considered**: Python (Django/FastAPI), Go, Rust
- **Decision**: Node.js for rapid development and JavaScript ecosystem consistency

**Express.js**
- ✅ **Pros**: Minimal, flexible, extensive middleware ecosystem
- ❌ **Cons**: Less opinionated, more setup required
- **Alternative Considered**: NestJS, Fastify, Koa
- **Decision**: Express.js for simplicity and flexibility

**PostgreSQL**
- ✅ **Pros**: ACID compliance, excellent performance, mature ecosystem
- ❌ **Cons**: More complex than NoSQL, requires schema management
- **Alternative Considered**: MongoDB, Redis, MySQL
- **Decision**: PostgreSQL for financial data integrity and complex queries

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

## 🛠️ Tools Used and Their Purposes

### Core Technologies
- **Node.js**: JavaScript runtime for server-side development
  - **Purpose**: Fast, event-driven server development
  - **Why Chosen**: Large ecosystem, excellent TypeScript support, rapid development

- **TypeScript**: Superset of JavaScript with static typing
  - **Purpose**: Type safety, better developer experience, fewer runtime errors
  - **Why Chosen**: Catches errors at compile time, excellent IDE support

- **Express.js**: Minimal web framework for Node.js
  - **Purpose**: HTTP server, routing, middleware management
  - **Why Chosen**: Simple, flexible, extensive middleware ecosystem

- **PostgreSQL**: Relational database management system
  - **Purpose**: Persistent data storage for market metadata and analytics
  - **Why Chosen**: ACID compliance, excellent performance, mature ecosystem

### Development Tools
- **Nodemon**: Development tool for automatic server restarts
  - **Purpose**: Hot reloading during development
  - **Why Chosen**: Improves development experience, automatic restarts

- **Helmet**: Security middleware for Express
  - **Purpose**: Security headers, XSS protection, CSRF protection
  - **Why Chosen**: Industry standard for Express security

- **CORS**: Cross-Origin Resource Sharing middleware
  - **Purpose**: Enable cross-origin requests from frontend
  - **Why Chosen**: Essential for frontend-backend communication

### Database Tools
- **pg**: PostgreSQL client for Node.js
  - **Purpose**: Database connection and query execution
  - **Why Chosen**: Official PostgreSQL client, excellent performance

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

## 🚀 What We Would Build With More Time

### Phase 1: Enhanced Analytics (2-3 weeks)
**Current Limitation**: Basic transaction tracking and market statistics
**Enhanced Solution**:
- **Real-time Analytics**: WebSocket connections for live data updates
- **Advanced Metrics**: Sharpe ratios, correlation analysis, risk metrics
- **Predictive Analytics**: Machine learning models for market prediction
- **Custom Dashboards**: User-configurable analytics interfaces

**Trade-off Analysis**:
- ✅ **Pros**: Better user insights, competitive advantage, data-driven decisions
- ❌ **Cons**: Complex implementation, higher computational costs
- **Decision**: Start with real-time updates, add ML models later

### Phase 2: Notification System (3-4 weeks)
**Current Limitation**: No user notifications for market updates
**Enhanced Solution**:
- **Multi-channel Notifications**: Email, SMS, push notifications, in-app alerts
- **Smart Notifications**: AI-powered notification timing and content
- **User Preferences**: Customizable notification settings per user
- **Notification Analytics**: Track engagement and optimize delivery

**Trade-off Analysis**:
- ✅ **Pros**: Better user engagement, retention, timely updates
- ❌ **Cons**: Infrastructure complexity, delivery costs, spam prevention
- **Decision**: Start with email notifications, add SMS/push later

### Phase 3: Advanced API Features (4-6 weeks)
**Current Limitation**: Basic REST API with limited functionality
**Enhanced Solution**:
- **GraphQL API**: More flexible data querying
- **WebSocket API**: Real-time data streaming
- **Rate Limiting**: Advanced rate limiting with user tiers
- **API Versioning**: Backward compatibility and gradual migrations
- **Developer Portal**: API documentation, SDKs, sandbox environment

**Trade-off Analysis**:
- ✅ **Pros**: Better developer experience, more flexible queries, real-time data
- ❌ **Cons**: More complex implementation, higher maintenance
- **Decision**: Add GraphQL layer, implement WebSocket for real-time features

### Phase 4: Microservices Architecture (6-8 weeks)
**Current Limitation**: Monolithic architecture
**Enhanced Solution**:
- **Service Decomposition**: Separate services for markets, users, analytics, notifications
- **Message Queues**: Redis/RabbitMQ for async processing
- **API Gateway**: Centralized routing and authentication
- **Service Discovery**: Dynamic service registration and discovery
- **Container Orchestration**: Docker + Kubernetes for scaling

**Trade-off Analysis**:
- ✅ **Pros**: Better scalability, fault isolation, independent deployments
- ❌ **Cons**: Increased complexity, network overhead, distributed system challenges
- **Decision**: Start with service decomposition, add orchestration later

### Phase 5: Advanced Security & Compliance (8-10 weeks)
**Current Limitation**: Basic security measures
**Enhanced Solution**:
- **Advanced Authentication**: OAuth2, JWT, multi-factor authentication
- **Authorization**: Role-based access control (RBAC)
- **Audit Logging**: Comprehensive audit trails for compliance
- **Data Encryption**: End-to-end encryption for sensitive data
- **Compliance Tools**: GDPR, CCPA compliance features
- **Security Monitoring**: Real-time threat detection and response

**Trade-off Analysis**:
- ✅ **Pros**: Enterprise-grade security, regulatory compliance, user trust
- ❌ **Cons**: Complex implementation, ongoing compliance costs
- **Decision**: Implement OAuth2 and RBAC first, add compliance features later

## 🔒 Security

- **Helmet.js**: Security headers
- **CORS**: Cross-origin protection
- **Input Validation**: Request validation
- **SQL Injection**: Parameterized queries
- **Rate Limiting**: (Future implementation)

## ⚠️ Known Limitations

### Current MVP Limitations
1. **No Authentication**: No user authentication or authorization system
   - **Impact**: Anyone can access all endpoints
   - **Solution**: Implement OAuth2/JWT authentication

2. **No Rate Limiting**: No protection against API abuse
   - **Impact**: Potential DoS attacks, resource exhaustion
   - **Solution**: Implement rate limiting middleware

3. **Basic Error Handling**: Limited error information in production
   - **Impact**: Difficult debugging, potential information leakage
   - **Solution**: Structured error handling with proper logging

4. **No Caching**: All database queries are executed on every request
   - **Impact**: Higher database load, slower response times
   - **Solution**: Implement Redis caching layer

5. **Single Database Instance**: No read replicas or connection pooling
   - **Impact**: Single point of failure, limited scalability
   - **Solution**: Database clustering and connection pooling

6. **No Monitoring**: No application performance monitoring
   - **Impact**: Difficult to identify performance bottlenecks
   - **Solution**: Implement APM tools (New Relic, DataDog)

### Production Considerations
- **Scalability**: Current architecture supports ~1000 concurrent users
- **Security**: Basic security measures, needs enhancement for production
- **Monitoring**: No real-time monitoring or alerting
- **Backup**: No automated database backup strategy
- **Deployment**: Manual deployment process, no CI/CD pipeline

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
