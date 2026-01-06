#!/bin/bash

# Test API endpoints
echo "🔍 Testing Backend API..."

BASE_URL="http://localhost:8080/api"

# Test health
echo -e "\n1. Testing server health..."
curl -s "$BASE_URL" || echo "❌ Server not responding"

# Test stores (without auth to see error)
echo -e "\n\n2. Testing /stores endpoint..."
curl -s "$BASE_URL/stores"

# Test products
echo -e "\n\n3. Testing /products endpoint..."
curl -s "$BASE_URL/products"

echo -e "\n\n✅ Done!"
echo -e "\nℹ️  If you see 401 Unauthorized, you need to login first."
echo -e "ℹ️  If you see 'Connection refused', backend is not running."
