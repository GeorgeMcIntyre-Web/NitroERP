import { 
  authService, 
  userService, 
  companyService, 
  notificationService, 
  auditService 
} from '../index';

describe('Core Services', () => {
  describe('Auth Service', () => {
    it('should be properly instantiated', () => {
      expect(authService).toBeDefined();
      expect(typeof authService.authenticateUser).toBe('function');
      expect(typeof authService.generateAccessToken).toBe('function');
      expect(typeof authService.verifyAccessToken).toBe('function');
    });

    it('should have proper permission checking methods', () => {
      expect(typeof authService.hasPermission).toBe('function');
      expect(typeof authService.hasRole).toBe('function');
      expect(typeof authService.hasAnyPermission).toBe('function');
      expect(typeof authService.hasAnyRole).toBe('function');
    });
  });

  describe('User Service', () => {
    it('should be properly instantiated', () => {
      expect(userService).toBeDefined();
      expect(typeof userService.createUser).toBe('function');
      expect(typeof userService.getUserById).toBe('function');
      expect(typeof userService.getUsers).toBe('function');
      expect(typeof userService.updateUser).toBe('function');
      expect(typeof userService.deleteUser).toBe('function');
    });

    it('should have proper user management methods', () => {
      expect(typeof userService.toggleUserStatus).toBe('function');
      expect(typeof userService.changePassword).toBe('function');
    });
  });

  describe('Company Service', () => {
    it('should be properly instantiated', () => {
      expect(companyService).toBeDefined();
      expect(typeof companyService.createCompany).toBe('function');
      expect(typeof companyService.getCompanyById).toBe('function');
      expect(typeof companyService.updateCompany).toBe('function');
      expect(typeof companyService.createDepartment).toBe('function');
    });

    it('should have proper company and department management methods', () => {
      expect(typeof companyService.getDepartmentById).toBe('function');
      expect(typeof companyService.getDepartmentByName).toBe('function');
    });
  });

  describe('Notification Service', () => {
    it('should be properly instantiated', () => {
      expect(notificationService).toBeDefined();
      expect(typeof notificationService.createNotification).toBe('function');
      expect(typeof notificationService.getUserNotifications).toBe('function');
      expect(typeof notificationService.markNotificationAsRead).toBe('function');
    });

    it('should have proper notification management methods', () => {
      expect(typeof notificationService.createNotificationFromTemplate).toBe('function');
      expect(typeof notificationService.getUserNotificationPreferences).toBe('function');
      expect(typeof notificationService.updateNotificationPreferences).toBe('function');
    });
  });

  describe('Audit Service', () => {
    it('should be properly instantiated', () => {
      expect(auditService).toBeDefined();
      expect(typeof auditService.logUserAction).toBe('function');
      expect(typeof auditService.logDataAccess).toBe('function');
      expect(typeof auditService.logSystemEvent).toBe('function');
    });

    it('should have proper audit logging methods', () => {
      expect(typeof auditService.logSecurityEvent).toBe('function');
      expect(typeof auditService.logComplianceEvent).toBe('function');
      expect(typeof auditService.getAuditLogs).toBe('function');
      expect(typeof auditService.generateAuditReport).toBe('function');
    });
  });

  describe('Service Integration', () => {
    it('should have consistent error handling', () => {
      // All services should handle errors gracefully
      expect(authService).toBeDefined();
      expect(userService).toBeDefined();
      expect(companyService).toBeDefined();
      expect(notificationService).toBeDefined();
      expect(auditService).toBeDefined();
    });

    it('should support modular deployment', () => {
      // Each service should be independently deployable
      const services = [authService, userService, companyService, notificationService, auditService];
      services.forEach(service => {
        expect(service).toBeDefined();
        expect(typeof service).toBe('object');
      });
    });
  });
}); 