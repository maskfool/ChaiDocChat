#!/bin/bash

# ChaiDocChat VPS Deployment Script
# This script sets up and deploys the ChaiDocChat backend on a VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="chaidocchat"
APP_DIR="/opt/$APP_NAME"
SERVICE_USER="chaidocchat"
DOMAIN=""

# Functions
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

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

install_dependencies() {
    log "Installing system dependencies..."
    
    # Update package list
    apt-get update
    
    # Install required packages
    apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        htop \
        nano \
        certbot \
        python3-certbot-nginx
    
    log "System dependencies installed successfully"
}

install_docker() {
    log "Installing Docker and Docker Compose..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package list
    apt-get update
    
    # Install Docker
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add current user to docker group
    usermod -aG docker $USER
    
    log "Docker installed successfully"
}

create_app_user() {
    log "Creating application user..."
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -s /bin/false -d "$APP_DIR" "$SERVICE_USER"
        log "User $SERVICE_USER created"
    else
        log "User $SERVICE_USER already exists"
    fi
}

setup_app_directory() {
    log "Setting up application directory..."
    
    # Create app directory
    mkdir -p "$APP_DIR"
    
    # Set ownership
    chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"
    
    log "Application directory created at $APP_DIR"
}

configure_firewall() {
    log "Configuring firewall..."
    
    # Enable UFW
    ufw --force enable
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow Docker (if needed for external access)
    ufw allow 5001/tcp comment "ChaiDocChat API"
    
    log "Firewall configured"
}

configure_fail2ban() {
    log "Configuring Fail2Ban..."
    
    # Create custom jail for the application
    cat > /etc/fail2ban/jail.d/chaidocchat.conf << EOF
[chaidocchat-nginx]
enabled = true
port = http,https
filter = chaidocchat-nginx
logpath = /var/log/nginx/access.log
maxretry = 5
bantime = 3600
findtime = 600

[chaidocchat-api]
enabled = true
port = 5001
filter = chaidocchat-api
logpath = $APP_DIR/logs/access.log
maxretry = 10
bantime = 1800
findtime = 300
EOF

    # Create custom filters
    cat > /etc/fail2ban/filter.d/chaidocchat-nginx.conf << EOF
[Definition]
failregex = ^<HOST> -.*"(GET|POST).*" (4\d\d|5\d\d) .*$
ignoreregex =
EOF

    cat > /etc/fail2ban/filter.d/chaidocchat-api.conf << EOF
[Definition]
failregex = ^.*<HOST>.*"(GET|POST).*" (4\d\d|5\d\d) .*$
ignoreregex =
EOF

    # Restart fail2ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    log "Fail2Ban configured"
}

setup_ssl() {
    if [[ -n "$DOMAIN" ]]; then
        log "Setting up SSL certificate for domain: $DOMAIN"
        
        # Create SSL directory
        mkdir -p "$APP_DIR/ssl"
        
        # Generate self-signed certificate for initial setup
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$APP_DIR/ssl/key.pem" \
            -out "$APP_DIR/ssl/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
        
        chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/ssl"
        
        log "Self-signed SSL certificate created"
        warn "Remember to replace with a proper SSL certificate using Let's Encrypt"
    else
        log "No domain specified, skipping SSL setup"
    fi
}

create_systemd_service() {
    log "Creating systemd service..."
    
    cat > /etc/systemd/system/chaidocchat.service << EOF
[Unit]
Description=ChaiDocChat Backend Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0
User=$SERVICE_USER
Group=$SERVICE_USER

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable chaidocchat.service
    
    log "Systemd service created and enabled"
}

create_logrotate() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/chaidocchat << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_USER
    postrotate
        systemctl reload chaidocchat.service
    endscript
}
EOF

    log "Log rotation configured"
}

setup_monitoring() {
    log "Setting up basic monitoring..."
    
    # Create monitoring script
    cat > "$APP_DIR/monitor.sh" << 'EOF'
#!/bin/bash

# Simple health check script
APP_DIR="/opt/chaidocchat"
LOG_FILE="$APP_DIR/logs/health.log"

# Create logs directory if it doesn't exist
mkdir -p "$APP_DIR/logs"

# Check if services are running
check_service() {
    local service_name=$1
    local container_name=$2
    
    if docker ps --format "table {{.Names}}" | grep -q "^$container_name$"; then
        echo "$(date): $service_name is running" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): $service_name is not running" >> "$LOG_FILE"
        return 1
    fi
}

# Check all services
check_service "MongoDB" "chaidocchat-mongodb"
check_service "Qdrant" "chaidocchat-qdrant"
check_service "Backend" "chaidocchat-backend"
check_service "Nginx" "chaidocchat-nginx"

# Check API health
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "$(date): API health check passed" >> "$LOG_FILE"
else
    echo "$(date): API health check failed" >> "$LOG_FILE"
fi
EOF

    chmod +x "$APP_DIR/monitor.sh"
    chown "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/monitor.sh"
    
    # Add to crontab
    (crontab -u "$SERVICE_USER" -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/monitor.sh") | crontab -u "$SERVICE_USER" -
    
    log "Monitoring setup completed"
}

print_deployment_info() {
    log "Deployment completed successfully!"
    echo
    echo -e "${BLUE}=== Deployment Information ===${NC}"
    echo "Application Directory: $APP_DIR"
    echo "Service User: $SERVICE_USER"
    echo "Domain: ${DOMAIN:-'Not configured'}"
    echo
    echo -e "${BLUE}=== Next Steps ===${NC}"
    echo "1. Copy your application files to $APP_DIR"
    echo "2. Copy env.production.template to $APP_DIR/.env and configure it"
    echo "3. Update nginx.conf with your domain name"
    echo "4. Start the service: systemctl start chaidocchat"
    echo "5. Check status: systemctl status chaidocchat"
    echo "6. View logs: docker compose -f $APP_DIR/docker-compose.prod.yml logs"
    echo
    echo -e "${BLUE}=== Useful Commands ===${NC}"
    echo "Start service: systemctl start chaidocchat"
    echo "Stop service: systemctl stop chaidocchat"
    echo "Restart service: systemctl restart chaidocchat"
    echo "View logs: journalctl -u chaidocchat -f"
    echo "Docker logs: docker compose -f $APP_DIR/docker-compose.prod.yml logs -f"
    echo
    echo -e "${YELLOW}Remember to:${NC}"
    echo "- Configure your domain DNS to point to this server"
    echo "- Set up proper SSL certificates with Let's Encrypt"
    echo "- Update the .env file with your actual API keys"
    echo "- Test the deployment thoroughly"
}

# Main execution
main() {
    log "Starting ChaiDocChat VPS deployment..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [--domain yourdomain.com]"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    check_root
    install_dependencies
    install_docker
    create_app_user
    setup_app_directory
    configure_firewall
    configure_fail2ban
    setup_ssl
    create_systemd_service
    create_logrotate
    setup_monitoring
    print_deployment_info
}

# Run main function
main "$@"
