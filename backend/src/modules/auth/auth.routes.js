const express = require('express');
const { body, param } = require('express-validator');
const authService = require('./auth.service');
const shiftService = require('../shift/shift.service'); // Import shiftService
const { authenticate, enforcePasswordChanged, authorize } = require('../../middleware/auth');
const { createUploader } = require('../../middleware/upload');
const fileService = require('../../services/FileService');
const faceVerificationService = require('../../services/FaceVerificationService');
const { ValidationError } = require('../../errors');

const router = express.Router();
const identityUpload = createUploader();

// Validation helper
function handleValidation(req) {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
}

// ─── POST /api/v1/auth/login ──────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('deviceFingerprint').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const result = await authService.login(
        req.body.email, 
        req.body.password, 
        req.clientIp, 
        req.body.deviceFingerprint
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/v1/auth/verify-device ──────────────
router.post(
  '/verify-device',
  identityUpload.single('photo'),
  [
    body('userId').isString(), // Relaxed for debugging
    body('deviceFingerprint').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      console.log('Verify Device Request:', { 
        body: req.body, 
        file: req.file ? { name: req.file.originalname, size: req.file.size } : 'Missing' 
      });
      handleValidation(req);
      if (!req.file) throw new ValidationError('Selfie photo is required');
      
      const result = await authService.verifyDevice(
        req.body.userId,
        req.body.deviceFingerprint,
        req.file.buffer,
        req.clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/v1/auth/change-password ────────────
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').notEmpty().isLength({ min: 8 }),
  ],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const result = await authService.changePassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword,
        req.clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/v1/auth/refresh ────────────────────
router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const result = await authService.refreshAccessToken(req.body.refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/v1/auth/logout ─────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout(req.user.id, req.clientIp);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/v1/auth/me ──────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});



// ─── GET /api/v1/auth/identity/pending ────────────
router.get(
  '/identity/pending',
  authenticate,
  enforcePasswordChanged,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const result = await authService.getPendingVerifications(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PUT /api/v1/auth/identity/:id/review ─────────
router.put(
  '/identity/:id/review',
  authenticate,
  enforcePasswordChanged,
  authorize('admin'),
  [
    param('id').isUUID(),
    body('action').isIn(['approve', 'reject']),
    body('rejectionReason').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const result = await authService.reviewIdentity(
        req.params.id,
        req.user.id,
        req.body.action,
        req.body.rejectionReason,
        req.clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/v1/auth/identity/:id/review ───
router.post(
  '/identity/:id/review',
  authenticate,
  enforcePasswordChanged,
  authorize('admin'),
  [
    param('id').isUUID(),
    body('action').isIn(['approve', 'reject']),
    body('rejectionReason').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const result = await authService.reviewIdentity(
        req.params.id,
        req.user.id,
        req.body.action,
        req.body.rejectionReason,
        req.clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PUT /api/v1/auth/preferences ────────────
router.put(
  '/preferences',
  authenticate,
  [
    body('languagePreference').isIn(['en', 'ar']),
  ],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const result = await authService.updatePreferences(req.user.id, req.body, req.clientIp);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/v1/auth/forgot-password ───────────
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const result = await authService.forgotPassword(req.body.email, req.clientIp);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/v1/auth/verify-reset-token ───────────
router.get(
  '/verify-reset-token',
  async (req, res, next) => {
    try {
      const { token } = req.query;
      if (!token) throw new ValidationError('Token is required');
      const result = await authService.verifyResetToken(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/v1/auth/reset-password ──────────────
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('newPassword').notEmpty().isLength({ min: 8 }),
  ],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const result = await authService.resetPassword(req.body.token, req.body.newPassword, req.clientIp);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
