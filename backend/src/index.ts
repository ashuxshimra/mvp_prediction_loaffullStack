import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import marketsRouter from './routes/markets';
import transactionsRouter from './routes/transactions';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PredictPro Backend API',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/markets', marketsRouter);
app.use('/api/transactions', transactionsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PredictPro Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      markets: '/api/markets',
      transactions: '/api/transactions'
    },
    documentation: 'https://github.com/your-repo/predictpro-backend'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PredictPro Backend API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Markets API: http://localhost:${PORT}/api/markets`);
  console.log(`💳 Transactions API: http://localhost:${PORT}/api/transactions`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
