const { requireSession, allowRoles } = require("./auth");

module.exports = {
  authenticateUser: requireSession,
  authorizeRoles: allowRoles
};
