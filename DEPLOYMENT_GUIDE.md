# NitroERP Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for development)
- PostgreSQL 15+ (for production)
- Redis 7+ (for caching)
- At least 4GB RAM and 2 CPU cores

### 1. Development Deployment (All Modules)

```bash
# Clone the repository
git clone https://github.com/GeorgeMcIntyre-Web/NitroERP.git
cd NitroERP

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Deploy all modules
./scripts/deploy-modules.sh all

# Or use Docker Compose directly
docker-compose -f docker-compose.modular.yml up -d
```

### 2. Production Deployment (Selective Modules)

```bash
# Deploy core services only
./scripts/deploy-modules.sh -e prod core

# Deploy specific business modules
./scripts/deploy-modules.sh -e prod financial hr

# Deploy with custom scaling
./scripts/deploy-modules.sh -e prod --scale financial-service=3 financial
```

## 📦 Deployment Options

### Option 1: Docker Compose (Recommended for Development)

**Advantages:**
- Easy to set up and manage
- Good for development and testing
- All services in one place
- Easy debugging

**Use Cases:**
- Development environment
- Testing and staging
- Small to medium companies
- Proof of concept

```bash
# Deploy core + financial module
docker-compose -f docker-compose.modular.yml --profile financial up -d

# Deploy core + HR module
docker-compose -f docker-compose.modular.yml --profile hr up -d

# Deploy all modules
docker-compose -f docker-compose.modular.yml --profile financial --profile hr --profile engineering --profile manufacturing up -d
```

### Option 2: Kubernetes (Recommended for Production)

**Advantages:**
- High availability and scalability
- Automatic failover and recovery
- Advanced monitoring and logging
- Production-grade security

**Use Cases:**
- Large enterprises
- High availability requirements
- Multi-region deployment
- Production environments

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/nitroerp-deployment.yaml

# Deploy specific modules
kubectl apply -f k8s/modules/financial-module.yaml
kubectl apply -f k8s/modules/hr-module.yaml

# Scale modules
kubectl scale deployment nitroerp-financial-service --replicas=5
```

### Option 3: Cloud Platforms

**AWS ECS/Fargate:**
```bash
# Deploy using AWS CLI
aws ecs create-cluster --cluster-name nitroerp
aws ecs register-task-definition --cli-input-json file://aws/task-definition.json
aws ecs create-service --cluster nitroerp --service-name nitroerp-core --task-definition nitroerp:1
```

**Azure Container Instances:**
```bash
# Deploy using Azure CLI
az group create --name nitroerp-rg --location eastus
az container create --resource-group nitroerp-rg --name nitroerp-core --image nitroerp/core:latest
```

## 🏗️ Module Deployment Strategies

### Strategy 1: Core-First Deployment

**Phase 1: Core Infrastructure**
```bash
# Deploy infrastructure services
docker-compose -f docker-compose.modular.yml up -d postgres redis rabbitmq minio

# Deploy core services
docker-compose -f docker-compose.modular.yml up -d api-gateway auth-service user-service company-service
```

**Phase 2: Business Modules**
```bash
# Deploy financial module
docker-compose -f docker-compose.modular.yml --profile financial up -d

# Deploy HR module
docker-compose -f docker-compose.modular.yml --profile hr up -d

# Deploy engineering module
docker-compose -f docker-compose.modular.yml --profile engineering up -d
```

### Strategy 2: Department-Based Deployment

**Finance Department:**
```bash
./scripts/deploy-modules.sh financial
```

**HR Department:**
```bash
./scripts/deploy-modules.sh hr
```

**Engineering Department:**
```bash
./scripts/deploy-modules.sh engineering
```

**Manufacturing Department:**
```bash
./scripts/deploy-modules.sh manufacturing
```

### Strategy 3: Gradual Migration

**Week 1: Core Services**
```bash
# Deploy core services and migrate users
./scripts/deploy-modules.sh core
```

**Week 2: Financial Module**
```bash
# Deploy financial module and migrate financial data
./scripts/deploy-modules.sh financial
```

**Week 3: HR Module**
```bash
# Deploy HR module and migrate employee data
./scripts/deploy-modules.sh hr
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nitroerp
DB_USER=nitroerp_user
DB_PASSWORD=your-secure-password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# External APIs
SARB_API_URL=https://www.resbank.co.za/api/exchangerates
ECB_API_URL=https://api.exchangerate.host/latest

# File Storage
MINIO_ACCESS_KEY=nitroerp
MINIO_SECRET_KEY=your-minio-secret

# Message Queue
RABBITMQ_USER=nitroerp
RABBITMQ_PASSWORD=your-rabbitmq-password
```

### Module-Specific Configuration

**Financial Module:**
```bash
# Exchange rate update frequency (minutes)
EXCHANGE_RATE_UPDATE_INTERVAL=60

# Currency conversion precision
CURRENCY_PRECISION=2

# Default fiscal year
DEFAULT_FISCAL_YEAR=2024
```

**HR Module:**
```bash
# Leave calculation method
LEAVE_CALCULATION_METHOD=WORKING_DAYS

# Default working hours per day
DEFAULT_WORKING_HOURS=8

# Payroll processing day
PAYROLL_PROCESSING_DAY=25
```

**Engineering Module:**
```bash
# CAD file upload size limit (MB)
MAX_CAD_FILE_SIZE=100

# Supported CAD formats
SUPPORTED_CAD_FORMATS=SOLIDWORKS,AUTOCAD,INVENTOR,STEP,IGES

# BOM template directory
BOM_TEMPLATE_DIR=/templates/bom
```

## 📊 Scaling Strategies

### Horizontal Scaling

**Docker Compose:**
```bash
# Scale financial service to 3 instances
docker-compose -f docker-compose.modular.yml up -d --scale financial-service=3

# Scale HR service to 2 instances
docker-compose -f docker-compose.modular.yml up -d --scale hr-service=2
```

**Kubernetes:**
```bash
# Scale using kubectl
kubectl scale deployment nitroerp-financial-service --replicas=5

# Scale using HPA (Horizontal Pod Autoscaler)
kubectl apply -f k8s/hpa/financial-service-hpa.yaml
```

### Resource Allocation

**Development Environment:**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Production Environment:**
```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

## 🔒 Security Configuration

### Network Security

**Docker Networks:**
```yaml
networks:
  nitroerp-core:
    driver: bridge
  nitroerp-business:
    driver: bridge
  nitroerp-infrastructure:
    driver: bridge
```

**Kubernetes Network Policies:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: nitroerp-network-policy
spec:
  podSelector:
    matchLabels:
      app: nitroerp
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: nitroerp
```

### SSL/TLS Configuration

**Docker Compose:**
```yaml
services:
  api-gateway:
    environment:
      - SSL_CERT_PATH=/etc/ssl/certs/nitroerp.crt
      - SSL_KEY_PATH=/etc/ssl/private/nitroerp.key
    volumes:
      - ./ssl:/etc/ssl
```

**Kubernetes Ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - nitroerp.yourdomain.com
    secretName: nitroerp-tls
```

## 📈 Monitoring and Logging

### Prometheus Monitoring

**Deploy Prometheus:**
```bash
# Deploy monitoring stack
./scripts/deploy-modules.sh monitoring

# Or manually
docker-compose -f docker-compose.modular.yml --profile monitoring up -d
```

**Access Monitoring:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

### Logging Configuration

**Centralized Logging:**
```yaml
services:
  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
```

**Log Aggregation:**
```bash
# View logs for specific module
docker-compose -f docker-compose.modular.yml logs financial-service

# View logs for all services
docker-compose -f docker-compose.modular.yml logs -f
```

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Issues:**
```bash
# Check database status
docker-compose -f docker-compose.modular.yml ps postgres

# Check database logs
docker-compose -f docker-compose.modular.yml logs postgres

# Connect to database
docker-compose -f docker-compose.modular.yml exec postgres psql -U nitroerp_user -d nitroerp
```

**2. Service Health Checks:**
```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3010/health

# Check all services
./scripts/health-check.sh
```

**3. Resource Issues:**
```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Check memory usage
free -h
```

### Performance Optimization

**Database Optimization:**
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_general_ledger_company_date ON general_ledger(company_id, transaction_date);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

**Caching Strategy:**
```bash
# Configure Redis for better performance
docker-compose -f docker-compose.modular.yml exec redis redis-cli CONFIG SET maxmemory 1gb
docker-compose -f docker-compose.modular.yml exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## 🔄 Backup and Recovery

### Database Backup

**Automated Backup:**
```bash
# Create backup script
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.modular.yml exec postgres pg_dump -U nitroerp_user nitroerp > backup_$DATE.sql
EOF

# Make executable
chmod +x scripts/backup.sh

# Schedule daily backup
crontab -e
# Add: 0 2 * * * /path/to/NitroERP/scripts/backup.sh
```

**Restore Database:**
```bash
# Restore from backup
docker-compose -f docker-compose.modular.yml exec -T postgres psql -U nitroerp_user -d nitroerp < backup_20240101_020000.sql
```

### File Storage Backup

**MinIO Backup:**
```bash
# Backup MinIO data
docker-compose -f docker-compose.modular.yml exec minio mc mirror /data /backup

# Restore MinIO data
docker-compose -f docker-compose.modular.yml exec minio mc mirror /backup /data
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database schema created
- [ ] SSL certificates obtained
- [ ] Domain names configured
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Security policies reviewed

### Deployment
- [ ] Core services deployed
- [ ] Database migrations run
- [ ] Initial data seeded
- [ ] Business modules deployed
- [ ] Health checks passed
- [ ] SSL certificates installed
- [ ] Monitoring alerts configured

### Post-Deployment
- [ ] User access tested
- [ ] Data migration verified
- [ ] Performance benchmarks run
- [ ] Backup tested
- [ ] Documentation updated
- [ ] Team training completed

## 🎯 Best Practices

### 1. **Start Small**
- Deploy core services first
- Add modules gradually
- Test thoroughly before adding new modules

### 2. **Monitor Everything**
- Set up comprehensive monitoring
- Configure alerts for critical issues
- Monitor performance metrics

### 3. **Plan for Scale**
- Use horizontal scaling
- Implement caching strategies
- Optimize database queries

### 4. **Security First**
- Use strong passwords
- Enable SSL/TLS
- Implement network policies
- Regular security updates

### 5. **Backup Regularly**
- Automated daily backups
- Test restore procedures
- Store backups securely

This modular deployment approach gives you maximum flexibility to deploy only what you need, when you need it, and scale according to your requirements. 