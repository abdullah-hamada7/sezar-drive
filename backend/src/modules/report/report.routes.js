const express = require('express');
const reportService = require('./report.service');
const { authenticate, enforcePasswordChanged, authorize } = require('../../middleware/auth');
const AuditService = require('../../services/audit.service');

const router = express.Router();

// ─── GET /api/v1/reports/revenue ──────────────────
router.get(
  '/revenue',
  authenticate, enforcePasswordChanged, authorize('admin'),
  async (req, res, next) => {
    try {
      const data = await reportService.generateRevenueData(req.query);
      res.json(data);
    } catch (err) { next(err); }
  }
);

// ─── GET /api/v1/reports/revenue/pdf ──────────────
router.get(
  '/revenue/pdf',
  authenticate, enforcePasswordChanged, authorize('admin'),
  async (req, res, next) => {
    try {
      const data = await reportService.generateRevenueData(req.query);
      await AuditService.log({
        actorId: req.user.id,
        actionType: 'report.generated',
        entityType: 'report',
        entityId: req.user.id,
        newState: { format: 'pdf', startDate: req.query.startDate, endDate: req.query.endDate },
        ipAddress: req.clientIp,
      });
      await reportService.generatePDF(data, res);
    } catch (err) { next(err); }
  }
);

// ─── GET /api/v1/reports/revenue/excel ────────────
router.get(
  '/revenue/excel',
  authenticate, enforcePasswordChanged, authorize('admin'),
  async (req, res, next) => {
    try {
      const data = await reportService.generateRevenueData(req.query);
      await AuditService.log({
        actorId: req.user.id,
        actionType: 'report.generated',
        entityType: 'report',
        entityId: req.user.id,
        newState: { format: 'excel', startDate: req.query.startDate, endDate: req.query.endDate },
        ipAddress: req.clientIp,
      });
      await reportService.generateExcel(data, res);
    } catch (err) { next(err); }
  }
);

module.exports = router;
