# NitroERP Directory Structure Guide

## 🏗️ Project Structure Best Practices

### Root Directory Structure
```
NitroERP/
├── 📁 src/                          # Source code
├── 📁 docs/                         # Documentation
├── 📁 tests/                        # Test files
├── 📁 scripts/                      # Build and utility scripts
├── 📁 config/                       # Configuration files
├── 📁 logs/                         # Application logs
├── 📁 uploads/                      # File uploads
├── 📁 .github/                      # GitHub workflows
├── 📁 .vscode/                      # VS Code settings
├── 📄 .gitignore                    # Git ignore rules
├── 📄 .env.example                  # Environment template
├── 📄 package.json                  # Dependencies and scripts
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 README.md                     # Project overview
└── 📄 DIRECTORY_STRUCTURE_GUIDE.md  # This file
```

## 📁 Source Code Structure (`src/`)

### Core Application Structure
```
src/
├── 📁 server/                       # Server entry point
│   └── index.ts                     # Main server file
├── 📁 controllers/                  # Business logic controllers
│   ├── auth.ts                      # Authentication controller
│   ├── financial.ts                 # Financial module controller
│   ├── hr.ts                        # HR module controller
│   ├── engineering.ts               # Engineering module controller
│   ├── manufacturing.ts             # Manufacturing module controller
│   └── control.ts                   # Control systems controller
├── 📁 routes/                       # API route definitions
│   ├── auth.ts                      # Authentication routes
│   ├── financial.ts                 # Financial routes
│   ├── hr.ts                        # HR routes
│   ├── engineering.ts               # Engineering routes
│   ├── manufacturing.ts             # Manufacturing routes
│   ├── control.ts                   # Control systems routes
│   └── users.ts                     # User management routes
├── 📁 middleware/                   # Express middleware
│   ├── auth.ts                      # Authentication middleware
│   ├── validation.ts                # Request validation
│   ├── errorHandler.ts              # Error handling
│   ├── rateLimiter.ts               # Rate limiting
│   └── cors.ts                      # CORS configuration
├── 📁 services/                     # Business services
│   ├── database.ts                  # Database connection
│   ├── email.ts                     # Email service
│   ├── socket.ts                    # WebSocket service
│   ├── currency.ts                  # Currency conversion
│   ├── approval.ts                  # Approval workflow
│   └── notification.ts              # Notification service
├── 📁 models/                       # Data models
│   ├── User.ts                      # User model
│   ├── Account.ts                   # Financial account model
│   ├── BOM.ts                       # Bill of materials model
│   ├── WorkOrder.ts                 # Work order model
│   └── Transaction.ts               # Transaction model
├── 📁 types/                        # TypeScript type definitions
│   ├── index.ts                     # Main types export
│   ├── auth.ts                      # Authentication types
│   ├── financial.ts                 # Financial types
│   ├── hr.ts                        # HR types
│   ├── engineering.ts               # Engineering types
│   └── manufacturing.ts             # Manufacturing types
├── 📁 utils/                        # Utility functions
│   ├── logger.ts                    # Logging utility
│   ├── validation.ts                # Validation helpers
│   ├── encryption.ts                # Encryption utilities
│   ├── dateUtils.ts                 # Date manipulation
│   └── currencyUtils.ts             # Currency utilities
└── 📁 database/                     # Database related files
    ├── 📁 migrations/               # Database migrations
    │   ├── 001_create_users_table.ts
    │   ├── 002_create_audit_logs_table.ts
    │   ├── 003_create_notifications_table.ts
    │   ├── 004_create_chat_messages_table.ts
    │   ├── 005_create_announcements_table.ts
    │   ├── 006_create_refresh_tokens_table.ts
    │   └── 007_create_user_sessions_table.ts
    └── 📁 seeds/                    # Database seed data
        └── 001_initial_data.ts
```

## 📁 Documentation Structure (`docs/`)

```
docs/
├── 📁 api/                          # API documentation
│   ├── authentication.md            # Auth API docs
│   ├── financial.md                 # Financial API docs
│   ├── hr.md                        # HR API docs
│   ├── engineering.md               # Engineering API docs
│   ├── manufacturing.md             # Manufacturing API docs
│   └── control.md                   # Control systems API docs
├── 📁 architecture/                 # Architecture documentation
│   ├── overview.md                  # System overview
│   ├── database-schema.md           # Database design
│   ├── api-design.md                # API design principles
│   └── security.md                  # Security architecture
├── 📁 deployment/                   # Deployment guides
│   ├── local-setup.md               # Local development setup
│   ├── production-deployment.md     # Production deployment
│   ├── docker-setup.md              # Docker configuration
│   └── kubernetes-setup.md          # Kubernetes deployment
├── 📁 user-guides/                  # User documentation
│   ├── getting-started.md           # Getting started guide
│   ├── financial-module.md          # Financial module guide
│   ├── hr-module.md                 # HR module guide
│   ├── engineering-module.md        # Engineering module guide
│   └── manufacturing-module.md      # Manufacturing module guide
└── 📁 development/                  # Development guides
    ├── coding-standards.md          # Coding standards
    ├── testing-guide.md             # Testing guidelines
    ├── git-workflow.md              # Git workflow
    └── troubleshooting.md           # Common issues
```

## 📁 Test Structure (`tests/`)

```
tests/
├── 📁 unit/                         # Unit tests
│   ├── 📁 controllers/              # Controller tests
│   ├── 📁 services/                 # Service tests
│   ├── 📁 models/                   # Model tests
│   └── 📁 utils/                    # Utility tests
├── 📁 integration/                  # Integration tests
│   ├── 📁 api/                      # API integration tests
│   ├── 📁 database/                 # Database integration tests
│   └── 📁 services/                 # Service integration tests
├── 📁 e2e/                          # End-to-end tests
│   ├── 📁 workflows/                # Business workflow tests
│   ├── 📁 user-journeys/            # User journey tests
│   └── 📁 performance/              # Performance tests
├── 📁 fixtures/                     # Test data
│   ├── users.json                   # User test data
│   ├── financial.json               # Financial test data
│   └── manufacturing.json           # Manufacturing test data
└── 📁 mocks/                        # Mock data and services
    ├── database.ts                  # Database mocks
    ├── email.ts                     # Email service mocks
    └── external-apis.ts             # External API mocks
```

## 📁 Configuration Structure (`config/`)

```
config/
├── database.ts                      # Database configuration
├── email.ts                         # Email configuration
├── redis.ts                         # Redis configuration
├── jwt.ts                           # JWT configuration
├── cors.ts                          # CORS configuration
├── rateLimit.ts                     # Rate limiting configuration
├── logging.ts                       # Logging configuration
└── environment.ts                   # Environment variables
```

## 📁 Scripts Structure (`scripts/`)

```
scripts/
├── setup.js                         # Initial project setup
├── build.js                         # Build script
├── deploy.js                        # Deployment script
├── seed.js                          # Database seeding
├── migrate.js                       # Database migration
├── test.js                          # Test runner
└── lint.js                          # Linting script
```

## 📁 Frontend Structure (Future)

```
client/
├── 📁 public/                       # Static assets
│   ├── index.html                   # Main HTML file
│   ├── favicon.ico                  # Favicon
│   └── 📁 assets/                   # Images, fonts, etc.
├── 📁 src/                          # React source code
│   ├── 📁 components/               # React components
│   │   ├── 📁 common/               # Shared components
│   │   ├── 📁 financial/            # Financial module components
│   │   ├── 📁 hr/                   # HR module components
│   │   ├── 📁 engineering/          # Engineering module components
│   │   └── 📁 manufacturing/        # Manufacturing module components
│   ├── 📁 pages/                    # Page components
│   ├── 📁 hooks/                    # Custom React hooks
│   ├── 📁 services/                 # API services
│   ├── 📁 utils/                    # Utility functions
│   ├── 📁 types/                    # TypeScript types
│   ├── 📁 styles/                   # CSS/SCSS files
│   ├── App.tsx                      # Main App component
│   └── index.tsx                    # Entry point
├── package.json                     # Frontend dependencies
├── tsconfig.json                    # Frontend TypeScript config
└── vite.config.ts                   # Vite configuration
```

## 📁 Infrastructure Structure (Future)

```
infrastructure/
├── 📁 docker/                       # Docker configurations
│   ├── Dockerfile                   # Main Dockerfile
│   ├── docker-compose.yml           # Development environment
│   └── docker-compose.prod.yml      # Production environment
├── 📁 kubernetes/                   # Kubernetes manifests
│   ├── 📁 production/               # Production K8s configs
│   ├── 📁 staging/                  # Staging K8s configs
│   └── 📁 development/              # Development K8s configs
├── 📁 terraform/                    # Infrastructure as Code
│   ├── main.tf                      # Main Terraform config
│   ├── variables.tf                 # Terraform variables
│   └── outputs.tf                   # Terraform outputs
└── 📁 monitoring/                   # Monitoring configurations
    ├── prometheus.yml               # Prometheus config
    ├── grafana/                     # Grafana dashboards
    └── alertmanager.yml             # Alert manager config
```

## 📋 Naming Conventions

### Files and Directories
- **Directories**: Use kebab-case (e.g., `user-management/`)
- **Files**: Use kebab-case for non-code files, camelCase for code files
- **Components**: Use PascalCase (e.g., `UserProfile.tsx`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS`)
- **Variables/Functions**: Use camelCase (e.g., `getUserData`)

### Database
- **Tables**: Use snake_case (e.g., `user_profiles`)
- **Columns**: Use snake_case (e.g., `created_at`)
- **Indexes**: Use descriptive names (e.g., `idx_users_email`)

### API Endpoints
- **RESTful**: Use kebab-case (e.g., `/api/v1/user-profiles`)
- **Query Parameters**: Use camelCase (e.g., `?pageSize=10`)

## 🔧 File Organization Rules

### 1. **Single Responsibility Principle**
- Each file should have one clear purpose
- Keep files focused and manageable (max 300-500 lines)
- Split large files into smaller, focused modules

### 2. **Import/Export Organization**
```typescript
// 1. External libraries
import express from 'express';
import { Router } from 'express';

// 2. Internal modules (absolute imports)
import { UserService } from '@/services/UserService';
import { AuthMiddleware } from '@/middleware/auth';

// 3. Relative imports
import { UserController } from './UserController';

// 4. Type imports
import type { User, CreateUserRequest } from '@/types/user';
```

### 3. **Module Structure**
```typescript
// 1. Imports
import { ... } from '...';

// 2. Type definitions
interface UserControllerInterface {
  // ...
}

// 3. Constants
const USER_ENDPOINTS = {
  // ...
};

// 4. Class/Function definitions
export class UserController implements UserControllerInterface {
  // ...
}

// 5. Default exports
export default UserController;
```

### 4. **Directory Depth Guidelines**
- Keep directory depth to maximum 4-5 levels
- Use index files for clean imports
- Group related functionality together

## 📝 Documentation Standards

### 1. **README Files**
- Every directory should have a README.md if it contains multiple files
- Explain the purpose and contents of the directory
- Include usage examples where appropriate

### 2. **Code Documentation**
- Use JSDoc for all public functions and classes
- Include parameter types, return types, and examples
- Document complex business logic with inline comments

### 3. **API Documentation**
- Use OpenAPI/Swagger for API documentation
- Include request/response examples
- Document error codes and messages

## 🧪 Testing Structure

### 1. **Test File Naming**
- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### 2. **Test Organization**
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user successfully', () => {
      // Test implementation
    });

    it('should throw error for invalid email', () => {
      // Test implementation
    });
  });
});
```

## 🔒 Security Considerations

### 1. **Sensitive Files**
- Never commit `.env` files
- Use `.env.example` for templates
- Keep secrets in environment variables
- Use `.gitignore` for sensitive directories

### 2. **Access Control**
- Implement proper file permissions
- Use environment-specific configurations
- Validate all user inputs
- Sanitize file uploads

## 🚀 Deployment Considerations

### 1. **Environment-Specific Configs**
- Use different configs for dev/staging/prod
- Keep environment variables secure
- Use configuration management tools

### 2. **Build Optimization**
- Separate build artifacts from source code
- Use proper caching strategies
- Optimize bundle sizes
- Implement proper error handling

## 📊 Monitoring and Logging

### 1. **Log Structure**
```
logs/
├── application.log                  # Application logs
├── error.log                        # Error logs
├── access.log                       # Access logs
└── audit.log                        # Audit trail logs
```

### 2. **Log Format**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "User created successfully",
  "userId": "123",
  "action": "user.create",
  "metadata": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

This directory structure guide ensures consistency, maintainability, and scalability throughout the NitroERP project development. 