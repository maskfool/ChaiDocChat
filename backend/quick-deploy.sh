#!/bin/bash

# Quick Deploy Script for ChaiDocChat Backend
# This script helps you quickly deploy to a VPS

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Configuration
VPS_IP=""
DOMAIN=""
SSH_USER="root"

# Get user input
echo -e "${BLUE}ChaiDocChat VPS Quick Deploy${NC}"
echo "=================================="
echo

read -p "Enter your VPS IP address: " VPS_IP
read -p "Enter your domain name (optional): " DOMAIN
read -p "Enter SSH user (default: root): " SSH_USER

if [[ -z "$SSH_USER" ]]; then
    SSH_USER="root"
fi

if [[ -z "$VPS_IP" ]]; then
    error "VPS IP address is required"
fi

log "Starting deployment to $VPS_IP..."

# Check if we can connect to the VPS
log "Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_USER@$VPS_IP" exit 2>/dev/null; then
    error "Cannot connect to VPS. Please check your SSH key or password."
fi

# Upload deployment script
log "Uploading deployment script..."
scp deploy.sh "$SSH_USER@$VPS_IP:/tmp/"

# Run deployment script on VPS
log "Running deployment script on VPS..."
if [[ -n "$DOMAIN" ]]; then
    ssh "$SSH_USER@$VPS_IP" "chmod +x /tmp/deploy.sh && /tmp/deploy.sh --domain $DOMAIN"
else
    ssh "$SSH_USER@$VPS_IP" "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"
fi

# Upload application files
log "Uploading application files..."
tar -czf chaidocchat-backend.tar.gz --exclude=node_modules --exclude=.git --exclude=uploads .
scp chaidocchat-backend.tar.gz "$SSH_USER@$VPS_IP:/opt/chaidocchat/"

# Extract and setup on VPS
log "Setting up application on VPS..."
ssh "$SSH_USER@$VPS_IP" << EOF
cd /opt/chaidocchat
tar -xzf chaidocchat-backend.tar.gz
rm chaidocchat-backend.tar.gz
chown -R chaidocchat:chaidocchat /opt/chaidocchat
EOF

# Setup environment
log "Setting up environment configuration..."
ssh "$SSH_USER@$VPS_IP" << EOF
cd /opt/chaidocchat
cp env.production.template .env
echo
echo "Please edit the .env file with your actual configuration:"
echo "nano /opt/chaidocchat/.env"
echo
echo "Required variables to update:"
echo "- MONGODB_URI"
echo "- MONGO_ROOT_PASSWORD"
echo "- CLERK_SECRET_KEY"
echo "- OPENAI_API_KEY"
echo "- ALLOWED_ORIGINS"
EOF

# Update nginx config if domain provided
if [[ -n "$DOMAIN" ]]; then
    log "Updating nginx configuration for domain: $DOMAIN"
    ssh "$SSH_USER@$VPS_IP" "sed -i 's/yourdomain.com/$DOMAIN/g' /opt/chaidocchat/nginx.conf"
fi

# Start services
log "Starting services..."
ssh "$SSH_USER@$VPS_IP" "systemctl start chaidocchat"

# Wait a moment for services to start
sleep 10

# Check status
log "Checking service status..."
ssh "$SSH_USER@$VPS_IP" "systemctl status chaidocchat --no-pager"

# Test health endpoint
log "Testing health endpoint..."
if [[ -n "$DOMAIN" ]]; then
    HEALTH_URL="https://$DOMAIN/health"
else
    HEALTH_URL="http://$VPS_IP/health"
fi

if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
    log "✅ Health check passed! Your application is running."
    echo
    echo -e "${BLUE}=== Deployment Complete ===${NC}"
    echo "Application URL: $HEALTH_URL"
    echo "API Base URL: ${HEALTH_URL%/health}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Update your .env file with actual API keys"
    echo "2. Set up SSL certificate with Let's Encrypt"
    echo "3. Update your frontend to use the new API URL"
    echo
    echo -e "${BLUE}Useful commands:${NC}"
    echo "View logs: ssh $SSH_USER@$VPS_IP 'journalctl -u chaidocchat -f'"
    echo "Restart: ssh $SSH_USER@$VPS_IP 'systemctl restart chaidocchat'"
    echo "Check status: ssh $SSH_USER@$VPS_IP 'systemctl status chaidocchat'"
else
    warn "Health check failed. Please check the logs:"
    echo "ssh $SSH_USER@$VPS_IP 'journalctl -u chaidocchat -f'"
fi

log "Deployment completed!"
