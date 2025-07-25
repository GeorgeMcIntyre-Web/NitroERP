import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requirePermission, requireDepartment } from '../middleware/authMiddleware';

const router = Router();

// Financial module routes - all require financial permissions
router.use(requirePermission('financial:read'));

/**
 * @route GET /api/v1/financial/accounts
 * @desc Get chart of accounts
 * @access Private - FINANCE
 */
router.get('/accounts', 
  requireDepartment('FINANCE'), 
  asyncHandler(async (req, res) => {
    res.json({ message: 'Chart of accounts endpoint' });
  })
);

/**
 * @route GET /api/v1/financial/transactions
 * @desc Get financial transactions
 * @access Private - FINANCE
 */
router.get('/transactions', 
  requireDepartment('FINANCE'), 
  asyncHandler(async (req, res) => {
    res.json({ message: 'Financial transactions endpoint' });
  })
);

/**
 * @route GET /api/v1/financial/exchange-rates
 * @desc Get current exchange rates
 * @access Private - FINANCE
 */
router.get('/exchange-rates', 
  requireDepartment('FINANCE'), 
  asyncHandler(async (req, res) => {
    res.json({ message: 'Exchange rates endpoint' });
  })
);

export default router; 