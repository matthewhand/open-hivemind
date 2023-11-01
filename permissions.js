function isUserAllowed(userId) {
  const allowedUsers = ['12345', '67890'];  // replace with actual allowed user IDs
  return allowedUsers.includes(userId);
}

function isRoleAllowed(userRoles, allowedRoles) {
  return userRoles.some(role => allowedRoles.includes(role));
}

module.exports = {
  isUserAllowed,
  isRoleAllowed
};
