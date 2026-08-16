const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config({
    path: process.env.DOTENV_CONFIG_PATH || ".env",
    quiet: true,
    override: true
});

const {
    CLIENT_ORIGIN,
    MESSAGE_DB_FILE,
    MONGO_URI,
    PORT,
    UPLOAD_DIR
} = require("./config/serverConfig");
const { connectDatabase } = require("./config/database");
const { createJsonMessageStore } = require("./storage/jsonMessageStore");
const { createMongoMessageStore } = require("./storage/mongoMessageStore");
const { createSocketAuthMiddleware } = require("./middleware/socketAuth");
const { authenticateRequest } = require("./middleware/authMiddleware");
const {
    createSecurityMiddleware,
    generalRateLimiter
} = require("./middleware/securityMiddleware");
const {
    errorHandler,
    notFoundHandler
} = require("./middleware/errorMiddleware");
const { authRouter } = require("./routes/authRoutes");
const { createUploadRouter } = require("./routes/uploadRoutes");
const { registerChatSocket } = require("./socket/chatSocket");

const trustedMobileOrigins = new Set([
    "http://localhost",
    "https://localhost",
    "capacitor://localhost",
    "ionic://localhost"
]);

function isAllowedOrigin(origin) {
    if (!origin || origin === "null") {
        return true;
    }

    if (trustedMobileOrigins.has(origin)) {
        return true;
    }

    if (CLIENT_ORIGIN === "*") {
        return true;
    }

    return CLIENT_ORIGIN
        .split(",")
        .map((value) => value.trim())
        .includes(origin);
}

function corsOrigin(origin, callback) {
    callback(null, isAllowedOrigin(origin));
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: corsOrigin
    }
});

app.use(createSecurityMiddleware());
app.use(cors({ origin: corsOrigin }));
app.use(generalRateLimiter);
app.use(express.json({ limit: "5mb" }));
app.get("/health", (req, res) => {
    res.json({
        ok: true,
        service: "morse-chat-pro-api",
        environment: process.env.NODE_ENV || "development"
    });
});
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(authRouter);

async function startServer() {
    let messageStore;
    let connection = null;

    try {
        connection = await connectDatabase(MONGO_URI);

        if (!connection && process.env.NODE_ENV === "production") {
            throw new Error("MongoDB Atlas connection is required in production.");
        }

        messageStore = connection
            ? createMongoMessageStore()
            : createJsonMessageStore(MESSAGE_DB_FILE);
    } catch (error) {
        if (process.env.NODE_ENV === "production") {
            console.error("Production startup failed:", error.message);
            process.exit(1);
        }

        console.error("MongoDB connection failed. Continuing with JSON storage.");
        console.error(error.message);
        messageStore = createJsonMessageStore(MESSAGE_DB_FILE);
    }

    if (connection) {
        io.use(createSocketAuthMiddleware());
    }

    app.use(createUploadRouter(UPLOAD_DIR, connection ? authenticateRequest : null));
    app.use(notFoundHandler);
    app.use(errorHandler);

    registerChatSocket(io, messageStore);

    server.listen(PORT, () => {
        console.log(`Server Running On Port ${PORT}`);
    });
}

startServer();
