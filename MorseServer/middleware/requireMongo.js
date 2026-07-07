const mongoose = require("mongoose");

function requireMongo(req, res, next) {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            error: "Database is not connected. Configure MONGO_URI to use authentication."
        });
    }

    return next();
}

module.exports = {
    requireMongo
};
