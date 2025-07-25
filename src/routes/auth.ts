import { Router } from 'express';
import { authController } from '../controllers/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validateLogin, validateRegister, validatePasswordReset } from '../middleware/validation';

const router = Router();

// Authentication routes
router.post('/login', validateLogin, asyncHandler(authController.login));
router.post('/register', validateRegister, asyncHandler(authController.register));
router.post('/logout', asyncHandler(authController.logout));
router.post('/refresh-token', asyncHandler(authController.refreshToken));

// Password management
router.post('/forgot-password', asyncHandler(authController.forgotPassword));
router.post('/reset-password', validatePasswordReset, asyncHandler(authController.resetPassword));
router.post('/change-password', asyncHandler(authController.changePassword));

// Email verification
router.post('/verify-email', asyncHandler(authController.verifyEmail));
router.post('/resend-verification', asyncHandler(authController.resendVerification));

// Profile management
router.get('/profile', asyncHandler(authController.getProfile));
router.put('/profile', asyncHandler(authController.updateProfile));
router.post('/profile/avatar', asyncHandler(authController.uploadAvatar));

// Session management
router.get('/sessions', asyncHandler(authController.getSessions));
router.delete('/sessions/:sessionId', asyncHandler(authController.revokeSession));

// Two-factor authentication (future enhancement)
router.post('/2fa/enable', asyncHandler(authController.enable2FA));
router.post('/2fa/disable', asyncHandler(authController.disable2FA));
router.post('/2fa/verify', asyncHandler(authController.verify2FA));

export default router; 