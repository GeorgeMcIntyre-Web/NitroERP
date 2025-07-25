import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireRole, requirePermission } from '../middleware/authMiddleware';
import { UserController } from '../controllers/userController';

const router = Router();

/**
 * @route GET /api/v1/users
 * @desc Get all users (with pagination and filters)
 * @access Private - ADMIN, MANAGER
 */
router.get('/', 
  requireRole(['ADMIN', 'MANAGER']), 
  asyncHandler(UserController.getUsers)
);

/**
 * @route GET /api/v1/users/:id
 * @desc Get user by ID
 * @access Private - ADMIN, MANAGER, OWNER
 */
router.get('/:id', 
  requirePermission('users:read'), 
  asyncHandler(UserController.getUserById)
);

/**
 * @route POST /api/v1/users
 * @desc Create new user
 * @access Private - ADMIN
 */
router.post('/', 
  requireRole('ADMIN'), 
  asyncHandler(UserController.createUser)
);

/**
 * @route PUT /api/v1/users/:id
 * @desc Update user
 * @access Private - ADMIN, OWNER
 */
router.put('/:id', 
  requirePermission('users:write'), 
  asyncHandler(UserController.updateUser)
);

/**
 * @route DELETE /api/v1/users/:id
 * @desc Delete user (soft delete)
 * @access Private - ADMIN
 */
router.delete('/:id', 
  requireRole('ADMIN'), 
  asyncHandler(UserController.deleteUser)
);

/**
 * @route POST /api/v1/users/:id/activate
 * @desc Activate user account
 * @access Private - ADMIN
 */
router.post('/:id/activate', 
  requireRole('ADMIN'), 
  asyncHandler(UserController.activateUser)
);

/**
 * @route POST /api/v1/users/:id/deactivate
 * @desc Deactivate user account
 * @access Private - ADMIN
 */
router.post('/:id/deactivate', 
  requireRole('ADMIN'), 
  asyncHandler(UserController.deactivateUser)
);

/**
 * @route POST /api/v1/users/:id/reset-password
 * @desc Reset user password (admin only)
 * @access Private - ADMIN
 */
router.post('/:id/reset-password', 
  requireRole('ADMIN'), 
  asyncHandler(UserController.resetUserPassword)
);

/**
 * @route GET /api/v1/users/:id/permissions
 * @desc Get user permissions
 * @access Private - ADMIN, OWNER
 */
router.get('/:id/permissions', 
  requirePermission('users:read'), 
  asyncHandler(UserController.getUserPermissions)
);

/**
 * @route PUT /api/v1/users/:id/permissions
 * @desc Update user permissions
 * @access Private - ADMIN
 */
router.put('/:id/permissions', 
  requireRole('ADMIN'), 
  asyncHandler(UserController.updateUserPermissions)
);

/**
 * @route GET /api/v1/users/department/:department
 * @desc Get users by department
 * @access Private - ADMIN, MANAGER
 */
router.get('/department/:department', 
  requireRole(['ADMIN', 'MANAGER']), 
  asyncHandler(UserController.getUsersByDepartment)
);

/**
 * @route GET /api/v1/users/role/:role
 * @desc Get users by role
 * @access Private - ADMIN
 */
router.get('/role/:role', 
  requireRole('ADMIN'), 
  asyncHandler(UserController.getUsersByRole)
);

/**
 * @route POST /api/v1/users/bulk-import
 * @desc Bulk import users from CSV/Excel
 * @access Private - ADMIN
 */
router.post('/bulk-import', 
  requireRole('ADMIN'), 
  asyncHandler(UserController.bulkImportUsers)
);

/**
 * @route GET /api/v1/users/export
 * @desc Export users to CSV/Excel
 * @access Private - ADMIN, MANAGER
 */
router.get('/export', 
  requireRole(['ADMIN', 'MANAGER']), 
  asyncHandler(UserController.exportUsers)
);

export default router; 