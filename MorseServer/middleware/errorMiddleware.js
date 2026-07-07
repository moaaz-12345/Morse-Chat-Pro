function notFoundHandler(req, res) {
    res.status(404).json({
        error: "Route not found."
    });
}

function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        next(error);
        return;
    }

    if (error?.type === "entity.parse.failed") {
        res.status(400).json({
            error: "Invalid JSON payload."
        });
        return;
    }

    console.error("Unhandled request error:", error);

    res.status(500).json({
        error: "Internal server error."
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
