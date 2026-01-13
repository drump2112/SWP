#!/bin/bash

# Script load Docker images từ file
# Sử dụng trên máy của đồng nghiệp để load images
# Sử dụng: ./load-images.sh [version]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

VERSION=${1:-latest}
IMAGE_DIR="docker-images"

echo -e "${GREEN}=== Loading Docker Images ===${NC}"

# Kiểm tra thư mục
if [ ! -d "$IMAGE_DIR" ]; then
    echo -e "${RED}Error: Directory $IMAGE_DIR not found!${NC}"
    echo "Please extract the images first."
    exit 1
fi

# Load Backend
if [ -f "${IMAGE_DIR}/backend-${VERSION}.tar.gz" ]; then
    echo -e "${GREEN}Loading backend image...${NC}"
    gunzip -c ${IMAGE_DIR}/backend-${VERSION}.tar.gz | docker load
else
    echo -e "${RED}Warning: backend-${VERSION}.tar.gz not found${NC}"
fi

# Load Frontend
if [ -f "${IMAGE_DIR}/frontend-${VERSION}.tar.gz" ]; then
    echo -e "${GREEN}Loading frontend image...${NC}"
    gunzip -c ${IMAGE_DIR}/frontend-${VERSION}.tar.gz | docker load
else
    echo -e "${RED}Warning: frontend-${VERSION}.tar.gz not found${NC}"
fi

# Load Postgres
if [ -f "${IMAGE_DIR}/postgres-15.tar.gz" ]; then
    echo -e "${GREEN}Loading postgres image...${NC}"
    gunzip -c ${IMAGE_DIR}/postgres-15.tar.gz | docker load
else
    echo -e "${RED}Warning: postgres-15.tar.gz not found${NC}"
fi

echo -e "${GREEN}=== Load completed! ===${NC}"
echo ""
echo "Loaded images:"
docker images | grep -E "fuel-management|postgres"

echo ""
echo -e "${YELLOW}Next step: Start the application${NC}"
echo "docker-compose -f docker-compose.images.yml up -d"
