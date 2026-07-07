const reservedUsernames = new Set(["null", "undefined", "guest", "admin", "system"]);
const MAX_REMOTE_AVATAR_LENGTH = 2000;
const MAX_DATA_IMAGE_AVATAR_LENGTH = 750000;

function normalizeUsername(username = "") {
    return String(username).trim();
}

function normalizePassword(password = "") {
    return String(password || "");
}

function sanitizeProfileText(value = "", maxLength = 180) {
    return String(value || "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim()
        .slice(0, maxLength);
}

function sanitizeAvatar(value = "") {
    const avatar = String(value || "").trim();

    if (!avatar) {
        return null;
    }

    if (avatar.startsWith("/uploads/") && !avatar.includes("..")) {
        return avatar.slice(0, 300);
    }

    try {
        const url = new URL(avatar);
        const isRemoteAvatar = ["http:", "https:"].includes(url.protocol)
            && avatar.length <= MAX_REMOTE_AVATAR_LENGTH;
        const isImageDataAvatar = avatar.startsWith("data:image/")
            && avatar.length <= MAX_DATA_IMAGE_AVATAR_LENGTH;

        if (isRemoteAvatar || isImageDataAvatar) {
            return avatar;
        }
    } catch {
        return null;
    }

    return null;
}

function validateUsername(username) {
    const normalized = normalizeUsername(username);
    const lowered = normalized.toLowerCase();

    if (normalized.length < 3 || normalized.length > 32) {
        return "Username must be 3 to 32 characters.";
    }

    if (reservedUsernames.has(lowered)) {
        return "This username is reserved.";
    }

    if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
        return "Username can only contain letters, numbers, and underscores.";
    }

    return null;
}

module.exports = {
    normalizeUsername,
    normalizePassword,
    sanitizeAvatar,
    sanitizeProfileText,
    validateUsername
};
