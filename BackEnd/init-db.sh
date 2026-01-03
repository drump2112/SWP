#!/bin/bash

# Database initialization script

echo "🚀 Initializing Fuel Management Database..."

# Wait for postgres to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# Run migration
echo "📦 Running database migration..."
PGPASSWORD=123456 psql -h localhost -U postgres -d fuel_management -f src/migrations/001_initial.sql

echo "✅ Database initialized successfully!"
echo ""
echo "📝 Default credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🌐 Start the server with: npm run start:dev"
