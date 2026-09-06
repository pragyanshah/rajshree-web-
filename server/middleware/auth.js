/* Session-guard middleware — protects all admin routes */
function requireAuth(req, res, next) {
  if (req.session && req.session.admin === true) return next();
  res.status(401).json({ error: 'Unauthorized. Please log in at /admin.' });
}

module.exports = { requireAuth };
