const jwt = require("jsonwebtoken");
const { JWT_EXPIRES_IN, JWT_SECRET } = require("../config/serverConfig");

function requireJwtSecret() {
    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET must be configured with at least 32 characters.");
    }
}

function signAuthToken(user) {
    requireJwtSecret();

    return jwt.sign(
        {
            username: user.username
        },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN
        }
    );
}

function verifyAuthToken(token) {
    requireJwtSecret();

    return jwt.verify(token, JWT_SECRET);
}

module.exports = {
    signAuthToken,
    verifyAuthToken
};
