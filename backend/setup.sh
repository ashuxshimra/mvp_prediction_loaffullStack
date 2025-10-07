#!/bin/bash

# PredictPro Backend Setup Script
echo "🚀 Setting up PredictPro Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your database credentials before continuing."
    echo "   Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    read -p "Press Enter when you've configured .env file..."
fi

# Load environment variables
source .env

# Create database if it doesn't exist
echo "🗄️  Setting up database..."
createdb $DB_NAME 2>/dev/null || echo "Database $DB_NAME already exists"

# Run database schema
echo "📊 Creating database schema..."
psql $DATABASE_URL -f schema.sql

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "To start the backend:"
echo "  Development: npm run dev"
echo "  Production:  npm start"
echo ""
echo "API will be available at: http://localhost:${PORT:-3001}"
echo "Health check: http://localhost:${PORT:-3001}/health"
