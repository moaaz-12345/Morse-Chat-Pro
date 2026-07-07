const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

function createSecurityMiddleware() {
    return helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin"
        },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                mediaSrc: ["'self'", "blob:"],
                connectSrc: ["'self'", "ws:", "wss:"]
            }
        }
    });
}

const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Too many requests. Please try again later."
    }
});

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Too many login/register attempts. Please try again later."
    }
});

module.exports = {
    authRateLimiter,
    createSecurityMiddleware,
    generalRateLimiter
};
