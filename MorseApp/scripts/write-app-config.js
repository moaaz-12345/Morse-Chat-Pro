const fs = require("fs");
const path = require("path");

const mode = process.argv[2] || process.env.NODE_ENV || "development";
const isProduction = mode === "production";
const serverUrl = process.env.MORSE_SERVER_URL || (isProduction
    ? "https://your-production-backend.example.com"
    : "http://localhost:3000");

if (isProduction && serverUrl.includes("your-production-backend.example.com")) {
    throw new Error("MORSE_SERVER_URL must be set before creating a production build.");
}

const target = path.resolve(__dirname, "..", "JS", "app-config.js");
const content = `window.MORSE_CHAT_CONFIG = {
    serverUrl: ${JSON.stringify(serverUrl.replace(/\/$/, ""))},
    environment: ${JSON.stringify(isProduction ? "production" : "development")}
};
`;

fs.writeFileSync(target, content, "utf8");
console.log(`Wrote ${target}`);
console.log(`Morse Chat Pro frontend points to ${serverUrl}`);
