const User = require("../models/User");
const { verifyAuthToken } = require("../utils/authToken");

function createSocketAuthMiddleware() {
    return async function socketAuth(socket, next) {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication token is required."));
        }

        try {
            const payload = verifyAuthToken(token);
            const user = await User.findOne({ username: payload.username }).lean();

            if (!user) {
                return next(new Error("User no longer exists."));
            }

            socket.user = {
                username: user.username,
                avatar: user.avatar || null
            };

            return next();
        } catch (error) {
            return next(new Error("Invalid or expired token."));
        }
    };
}

module.exports = {
    createSocketAuthMiddleware
};
