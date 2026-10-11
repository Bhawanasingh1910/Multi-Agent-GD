const jwt = require("jsonwebtoken");

module.exports = function requireAuth(req, res, next) {

    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: "Please log in." });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.id;
        next();
    } catch {
        return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }
};