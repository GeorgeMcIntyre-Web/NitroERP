// Basic test to verify core services can be imported
describe('Core Services Basic Test', () => {
  it('should be able to import core service classes', () => {
    // This test verifies that all core service classes can be imported without errors
    expect(() => {
      const { AuthService } = require('../auth/authService');
      const { UserService } = require('../user/userService');
      const { CompanyService } = require('../company/companyService');
      const { NotificationService } = require('../notification/notificationService');
      const { AuditService } = require('../audit/auditService');

      // Verify classes are defined
      expect(AuthService).toBeDefined();
      expect(UserService).toBeDefined();
      expect(CompanyService).toBeDefined();
      expect(NotificationService).toBeDefined();
      expect(AuditService).toBeDefined();
    }).not.toThrow();
  });

  it('should have proper service class structure', () => {
    const { AuthService } = require('../auth/authService');
    const { UserService } = require('../user/userService');
    const { CompanyService } = require('../company/companyService');
    const { NotificationService } = require('../notification/notificationService');
    const { AuditService } = require('../audit/auditService');

    // Check that classes are constructors
    expect(typeof AuthService).toBe('function');
    expect(typeof UserService).toBe('function');
    expect(typeof CompanyService).toBe('function');
    expect(typeof NotificationService).toBe('function');
    expect(typeof AuditService).toBe('function');

    // Check that classes can be instantiated (with mocked dependencies)
    expect(() => {
      new AuthService();
      new UserService();
      new CompanyService();
      new NotificationService();
      new AuditService();
    }).not.toThrow();
  });

  it('should export service instances', () => {
    // Check that service instances are exported
    const authService = require('../auth/authService');
    const userService = require('../user/userService');
    const companyService = require('../company/companyService');
    const notificationService = require('../notification/notificationService');
    const auditService = require('../audit/auditService');

    expect(authService.authService).toBeDefined();
    expect(userService.userService).toBeDefined();
    expect(companyService.companyService).toBeDefined();
    expect(notificationService.notificationService).toBeDefined();
    expect(auditService.auditService).toBeDefined();
  });
}); 