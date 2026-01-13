#!/bin/bash

# Script build Docker images cho deployment
# Sử dụng: ./build-images.sh [version]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VERSION=${1:-latest}
IMAGE_PREFIX="fuel-management"

echo -e "${GREEN}=== Building Docker Images ===${NC}"
echo -e "${YELLOW}Version: $VERSION${NC}"

# Build Backend
echo -e "${GREEN}Building Backend image...${NC}"
cd BackEnd
docker build -t ${IMAGE_PREFIX}-backend:${VERSION} .
docker tag ${IMAGE_PREFIX}-backend:${VERSION} ${IMAGE_PREFIX}-backend:latest
cd ..

# Build Frontend
echo -e "${GREEN}Building Frontend image...${NC}"
cd FrontEnd
docker build -t ${IMAGE_PREFIX}-frontend:${VERSION} .
docker tag ${IMAGE_PREFIX}-frontend:${VERSION} ${IMAGE_PREFIX}-frontend:latest
cd ..

echo -e "${GREEN}=== Build completed! ===${NC}"
echo ""
echo "Images created:"
echo "  - ${IMAGE_PREFIX}-backend:${VERSION}"
echo "  - ${IMAGE_PREFIX}-frontend:${VERSION}"
echo ""

# Show images
docker images | grep ${IMAGE_PREFIX}

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Save images to file:"
echo "   ./save-images.sh $VERSION"
echo ""
echo "2. Or push to Docker Hub:"
echo "   ./push-images.sh $VERSION"
