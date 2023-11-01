// permissions.js

function isUserAllowed(userId, allowedUsers) {
  return allowedUsers.includes(userId);
}

function isRoleAllowed(userRoles, allowedRoles) {
  return userRoles.some(role => allowedRoles.includes(role));
}

module.exports = {
  isUserAllowed,
  isRoleAllowed
};
