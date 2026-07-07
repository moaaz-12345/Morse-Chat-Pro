const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const MONGO_URI = process.env.MONGO_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const MESSAGE_DB_FILE = path.join(ROOT_DIR, "messages.json");

if (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters in production.");
}

module.exports = {
    ROOT_DIR,
    PORT,
    CLIENT_ORIGIN,
    MONGO_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    UPLOAD_DIR,
    MESSAGE_DB_FILE
};
