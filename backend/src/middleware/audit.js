const AuditService = require('../services/audit.service');

/**
 * Express middleware that attaches the client Ip to the request for audit logging.
 */
function attachIp(req, res, next) {
  req.clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  next();
}

module.exports = { attachIp };
