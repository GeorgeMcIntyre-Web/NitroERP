# NitroERP Modular Architecture Guide

## 🏗️ Overview

NitroERP is designed as a modular microservices architecture to provide maximum flexibility in deployment, scaling, and maintenance. Each module can be deployed independently, allowing for:

- **Selective Deployment**: Deploy only the modules you need
- **Independent Scaling**: Scale modules based on usage patterns
- **Technology Flexibility**: Use different technologies for different modules
- **Team Independence**: Different teams can work on different modules
- **Gradual Migration**: Migrate from legacy systems module by module

## 📦 Module Structure

### Core Modules (Always Required)
```
nitroerp-core/
├── auth-service/          # Authentication & Authorization
├── user-service/          # User Management
├── company-service/       # Multi-tenant Company Management
├── notification-service/  # Centralized Notifications
└── audit-service/         # Audit Trail & Compliance
```

### Business Modules (Optional)
```
nitroerp-modules/
├── financial-module/      # Financial Management
├── hr-module/            # Human Resources
├── engineering-module/    # Engineering & CAD
├── manufacturing-module/  # Manufacturing & Production
└── control-module/        # Control Systems Design
```

### Infrastructure Modules
```
nitroerp-infrastructure/
├── api-gateway/          # API Gateway & Routing
├── database-service/     # Database Management
├── cache-service/        # Redis Caching
├── file-service/         # File Storage (MinIO)
├── queue-service/        # Message Queue (RabbitMQ)
└── monitoring-service/   # Monitoring & Logging
```

## 🚀 Deployment Strategies

### 1. Monolithic Deployment (Development)
```yaml
# docker-compose.yml
version: '3.8'
services:
  nitroerp:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis
```

### 2. Modular Deployment (Production)
```yaml
# docker-compose.modular.yml
version: '3.8'
services:
  # Core Services
  auth-service:
    build: ./nitroerp-core/auth-service
    ports:
      - "3001:3001"
  
  user-service:
    build: ./nitroerp-core/user-service
    ports:
      - "3002:3002"
  
  # Business Modules
  financial-service:
    build: ./nitroerp-modules/financial-module
    ports:
      - "3010:3010"
  
  hr-service:
    build: ./nitroerp-modules/hr-module
    ports:
      - "3020:3020"
  
  # Infrastructure
  api-gateway:
    build: ./nitroerp-infrastructure/api-gateway
    ports:
      - "80:80"
      - "443:443"
```

### 3. Kubernetes Deployment
```yaml
# k8s/nitroerp-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nitroerp-core
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nitroerp-core
  template:
    metadata:
      labels:
        app: nitroerp-core
    spec:
      containers:
      - name: auth-service
        image: nitroerp/auth-service:latest
        ports:
        - containerPort: 3001
      - name: user-service
        image: nitroerp/user-service:latest
        ports:
        - containerPort: 3002
```

## 🔧 Module Configuration

### Environment Variables by Module
```bash
# Core Services
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
COMPANY_SERVICE_PORT=3003

# Business Modules
FINANCIAL_SERVICE_PORT=3010
HR_SERVICE_PORT=3020
ENGINEERING_SERVICE_PORT=3030
MANUFACTURING_SERVICE_PORT=3040

# Infrastructure
API_GATEWAY_PORT=80
DATABASE_HOST=postgres
REDIS_HOST=redis
```

### Service Discovery
```typescript
// config/service-discovery.ts
export const SERVICE_ENDPOINTS = {
  development: {
    auth: 'http://localhost:3001',
    users: 'http://localhost:3002',
    financial: 'http://localhost:3010',
    hr: 'http://localhost:3020',
  },
  production: {
    auth: 'https://auth.nitroerp.com',
    users: 'https://users.nitroerp.com',
    financial: 'https://financial.nitroerp.com',
    hr: 'https://hr.nitroerp.com',
  }
};
```

## 📊 Database Schema by Module

### Core Schema (Shared)
```sql
-- Core tables used by all modules
CREATE SCHEMA core;
CREATE TABLE core.companies (...);
CREATE TABLE core.users (...);
CREATE TABLE core.departments (...);
CREATE TABLE core.roles (...);
CREATE TABLE core.permissions (...);
```

### Module-Specific Schemas
```sql
-- Financial Module
CREATE SCHEMA financial;
CREATE TABLE financial.chart_of_accounts (...);
CREATE TABLE financial.general_ledger (...);

-- HR Module
CREATE SCHEMA hr;
CREATE TABLE hr.employees (...);
CREATE TABLE hr.leave_requests (...);

-- Engineering Module
CREATE SCHEMA engineering;
CREATE TABLE engineering.projects (...);
CREATE TABLE engineering.cad_files (...);
```

## 🔌 Module Communication

### 1. HTTP/REST API
```typescript
// Inter-module communication
class FinancialService {
  async getUserInfo(userId: string) {
    const response = await fetch(`${SERVICE_ENDPOINTS.users}/users/${userId}`);
    return response.json();
  }
}
```

### 2. Message Queue (RabbitMQ)
```typescript
// Event-driven communication
class UserService {
  async userCreated(user: User) {
    await this.publish('user.created', {
      userId: user.id,
      email: user.email,
      companyId: user.companyId
    });
  }
}

class FinancialService {
  async handleUserCreated(event: UserCreatedEvent) {
    // Create default accounts for new user
    await this.createDefaultAccounts(event.userId, event.companyId);
  }
}
```

### 3. Shared Database (PostgreSQL)
```typescript
// Direct database access for related data
class EngineeringService {
  async getProjectWithUsers(projectId: string) {
    return await db('engineering.projects')
      .join('core.users', 'projects.created_by', 'users.id')
      .where('projects.id', projectId)
      .first();
  }
}
```

## 🚀 Deployment Benefits

### 1. **Selective Deployment**
```bash
# Deploy only Financial and HR modules
docker-compose up financial-service hr-service

# Deploy full system
docker-compose up -d
```

### 2. **Independent Scaling**
```bash
# Scale Financial module for month-end processing
kubectl scale deployment financial-service --replicas=5

# Scale HR module for payroll processing
kubectl scale deployment hr-service --replicas=3
```

### 3. **Technology Flexibility**
```yaml
# Use Node.js for most services
auth-service:
  build: ./auth-service
  image: node:18-alpine

# Use Python for data processing
analytics-service:
  build: ./analytics-service
  image: python:3.11-slim

# Use Go for high-performance services
file-service:
  build: ./file-service
  image: golang:1.21-alpine
```

### 4. **Team Independence**
```bash
# Team A works on Financial module
cd nitroerp-modules/financial-module
npm run dev

# Team B works on HR module
cd nitroerp-modules/hr-module
npm run dev

# No conflicts, independent development
```

## 🔄 Migration Strategy

### Phase 1: Core Infrastructure
1. Deploy API Gateway
2. Deploy Core Services (Auth, Users, Companies)
3. Set up monitoring and logging

### Phase 2: Business Modules
1. Deploy Financial Module
2. Deploy HR Module
3. Deploy Engineering Module
4. Deploy Manufacturing Module

### Phase 3: Advanced Features
1. Deploy Control Systems Module
2. Set up advanced analytics
3. Implement AI/ML features

## 📈 Scaling Considerations

### Horizontal Scaling
```yaml
# Scale services based on load
services:
  financial-service:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Database Scaling
```yaml
# Read replicas for heavy modules
services:
  financial-db-read:
    image: postgres:15
    environment:
      POSTGRES_DB: nitroerp_financial
    deploy:
      replicas: 2
```

### Caching Strategy
```yaml
# Module-specific caching
services:
  financial-cache:
    image: redis:7-alpine
    ports:
      - "6380:6379"
  
  hr-cache:
    image: redis:7-alpine
    ports:
      - "6381:6379"
```

## 🔒 Security by Module

### Service-to-Service Authentication
```typescript
// JWT tokens for inter-service communication
class ServiceAuth {
  async validateServiceToken(token: string) {
    const decoded = jwt.verify(token, process.env.SERVICE_SECRET);
    return decoded.service === 'financial';
  }
}
```

### Network Security
```yaml
# Docker networks for module isolation
networks:
  core-network:
    driver: bridge
  financial-network:
    driver: bridge
  hr-network:
    driver: bridge
```

## 📊 Monitoring by Module

### Module-Specific Metrics
```typescript
// Financial module metrics
class FinancialMetrics {
  recordTransaction(amount: number) {
    this.metrics.increment('financial.transactions.total');
    this.metrics.histogram('financial.transactions.amount', amount);
  }
}
```

### Centralized Logging
```yaml
# ELK Stack for all modules
services:
  elasticsearch:
    image: elasticsearch:8.8.0
  
  logstash:
    image: logstash:8.8.0
  
  kibana:
    image: kibana:8.8.0
```

## 🎯 Benefits Summary

### For Development
- **Faster Development**: Teams work independently
- **Easier Testing**: Test modules in isolation
- **Better Code Organization**: Clear module boundaries
- **Technology Choice**: Use best tool for each module

### For Deployment
- **Flexible Deployment**: Deploy what you need
- **Independent Scaling**: Scale based on usage
- **Easier Maintenance**: Update modules independently
- **Better Resource Utilization**: Allocate resources efficiently

### For Business
- **Gradual Migration**: Migrate from legacy systems
- **Cost Optimization**: Pay for what you use
- **Risk Mitigation**: Isolate failures to modules
- **Future-Proof**: Easy to add new modules

This modular architecture makes NitroERP highly flexible and suitable for various deployment scenarios, from small companies to large enterprises. 