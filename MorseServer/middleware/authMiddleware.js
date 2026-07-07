const User = require("../models/User");
const { verifyAuthToken } = require("../utils/authToken");

async function authenticateRequest(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Authentication token is required." });
    }

    try {
        const payload = verifyAuthToken(token);
        const user = await User.findOne({ username: payload.username }).lean();

        if (!user) {
            return res.status(401).json({ error: "User no longer exists." });
        }

        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token." });
    }
}

module.exports = {
    authenticateRequest
};
