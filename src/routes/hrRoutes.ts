import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requirePermission, requireDepartment } from '../middleware/authMiddleware';

const router = Router();

// HR module routes - all require HR permissions
router.use(requirePermission('hr:read'));

/**
 * @route GET /api/v1/hr/employees
 * @desc Get all employees
 * @access Private - HR
 */
router.get('/employees', 
  requireDepartment('HR'), 
  asyncHandler(async (req, res) => {
    res.json({ message: 'Employees endpoint' });
  })
);

/**
 * @route GET /api/v1/hr/payroll
 * @desc Get payroll information
 * @access Private - HR
 */
router.get('/payroll', 
  requireDepartment('HR'), 
  asyncHandler(async (req, res) => {
    res.json({ message: 'Payroll endpoint' });
  })
);

export default router; 