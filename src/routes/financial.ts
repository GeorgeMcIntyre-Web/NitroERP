import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireDepartment } from '../middleware/auth';

const router = Router();

// Accounts
router.get('/accounts', requireDepartment(['finance']), asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'Financial module not implemented yet' });
}));

router.post('/accounts', requireDepartment(['finance']), asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'Financial module not implemented yet' });
}));

// Transactions
router.get('/transactions', requireDepartment(['finance']), asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'Financial module not implemented yet' });
}));

router.post('/transactions', requireDepartment(['finance']), asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'Financial module not implemented yet' });
}));

// Invoices
router.get('/invoices', requireDepartment(['finance']), asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'Financial module not implemented yet' });
}));

router.post('/invoices', requireDepartment(['finance']), asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'Financial module not implemented yet' });
}));

// Reports
router.get('/reports/balance-sheet', requireDepartment(['finance']), asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'Financial module not implemented yet' });
}));

router.get('/reports/income-statement', requireDepartment(['finance']), asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'Financial module not implemented yet' });
}));

export default router; 