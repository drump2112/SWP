#!/bin/bash

# Script để export schema từ database hiện tại
# Chạy script này TRƯỚC KHI build images

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Exporting Database Schema ===${NC}"

# Kiểm tra container có chạy không
if ! docker ps | grep -q fuel-postgres; then
    echo -e "${RED}Error: PostgreSQL container not running!${NC}"
    echo "Please start the database first:"
    echo "  docker-compose up -d postgres"
    exit 1
fi

# Export schema only (structure, no data)
echo -e "${YELLOW}Exporting schema...${NC}"
docker exec fuel-postgres pg_dump -U postgres \
  --schema-only \
  --no-owner \
  --no-privileges \
  fuel_management > BackEnd/docker-initdb/01-schema.sql

echo -e "${GREEN}✓ Schema exported to BackEnd/docker-initdb/01-schema.sql${NC}"

# Export data (optional)
read -p "Export sample data as well? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Exporting data...${NC}"
    docker exec fuel-postgres pg_dump -U postgres \
      --data-only \
      --no-owner \
      --no-privileges \
      fuel_management > BackEnd/docker-initdb/02-data.sql
    echo -e "${GREEN}✓ Data exported to BackEnd/docker-initdb/02-data.sql${NC}"
fi

echo ""
echo -e "${GREEN}=== Export completed! ===${NC}"
echo ""
echo "Files created:"
ls -lh BackEnd/docker-initdb/

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the exported SQL files"
echo "2. Build Docker images: ./build-images.sh v1.0.0"
echo "3. The schema will be automatically loaded when PostgreSQL starts"
