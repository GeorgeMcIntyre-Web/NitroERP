import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authRateLimit } from '../middleware/authMiddleware';
import { AuthController } from '../controllers/authController';

const router = Router();

// Rate limiting for auth endpoints
router.use(authRateLimit(5, 15 * 60 * 1000)); // 5 attempts per 15 minutes

/**
 * @route POST /api/v1/auth/login
 * @desc Authenticate user and return JWT token
 * @access Public
 */
router.post('/login', asyncHandler(AuthController.login));

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user and invalidate token
 * @access Public
 */
router.post('/logout', asyncHandler(AuthController.logout));

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh JWT token
 * @access Public
 */
router.post('/refresh', asyncHandler(AuthController.refreshToken));

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 */
router.post('/forgot-password', asyncHandler(AuthController.forgotPassword));

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', asyncHandler(AuthController.resetPassword));

/**
 * @route POST /api/v1/auth/verify-email
 * @desc Verify email address
 * @access Public
 */
router.post('/verify-email', asyncHandler(AuthController.verifyEmail));

/**
 * @route POST /api/v1/auth/resend-verification
 * @desc Resend email verification
 * @access Public
 */
router.post('/resend-verification', asyncHandler(AuthController.resendVerification));

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user information
 * @access Private
 */
router.get('/me', asyncHandler(AuthController.getCurrentUser));

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', asyncHandler(AuthController.changePassword));

/**
 * @route POST /api/v1/auth/enable-mfa
 * @desc Enable multi-factor authentication
 * @access Private
 */
router.post('/enable-mfa', asyncHandler(AuthController.enableMFA));

/**
 * @route POST /api/v1/auth/disable-mfa
 * @desc Disable multi-factor authentication
 * @access Private
 */
router.post('/disable-mfa', asyncHandler(AuthController.disableMFA));

/**
 * @route POST /api/v1/auth/verify-mfa
 * @desc Verify MFA token
 * @access Public
 */
router.post('/verify-mfa', asyncHandler(AuthController.verifyMFA));

export default router; 