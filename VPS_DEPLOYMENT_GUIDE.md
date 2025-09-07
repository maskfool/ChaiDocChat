# ChaiDocChat VPS Deployment Guide

This guide will help you deploy your ChaiDocChat backend to a VPS to avoid Render's latency issues.

## Prerequisites

- A VPS with Ubuntu 20.04+ (recommended: Ubuntu 22.04 LTS)
- Root access to the VPS
- A domain name pointing to your VPS IP (optional but recommended)
- Your API keys (OpenAI, Clerk, etc.)

## Quick Start

### 1. Prepare Your VPS

Connect to your VPS and run the deployment script:

```bash
# Download and run the deployment script
wget https://raw.githubusercontent.com/your-repo/ChaiDocChat/main/backend/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh --domain yourdomain.com
```

### 2. Upload Your Application

```bash
# Create a tarball of your backend
cd /path/to/ChaiDocChat
tar -czf chaidocchat-backend.tar.gz backend/

# Upload to your VPS
scp chaidocchat-backend.tar.gz root@your-vps-ip:/opt/chaidocchat/

# Extract on the VPS
ssh root@your-vps-ip
cd /opt/chaidocchat
tar -xzf chaidocchat-backend.tar.gz
mv backend/* .
rm -rf backend chaidocchat-backend.tar.gz
```

### 3. Configure Environment

```bash
# Copy the environment template
cp env.production.template .env

# Edit the environment file
nano .env
```

Update the following variables in `.env`:

```bash
# Replace with your actual values
MONGODB_URI=mongodb://admin:your_secure_password@mongodb:27017/chaidocchat?authSource=admin
MONGO_ROOT_PASSWORD=your_secure_mongodb_password
CLERK_SECRET_KEY=your_clerk_secret_key
OPENAI_API_KEY=your_openai_api_key
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 4. Update Nginx Configuration

```bash
# Edit nginx configuration
nano nginx.conf
```

Replace `yourdomain.com` with your actual domain name in the nginx.conf file.

### 5. Start the Services

```bash
# Start the application
systemctl start chaidocchat

# Check status
systemctl status chaidocchat

# View logs
journalctl -u chaidocchat -f
```

## Manual Installation (Step by Step)

If you prefer to set up everything manually:

### 1. System Setup

```bash
# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw fail2ban htop nano certbot python3-certbot-nginx
```

### 2. Install Docker

```bash
# Add Docker's GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
systemctl start docker
systemctl enable docker
```

### 3. Create Application User

```bash
# Create user
useradd -r -s /bin/false -d /opt/chaidocchat chaidocchat

# Create directory
mkdir -p /opt/chaidocchat
chown -R chaidocchat:chaidocchat /opt/chaidocchat
```

### 4. Configure Firewall

```bash
# Enable UFW
ufw --force enable

# Allow necessary ports
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5001/tcp
```

### 5. Deploy Application

```bash
# Copy your application files to /opt/chaidocchat
# Configure .env file
# Update nginx.conf with your domain

# Start services
cd /opt/chaidocchat
docker compose -f docker-compose.prod.yml up -d
```

## SSL Certificate Setup

### Using Let's Encrypt (Recommended)

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
certbot renew --dry-run
```

### Manual SSL Certificate

If you have your own SSL certificate:

```bash
# Copy your certificate files
mkdir -p /opt/chaidocchat/ssl
cp your-cert.pem /opt/chaidocchat/ssl/cert.pem
cp your-key.pem /opt/chaocchat/ssl/key.pem
chown -R chaidocchat:chaidocchat /opt/chaidocchat/ssl
```

## Monitoring and Maintenance

### Health Checks

The deployment includes several health check mechanisms:

1. **Docker Health Checks**: Each container has built-in health checks
2. **API Health Endpoint**: `https://yourdomain.com/health`
3. **Monitoring Script**: Runs every 5 minutes to check service status

### Viewing Logs

```bash
# Application logs
journalctl -u chaidocchat -f

# Docker logs
docker compose -f /opt/chaidocchat/docker-compose.prod.yml logs -f

# Specific service logs
docker compose -f /opt/chaidocchat/docker-compose.prod.yml logs -f backend
docker compose -f /opt/chaidocchat/docker-compose.prod.yml logs -f mongodb
docker compose -f /opt/chaidocchat/docker-compose.prod.yml logs -f qdrant
```

### Service Management

```bash
# Start service
systemctl start chaidocchat

# Stop service
systemctl stop chaidocchat

# Restart service
systemctl restart chaidocchat

# Check status
systemctl status chaidocchat

# Enable auto-start
systemctl enable chaidocchat
```

### Updates

```bash
# Stop services
systemctl stop chaidocchat

# Backup current deployment
cp -r /opt/chaidocchat /opt/chaidocchat.backup.$(date +%Y%m%d)

# Update application files
# (Copy new files to /opt/chaidocchat)

# Rebuild and start
cd /opt/chaidocchat
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Start service
systemctl start chaidocchat
```

## Performance Optimization

### Database Optimization

The MongoDB configuration includes:
- Connection pooling
- Proper indexes
- Query optimization

### Nginx Optimization

The nginx configuration includes:
- Gzip compression
- Rate limiting
- Caching headers
- Security headers

### Resource Monitoring

```bash
# Check resource usage
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check Docker resource usage
docker stats
```

## Security Considerations

### Firewall Configuration

The deployment script configures UFW with:
- SSH access
- HTTP/HTTPS ports
- Application port (5001)

### Fail2Ban

Automatically configured to protect against:
- Brute force attacks
- API abuse
- Nginx attacks

### SSL/TLS

- TLS 1.2+ only
- Strong cipher suites
- Security headers

## Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   # Check logs
   journalctl -u chaidocchat -f
   
   # Check Docker logs
   docker compose -f /opt/chaidocchat/docker-compose.prod.yml logs
   ```

2. **Database connection issues**
   ```bash
   # Check MongoDB logs
   docker compose -f /opt/chaidocchat/docker-compose.prod.yml logs mongodb
   
   # Check connection string in .env
   cat /opt/chaidocchat/.env | grep MONGODB_URI
   ```

3. **API not responding**
   ```bash
   # Check backend logs
   docker compose -f /opt/chaidocchat/docker-compose.prod.yml logs backend
   
   # Check nginx logs
   docker compose -f /opt/chaidocchat/docker-compose.prod.yml logs nginx
   ```

4. **SSL certificate issues**
   ```bash
   # Check certificate
   openssl x509 -in /opt/chaidocchat/ssl/cert.pem -text -noout
   
   # Test SSL
   curl -I https://yourdomain.com/health
   ```

### Performance Issues

1. **High memory usage**
   - Check Docker memory limits
   - Monitor MongoDB memory usage
   - Consider increasing VPS RAM

2. **Slow responses**
   - Check database indexes
   - Monitor network latency
   - Check API rate limits

3. **File upload issues**
   - Check file size limits
   - Verify disk space
   - Check nginx upload limits

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > /opt/chaidocchat/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/chaidocchat/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MongoDB
docker exec chaidocchat-mongodb mongodump --out /backup
docker cp chaidocchat-mongodb:/backup $BACKUP_DIR/mongodb_$DATE

# Backup Qdrant
docker exec chaidocchat-qdrant tar -czf /backup/qdrant_$DATE.tar.gz /qdrant/storage
docker cp chaidocchat-qdrant:/backup/qdrant_$DATE.tar.gz $BACKUP_DIR/

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "mongodb_*" -mtime +7 -exec rm -rf {} \;
find $BACKUP_DIR -name "qdrant_*.tar.gz" -mtime +7 -exec rm -f {} \;
EOF

chmod +x /opt/chaidocchat/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -u chaidocchat -l 2>/dev/null; echo "0 2 * * * /opt/chaidocchat/backup-db.sh") | crontab -u chaidocchat -
```

### Application Backup

```bash
# Backup application files
tar -czf /opt/chaidocchat-backup-$(date +%Y%m%d).tar.gz /opt/chaidocchat
```

## Scaling Considerations

### Horizontal Scaling

For high traffic, consider:
- Load balancer (HAProxy, Nginx)
- Multiple backend instances
- Database clustering
- Redis for session storage

### Vertical Scaling

- Increase VPS resources (CPU, RAM, Storage)
- Optimize database queries
- Implement caching strategies

## Support

If you encounter issues:

1. Check the logs first
2. Verify all environment variables
3. Ensure all services are running
4. Check firewall and network configuration
5. Verify SSL certificate validity

## Cost Optimization

### VPS Recommendations

- **Minimum**: 2GB RAM, 2 CPU cores, 20GB SSD
- **Recommended**: 4GB RAM, 4 CPU cores, 50GB SSD
- **High Traffic**: 8GB+ RAM, 8+ CPU cores, 100GB+ SSD

### Resource Monitoring

Monitor your VPS resources and scale accordingly:
- CPU usage should be < 80%
- Memory usage should be < 85%
- Disk usage should be < 90%

This deployment setup will give you much better performance than Render with lower latency and more control over your infrastructure.
