#!/bin/bash

# Script push Docker images lên Docker Hub
# Yêu cầu: docker login trước
# Sử dụng: ./push-images.sh [dockerhub-username] [version]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ $# -lt 1 ]; then
    echo -e "${RED}Usage: $0 <dockerhub-username> [version]${NC}"
    echo "Example: $0 myusername v1.0.0"
    exit 1
fi

DOCKER_USERNAME=$1
VERSION=${2:-latest}
IMAGE_PREFIX="fuel-management"

echo -e "${GREEN}=== Pushing Docker Images to Docker Hub ===${NC}"
echo -e "${YELLOW}Username: $DOCKER_USERNAME${NC}"
echo -e "${YELLOW}Version: $VERSION${NC}"

# Kiểm tra đã login chưa
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}Please login to Docker Hub first:${NC}"
    docker login
fi

# Tag và Push Backend
echo -e "${GREEN}Pushing backend image...${NC}"
docker tag ${IMAGE_PREFIX}-backend:${VERSION} ${DOCKER_USERNAME}/${IMAGE_PREFIX}-backend:${VERSION}
docker tag ${IMAGE_PREFIX}-backend:${VERSION} ${DOCKER_USERNAME}/${IMAGE_PREFIX}-backend:latest
docker push ${DOCKER_USERNAME}/${IMAGE_PREFIX}-backend:${VERSION}
docker push ${DOCKER_USERNAME}/${IMAGE_PREFIX}-backend:latest

# Tag và Push Frontend
echo -e "${GREEN}Pushing frontend image...${NC}"
docker tag ${IMAGE_PREFIX}-frontend:${VERSION} ${DOCKER_USERNAME}/${IMAGE_PREFIX}-frontend:${VERSION}
docker tag ${IMAGE_PREFIX}-frontend:${VERSION} ${DOCKER_USERNAME}/${IMAGE_PREFIX}-frontend:latest
docker push ${DOCKER_USERNAME}/${IMAGE_PREFIX}-frontend:${VERSION}
docker push ${DOCKER_USERNAME}/${IMAGE_PREFIX}-frontend:latest

echo -e "${GREEN}=== Push completed! ===${NC}"
echo ""
echo "Images pushed to Docker Hub:"
echo "  - ${DOCKER_USERNAME}/${IMAGE_PREFIX}-backend:${VERSION}"
echo "  - ${DOCKER_USERNAME}/${IMAGE_PREFIX}-frontend:${VERSION}"
echo ""
echo -e "${YELLOW}Share with your colleague:${NC}"
echo "docker pull ${DOCKER_USERNAME}/${IMAGE_PREFIX}-backend:${VERSION}"
echo "docker pull ${DOCKER_USERNAME}/${IMAGE_PREFIX}-frontend:${VERSION}"
echo ""
echo "Or share docker-compose file with images already configured."
