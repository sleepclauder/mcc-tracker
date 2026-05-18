'use strict';

module.exports = function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
