#!/bin/bash

echo "🚀 WorldHuman Studio Database Setup Script"
echo "========================================="
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) is not installed."
    echo "   Please install it first:"
    echo "   - macOS: brew install postgresql"
    echo "   - Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "❌ .env.local file not found!"
    echo "   Please create it from .env.sample first."
    exit 1
fi

# Check if DATABASE_URL is configured
if [[ "$DATABASE_URL" == *"YOUR_PASSWORD"* ]]; then
    echo "❌ DATABASE_URL is not configured!"
    echo ""
    echo "Please update your .env.local file with your Neon database credentials:"
    echo "1. Go to https://console.neon.tech/"
    echo "2. Create a new project called 'whstudio'"
    echo "3. Copy the connection string and update DATABASE_URL in .env.local"
    echo ""
    exit 1
fi

echo "✅ Database connection configured"
echo ""
echo "Creating database schema..."
echo ""

# Run the schema SQL file
psql "$DATABASE_URL" < lib/db/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema created successfully!"
else
    echo "❌ Failed to create database schema"
    exit 1
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Generate auth secrets: npm run generate-secrets"
echo "2. Start development server: npm run dev"
echo "3. Visit http://localhost:3000"