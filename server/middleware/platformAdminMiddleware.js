/**
 * platformAdminMiddleware.js
 *
 * Use this AFTER authMiddleware on any route that should only
 * be accessible by a Platform Admin.
 *
 * Usage in routes:
 *   router.get("/admin/companies", authMiddleware, platformAdminMiddleware, ...)
 */

module.exports = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({
            message: "Access denied. Platform Admin only."
        });
    }

    next();

};