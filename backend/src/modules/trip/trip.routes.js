const express = require('express');
const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');
const tripService = require('./trip.service');
const { authenticate, enforcePasswordChanged, authorize } = require('../../middleware/auth');
const { ValidationError } = require('../../errors');

const router = express.Router();

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ValidationError('Validation failed', errors.array());
}

// ─── POST /api/v1/trips (admin assigns) ───────────
router.post(
  '/',
  authenticate, enforcePasswordChanged, authorize('admin'),
  [
    body('driverId').isUUID().withMessage('Valid driver ID is required'),
    body('pickupLocation').optional().notEmpty().withMessage('Pickup location is required').trim().escape(),
    body('pickup').optional().notEmpty().withMessage('Pickup location is required').trim().escape(),
    body('dropoffLocation').optional().notEmpty().withMessage('Dropoff location is required').trim().escape(),
    body('dropoff').optional().notEmpty().withMessage('Dropoff location is required').trim().escape(),
    body('price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
    body('scheduledTime').optional().isISO8601().withMessage('Invalid scheduled time format'),
    body().custom(body => {
      if (!body.pickupLocation && !body.pickup) throw new Error('Pickup location is required');
      if (!body.dropoffLocation && !body.dropoff) throw new Error('Dropoff location is required');
      return true;
    }),
  ],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const trip = await tripService.assignTrip(req.body, req.user.id, req.clientIp);
      res.status(201).json(trip);
    } catch (err) { next(err); }
  }
);

// ─── PUT /api/v1/trips/:id/start ──────────────────
router.put(
  '/:id/start',
  authenticate, enforcePasswordChanged, authorize('driver'),
  [param('id').isUUID()],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const trip = await tripService.startTrip(req.params.id, req.user.id, req.clientIp);
      res.json(trip);
    } catch (err) { next(err); }
  }
);

// ─── PUT /api/v1/trips/:id/complete ───────────────
router.put(
  '/:id/complete',
  authenticate, enforcePasswordChanged, authorize('driver'),
  [param('id').isUUID()],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const trip = await tripService.completeTrip(req.params.id, req.user.id, req.clientIp);
      res.json(trip);
    } catch (err) { next(err); }
  }
);

// ─── PUT /api/v1/trips/:id/cancel ─────────────────
router.put(
  '/:id/cancel',
  authenticate, enforcePasswordChanged,
  [
    param('id').isUUID(),
    body('reason').optional().isString().escape(),
  ],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const trip = await tripService.cancelTrip(
        req.params.id, req.user.id, req.user.role, req.body.reason, req.clientIp
      );
      res.json(trip);
    } catch (err) { next(err); }
  }
);

// ─── GET /api/v1/trips/active ─────────────────────
router.get(
  '/active',
  authenticate, enforcePasswordChanged, authorize('driver'),
  async (req, res, next) => {
    try {
      const trip = await tripService.getActiveTrip(req.user.id);
      res.json({ trip: trip || null });
    } catch (err) { next(err); }
  }
);

// ─── GET /api/v1/trips ────────────────────────────
router.get(
  '/',
  authenticate, enforcePasswordChanged,
  async (req, res, next) => {
    try {
      const query = { ...req.query };
      if (req.user.role === 'driver') {
        query.driverId = req.user.id;
      }
      const result = await tripService.getTrips(query);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// ─── GET /api/v1/trips/:id ────────────────────────
router.get(
  '/:id',
  authenticate, enforcePasswordChanged,
  [param('id').isUUID()],
  async (req, res, next) => {
    try {
      handleValidation(req);
      const trip = await tripService.getTripById(req.params.id, req.user);
      res.json(trip);
    } catch (err) { next(err); }
  }
);

module.exports = router;
