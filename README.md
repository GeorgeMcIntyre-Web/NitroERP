# NitroERP - Enterprise Resource Planning System

NitroERP is a comprehensive enterprise resource planning system designed for manufacturing and engineering companies with approximately 200 employees. The system provides integrated modules for financial management, HR, engineering, manufacturing, and control systems.

## 🚀 Features

### Core Modules

1. **Financial Module**
   - Account management and chart of accounts
   - Transaction processing and journal entries
   - Invoice generation and management
   - Financial reporting and analytics
   - Budget planning and tracking

2. **HR Module**
   - Employee management and profiles
   - Attendance tracking and time management
   - Leave management and approval workflows
   - Payroll processing and calculations
   - Performance reviews and evaluations

3. **Engineering Module**
   - 3D design tools and CAD integration
   - Project management and tracking
   - Design version control and collaboration
   - Technical documentation management
   - Engineering change management

4. **Manufacturing Module**
   - Work order management
   - Production planning and scheduling
   - Quality control and inspection
   - Material requirements planning
   - Integration with ShipPlanner for advanced planning

5. **Control Systems Module**
   - Electrical design and documentation
   - Pneumatic system design
   - PLC programming and management
   - SCADA system integration
   - Maintenance scheduling and tracking

### Technical Features

- **Real-time Communication**: WebSocket-based real-time updates and notifications
- **Role-based Access Control**: Granular permissions based on user roles and departments
- **Audit Trail**: Comprehensive logging of all system changes
- **File Management**: Secure file upload and storage for documents and designs
- **Email Integration**: Automated email notifications and reports
- **API-first Design**: RESTful APIs for external integrations
- **Scalable Architecture**: Designed to handle 200+ users with room for growth

## 🏗️ Architecture

### Technology Stack

- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Knex.js ORM
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.IO for live updates
- **File Storage**: Local file system with cloud storage support
- **Email**: Nodemailer with SMTP support
- **Logging**: Winston for comprehensive logging
- **Validation**: Joi for request validation

### Project Structure

```
NitroERP/
├── src/
│   ├── server/
│   │   └── index.ts                 # Main server entry point
│   ├── controllers/                 # Business logic controllers
│   ├── routes/                      # API route definitions
│   ├── middleware/                  # Express middleware
│   ├── services/                    # Business services
│   ├── models/                      # Data models
│   ├── types/                       # TypeScript type definitions
│   ├── utils/                       # Utility functions
│   └── database/
│       ├── migrations/              # Database migrations
│       └── seeds/                   # Database seed data
├── client/                          # React frontend (to be implemented)
├── docs/                           # API documentation
├── logs/                           # Application logs
├── uploads/                        # File uploads
├── package.json
├── knexfile.ts                     # Database configuration
├── tsconfig.json                   # TypeScript configuration
└── env.example                     # Environment variables template
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 12.0 or higher
- npm or yarn package manager

### 1. Clone the Repository

```bash
git clone <repository-url>
cd NitroERP
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nitroerp
DB_USER=nitroerp_user
DB_PASSWORD=your_secure_password
DB_SSL=false

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@nitroerp.com
```

### 4. Database Setup

Create the PostgreSQL database and user:

```sql
CREATE DATABASE nitroerp;
CREATE USER nitroerp_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE nitroerp TO nitroerp_user;
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

### 6. Seed Initial Data (Optional)

```bash
npm run db:seed
```

### 7. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

### Module Endpoints

#### Financial Module
- `GET /api/v1/financial/accounts` - List accounts
- `POST /api/v1/financial/accounts` - Create account
- `GET /api/v1/financial/transactions` - List transactions
- `POST /api/v1/financial/transactions` - Create transaction
- `GET /api/v1/financial/invoices` - List invoices
- `POST /api/v1/financial/invoices` - Create invoice

#### HR Module
- `GET /api/v1/hr/employees` - List employees
- `POST /api/v1/hr/employees` - Create employee
- `GET /api/v1/hr/attendance` - List attendance records
- `POST /api/v1/hr/attendance` - Record attendance
- `GET /api/v1/hr/leaves` - List leave requests
- `POST /api/v1/hr/leaves` - Create leave request

#### Engineering Module
- `GET /api/v1/engineering/projects` - List projects
- `POST /api/v1/engineering/projects` - Create project
- `GET /api/v1/engineering/designs` - List designs
- `POST /api/v1/engineering/designs` - Upload design
- `GET /api/v1/engineering/designs/:id/view` - View 3D design

#### Manufacturing Module
- `GET /api/v1/manufacturing/work-orders` - List work orders
- `POST /api/v1/manufacturing/work-orders` - Create work order
- `GET /api/v1/manufacturing/quality-checks` - List quality checks
- `POST /api/v1/manufacturing/quality-checks` - Create quality check

#### Control Module
- `GET /api/v1/control/systems` - List control systems
- `POST /api/v1/control/systems` - Create control system
- `GET /api/v1/control/maintenance` - List maintenance schedules
- `POST /api/v1/control/maintenance` - Schedule maintenance

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run dev:server       # Start server only
npm run dev:client       # Start client only (when implemented)

# Building
npm run build            # Build for production
npm run build:server     # Build server only
npm run build:client     # Build client only

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with initial data
npm run db:reset         # Reset database (migrate + seed)

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode

# Linting
npm run lint             # Check code style
npm run lint:fix         # Fix code style issues
```

### Code Style

The project uses ESLint and Prettier for code formatting. Configure your editor to format on save:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Database Migrations

Create new migrations:

```bash
npx knex migrate:make migration_name
```

Run migrations:

```bash
npm run db:migrate
```

Rollback migrations:

```bash
npx knex migrate:rollback
```

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
npm run test:integration
```

### Test Coverage

```bash
npm run test:coverage
```

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Environment Variables for Production

Ensure all production environment variables are properly configured:

- Set `NODE_ENV=production`
- Configure production database credentials
- Set up proper JWT secrets
- Configure email service
- Set up file storage (consider cloud storage)

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/server/index.js"]
```

## 📊 Monitoring & Logging

### Log Files

- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only

### Health Check

```bash
curl http://localhost:3001/health
```

### Metrics

The application includes built-in metrics for:
- Request/response times
- Database query performance
- Memory usage
- Active connections

## 🔒 Security

### Authentication & Authorization

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Department-based permissions
- Session management
- Password strength validation

### Data Protection

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting

### Audit Trail

All system changes are logged with:
- User who made the change
- Timestamp
- Old and new values
- IP address
- User agent

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow the existing code style
- Add proper error handling
- Include logging for important operations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Core authentication and user management
- ✅ Basic CRUD operations for all modules
- ✅ Real-time notifications
- ✅ File upload and management

### Phase 2 (Next)
- 🔄 React frontend implementation
- 🔄 Advanced reporting and analytics
- 🔄 Mobile app development
- 🔄 Advanced workflow automation

### Phase 3 (Future)
- 📋 AI-powered insights and recommendations
- 📋 Advanced 3D visualization tools
- 📋 IoT integration for real-time data
- 📋 Advanced manufacturing planning algorithms

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by industry best practices
- Designed for scalability and maintainability
- Focused on user experience and productivity

---

**NitroERP** - Empowering Manufacturing Excellence 