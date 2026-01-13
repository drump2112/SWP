#!/bin/bash

# Script export Docker images thành file để gửi cho người khác
# Sử dụng: ./save-images.sh [version]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VERSION=${1:-latest}
IMAGE_PREFIX="fuel-management"
OUTPUT_DIR="docker-images"

echo -e "${GREEN}=== Saving Docker Images to Files ===${NC}"

# Tạo thư mục output
mkdir -p ${OUTPUT_DIR}

# Save Backend Image
echo -e "${GREEN}Saving backend image...${NC}"
docker save ${IMAGE_PREFIX}-backend:${VERSION} | gzip > ${OUTPUT_DIR}/backend-${VERSION}.tar.gz

# Save Frontend Image
echo -e "${GREEN}Saving frontend image...${NC}"
docker save ${IMAGE_PREFIX}-frontend:${VERSION} | gzip > ${OUTPUT_DIR}/frontend-${VERSION}.tar.gz

# Save Postgres Image (nếu cần)
echo -e "${GREEN}Saving postgres image...${NC}"
docker pull postgres:15
docker save postgres:15 | gzip > ${OUTPUT_DIR}/postgres-15.tar.gz

echo -e "${GREEN}=== Save completed! ===${NC}"
echo ""
echo "Files created in ${OUTPUT_DIR}/:"
ls -lh ${OUTPUT_DIR}/

echo ""
echo -e "${YELLOW}File sizes:${NC}"
du -sh ${OUTPUT_DIR}/*

echo ""
echo -e "${YELLOW}Gửi các file này cho đồng nghiệp:${NC}"
echo "  - ${OUTPUT_DIR}/backend-${VERSION}.tar.gz"
echo "  - ${OUTPUT_DIR}/frontend-${VERSION}.tar.gz"
echo "  - ${OUTPUT_DIR}/postgres-15.tar.gz"
echo "  - docker-compose.images.yml"
echo "  - BackEnd/docker-initdb/ (schema files)"
echo ""
echo -e "${YELLOW}Hoặc tạo 1 file duy nhất:${NC}"
echo "tar -czf fuel-management-images-${VERSION}.tar.gz ${OUTPUT_DIR}/ docker-compose.images.yml BackEnd/docker-initdb/ load-images.sh .env.example"
