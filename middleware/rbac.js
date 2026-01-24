const Workspace = require('../models/Workspace');

/**
 * RBAC Middleware to check workspace permissions
 * @param {Array} allowedRoles - Roles that can access the route ('admin', 'editor', 'viewer')
 */
const checkRole = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;

            if (!workspaceId) {
                // If no workspaceId, it's a personal request, allow if auth middleware passed
                return next();
            }

            const workspace = await Workspace.findById(workspaceId);

            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }

            const member = workspace.members.find(m => m.user.toString() === req.user._id.toString());

            if (!member) {
                return res.status(403).json({ error: 'You are not a member of this workspace' });
            }

            // If allowedRoles is empty, any member can access (viewer+)
            if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
                return res.status(403).json({
                    error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
                });
            }

            // Attach workspace and role to request for use in controllers
            req.workspace = workspace;
            req.userRole = member.role;
            next();
        } catch (error) {
            console.error('[RBAC Middleware] Error:', error);
            res.status(500).json({ error: 'Internal server error during permission check' });
        }
    };
};

module.exports = {
    checkRole,
    ROLES: {
        OWNER: 'owner',
        ADMIN: 'admin',
        MANAGER: 'manager',
        MEMBER: 'member',
        VIEWER: 'viewer'
    }
};
