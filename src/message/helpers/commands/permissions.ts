import Debug from "debug";
const debug = Debug('app:permissions');

/**
 * Checks if a user is allowed based on their user ID.
 * 
 * @param userId - The ID of the user to check.
 * @param allowedUsers - An array of allowed user IDs.
 * @returns True if the user is allowed, false otherwise.
 */
export function isUserAllowed(userId: string, allowedUsers: string[]): boolean {
    if (!userId) {
        debug('[isUserAllowed] Invalid userId provided.');
        return false;
    }
    if (!allowedUsers || allowedUsers.length === 0) {
        debug('[isUserAllowed] No allowed users specified.');
        return false;
    }
    const isAllowed = allowedUsers.includes(userId);
    debug('[isUserAllowed] User %s is %s.', userId, isAllowed ? 'allowed' : 'not allowed');
    return isAllowed;
}
/**
 * Checks if any of the user's roles are allowed based on a list of allowed roles.
 * 
 * @param userRoles - An array of roles assigned to the user.
 * @param allowedRoles - An array of roles that are allowed.
 * @returns True if the user has at least one allowed role, false otherwise.
 */
export function isRoleAllowed(userRoles: string[], allowedRoles: string[]): boolean {
    if (!userRoles || userRoles.length === 0) {
        debug('[isRoleAllowed] No user roles provided.');
        return false;
    }
    if (!allowedRoles || allowedRoles.length === 0) {
        debug('[isRoleAllowed] No allowed roles specified.');
        return false;
    }
    const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role));
    debug('[isRoleAllowed] User has %s', hasAllowedRole ? 'an allowed role.' : 'no allowed roles.');
    return hasAllowedRole;
}
