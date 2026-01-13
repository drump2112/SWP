#!/bin/bash

# Script deploy tự động lên server
# Sử dụng: ./deploy.sh [server-user] [server-ip]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Fuel Management System Deployment Script ===${NC}"

# Kiểm tra tham số
if [ $# -ne 2 ]; then
    echo -e "${RED}Usage: $0 <server-user> <server-ip>${NC}"
    echo "Example: $0 ubuntu 192.168.1.100"
    exit 1
fi

SERVER_USER=$1
SERVER_IP=$2
DEPLOY_PATH="/home/$SERVER_USER/fuel-management"

echo -e "${YELLOW}Server: $SERVER_USER@$SERVER_IP${NC}"
echo -e "${YELLOW}Deploy path: $DEPLOY_PATH${NC}"

# Xác nhận
read -p "Continue deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 1. Tạo archive
echo -e "${GREEN}Step 1: Creating deployment archive...${NC}"
tar -czf swp-deploy.tar.gz \
  BackEnd/ \
  FrontEnd/ \
  docker-compose.prod.yml \
  .dockerignore \
  .env.example \
  --exclude=BackEnd/node_modules \
  --exclude=FrontEnd/node_modules \
  --exclude=BackEnd/dist \
  --exclude=FrontEnd/dist \
  --exclude=.git

echo -e "${GREEN}Archive created successfully${NC}"

# 2. Upload lên server
echo -e "${GREEN}Step 2: Uploading to server...${NC}"
scp swp-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# 3. Deploy trên server
echo -e "${GREEN}Step 3: Deploying on server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'EOF'
set -e

DEPLOY_PATH="/home/$(whoami)/fuel-management"

# Tạo thư mục nếu chưa có
mkdir -p $DEPLOY_PATH

# Backup nếu đã có deployment cũ
if [ -d "$DEPLOY_PATH/BackEnd" ]; then
    echo "Backing up existing deployment..."
    tar -czf $DEPLOY_PATH/backup_$(date +%Y%m%d_%H%M%S).tar.gz \
        $DEPLOY_PATH/BackEnd \
        $DEPLOY_PATH/FrontEnd \
        $DEPLOY_PATH/docker-compose.prod.yml 2>/dev/null || true
fi

# Extract archive
cd $DEPLOY_PATH
tar -xzf /tmp/swp-deploy.tar.gz

# Tạo .env nếu chưa có
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Please edit .env file with your actual credentials!"
fi

# Cleanup
rm /tmp/swp-deploy.tar.gz

echo "Deployment files ready at: $DEPLOY_PATH"
echo ""
echo "Next steps:"
echo "1. Edit .env file: nano $DEPLOY_PATH/.env"
echo "2. Deploy: cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml up -d --build"
echo "3. Check logs: docker-compose -f docker-compose.prod.yml logs -f"
EOF

# 4. Cleanup local
rm swp-deploy.tar.gz

echo -e "${GREEN}=== Deployment completed! ===${NC}"
echo -e "${YELLOW}Next: SSH to server and start services${NC}"
echo -e "ssh $SERVER_USER@$SERVER_IP"
echo -e "cd $DEPLOY_PATH"
echo -e "nano .env  # Edit configuration"
echo -e "docker-compose -f docker-compose.prod.yml up -d --build"
