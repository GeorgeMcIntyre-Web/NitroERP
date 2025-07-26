# NitroERP Core Services

This directory contains the core services that form the foundation of the NitroERP system. These services are designed to be modular, scalable, and independently deployable.

## Services Overview

### 1. Auth Service (`auth/`)
**Purpose**: Handles authentication, authorization, and session management.

**Key Features**:
- User authentication with JWT tokens
- Role-based access control (RBAC)
- Permission-based access control
- Session management with Redis
- Token refresh mechanism
- Password hashing and verification

**Main Methods**:
- `authenticateUser()` - Authenticate user with credentials
- `generateAccessToken()` - Generate JWT access token
- `verifyAccessToken()` - Verify and decode JWT token
- `hasPermission()` - Check user permissions
- `hasRole()` - Check user roles

### 2. User Service (`user/`)
**Purpose**: Manages user accounts, profiles, and user-related operations.

**Key Features**:
- User CRUD operations
- User role assignment
- Password management
- User status management (active/inactive)
- User search and filtering
- Bulk user operations

**Main Methods**:
- `createUser()` - Create new user account
- `getUserById()` - Get user by ID with roles
- `getUsers()` - Get users with filtering and pagination
- `updateUser()` - Update user information
- `deleteUser()` - Soft delete user
- `changePassword()` - Change user password

### 3. Company Service (`company/`)
**Purpose**: Manages company information and organizational structure.

**Key Features**:
- Company CRUD operations
- Department management
- Company hierarchy
- Multi-company support
- Company-specific settings

**Main Methods**:
- `createCompany()` - Create new company
- `getCompanyById()` - Get company with departments
- `updateCompany()` - Update company information
- `createDepartment()` - Create department within company
- `getDepartmentById()` - Get department details

### 4. Notification Service (`notification/`)
**Purpose**: Handles system notifications and user communication.

**Key Features**:
- Real-time notifications via Socket.IO
- Notification templates
- User notification preferences
- Multi-channel delivery (in-app, email, push)
- Notification history and management

**Main Methods**:
- `createNotification()` - Create and send notification
- `getUserNotifications()` - Get user's notifications
- `markNotificationAsRead()` - Mark notification as read
- `createNotificationFromTemplate()` - Create notification from template
- `updateNotificationPreferences()` - Update user preferences

### 5. Audit Service (`audit/`)
**Purpose**: Provides comprehensive audit logging and compliance tracking.

**Key Features**:
- User action logging
- Data access tracking
- System event logging
- Security event monitoring
- Compliance reporting
- Audit trail generation

**Main Methods**:
- `logUserAction()` - Log user actions
- `logDataAccess()` - Log database access
- `logSystemEvent()` - Log system events
- `logSecurityEvent()` - Log security events
- `generateAuditReport()` - Generate audit reports

## Architecture

### Service Independence
Each service is designed to be independently deployable and scalable. Services communicate through:
- Shared database (PostgreSQL)
- Message queues (RabbitMQ)
- HTTP/REST APIs
- Real-time communication (Socket.IO)

### Data Flow
```
Client Request → API Gateway → Core Service → Database/Redis
                                    ↓
                              Audit Service (logging)
                                    ↓
                              Notification Service (if needed)
```

### Security
- All services implement proper authentication and authorization
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- Audit logging for all operations

## Usage

### Importing Services
```typescript
import { 
  authService, 
  userService, 
  companyService, 
  notificationService, 
  auditService 
} from '../core';

// Or import individual services
import { authService } from '../core/auth/authService';
```

### Basic Usage Examples

#### Authentication
```typescript
// Authenticate user
const result = await authService.authenticateUser({
  email: 'user@example.com',
  password: 'password123'
});

// Check permissions
const hasPermission = authService.hasPermission(
  user.permissions, 
  'user:create'
);
```

#### User Management
```typescript
// Create user
const user = await userService.createUser({
  email: 'newuser@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  company_id: 'company-uuid',
  department_id: 'dept-uuid'
}, 'admin-user-id');

// Get users with filters
const users = await userService.getUsers({
  department_id: 'dept-uuid',
  is_active: true,
  page: 1,
  limit: 20
}, currentUser);
```

#### Notifications
```typescript
// Create notification
await notificationService.createNotification({
  type: 'workflow_approval',
  title: 'Approval Required',
  message: 'Please review and approve the engineering change request',
  recipient_id: 'user-uuid',
  priority: 'high'
}, 'system');

// Get user notifications
const notifications = await notificationService.getUserNotifications(
  'user-uuid',
  { is_read: false, limit: 10 }
);
```

#### Audit Logging
```typescript
// Log user action
await auditService.logUserAction({
  user_id: 'user-uuid',
  action: 'create_user',
  resource_type: 'user',
  resource_id: 'new-user-uuid',
  details: { email: 'newuser@example.com' },
  ip_address: '192.168.1.1'
});

// Generate audit report
const report = await auditService.generateAuditReport({
  company_id: 'company-uuid',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31'),
  report_type: 'summary'
});
```

## Testing

Run core service tests:
```bash
npm run test:core
```

Individual service tests:
```bash
npm test -- src/core/auth
npm test -- src/core/user
npm test -- src/core/company
npm test -- src/core/notification
npm test -- src/core/audit
```

## Deployment

### Docker Deployment
Each service has its own Dockerfile for containerized deployment:

```bash
# Build individual service
docker build -f src/core/auth/Dockerfile -t nitroerp-auth .

# Run service
docker run -p 3001:3001 nitroerp-auth
```

### Environment Variables
Required environment variables for core services:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nitroerp

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=604800

# Server
PORT=3000
NODE_ENV=production
```

## Monitoring and Health Checks

Each service includes health check endpoints:
- `/health` - Basic health check
- `/health/detailed` - Detailed health information
- `/metrics` - Service metrics (if enabled)

Health checks are used by Docker containers and load balancers to monitor service status.

## Error Handling

All services implement consistent error handling:
- Custom error classes for different error types
- Proper HTTP status codes
- Structured error responses
- Error logging and monitoring
- Graceful degradation

## Performance Considerations

- Database connection pooling
- Redis caching for frequently accessed data
- Query optimization and indexing
- Rate limiting and throttling
- Horizontal scaling support
- Load balancing ready

## Security Best Practices

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Secure headers
- Audit logging
- Data encryption at rest and in transit 