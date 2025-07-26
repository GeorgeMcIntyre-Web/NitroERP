// Core Services Index
// This file exports all core services for easy importing

export { authService, AuthService } from './auth/authService';
export type { 
  User, 
  UserWithRoles, 
  LoginCredentials, 
  TokenPayload 
} from './auth/authService';

export { userService, UserService } from './user/userService';
export type { 
  CreateUserData, 
  UpdateUserData, 
  UserFilters, 
  UserWithRoles as UserWithRolesFromService 
} from './user/userService';

export { companyService, CompanyService } from './company/companyService';
export type { 
  CreateCompanyData, 
  UpdateCompanyData, 
  CreateDepartmentData, 
  UpdateDepartmentData, 
  CompanyWithDepartments, 
  Department 
} from './company/companyService';

export { notificationService, NotificationService } from './notification/notificationService';
export type { 
  CreateNotificationData, 
  NotificationTemplate, 
  Notification, 
  NotificationPreferences, 
  NotificationFilters 
} from './notification/notificationService';

export { auditService, AuditService } from './audit/auditService';
export type { 
  AuditLogData, 
  DataAccessLogData, 
  SystemEventData, 
  SecurityEventData, 
  ComplianceLogData, 
  AuditLog, 
  AuditFilters 
} from './audit/auditService'; 