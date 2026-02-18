const AuditService = require('../services/audit.service');

/**
 * Legacy wrapper for AuditService.log.
 * @deprecated Use AuditService.log instead.
 */
async function createAuditLog(data) {
  return AuditService.log(data);
}

/**
 * Express middleware that attaches the client IP to the request for audit logging.
 */
function attachIp(req, res, next) {
  req.clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  next();
}

module.exports = { createAuditLog, attachIp };
