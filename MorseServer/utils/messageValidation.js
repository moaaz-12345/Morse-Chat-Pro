const MAX_TEXT_LENGTH = 4000;
const MAX_MORSE_LENGTH = 8000;
const MAX_ROOM_LENGTH = 40;
const MAX_MESSAGE_ID_LENGTH = 80;

function sanitizeText(value = "", maxLength = MAX_TEXT_LENGTH) {
    return String(value)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim()
        .slice(0, maxLength);
}

function sanitizeMessageId(value = "") {
    return sanitizeText(value, MAX_MESSAGE_ID_LENGTH);
}

function sanitizeRoomName(value = "") {
    return sanitizeText(value, MAX_ROOM_LENGTH)
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .trim();
}

function sanitizeAttachmentPath(value) {
    const path = sanitizeText(value || "", 300);

    if (!path || !path.startsWith("/uploads/") || path.includes("..")) {
        return null;
    }

    return path;
}

function sanitizeFileMetadata(file) {
    if (!file || typeof file !== "object") {
        return null;
    }

    const path = sanitizeAttachmentPath(file.path);

    if (!path) {
        return null;
    }

    return {
        path,
        originalName: sanitizeText(file.originalName || "Attachment", 180),
        mimeType: sanitizeText(file.mimeType || "application/octet-stream", 120),
        size: Math.max(0, Math.min(Number(file.size) || 0, 50 * 1024 * 1024))
    };
}

function sanitizeReply(replyTo) {
    if (!replyTo || typeof replyTo !== "object") {
        return null;
    }

    return {
        id: sanitizeMessageId(replyTo.id),
        text: sanitizeText(replyTo.text || "", 500),
        morse: sanitizeText(replyTo.morse || "", 1000)
    };
}

function sanitizeMessagePayload(data = {}) {
    return {
        ...data,
        to: sanitizeText(data.to || "", 32),
        room: sanitizeRoomName(data.room || ""),
        text: sanitizeText(data.text || "", MAX_TEXT_LENGTH),
        morse: sanitizeText(data.morse || "", MAX_MORSE_LENGTH),
        image: sanitizeAttachmentPath(data.image),
        audio: sanitizeAttachmentPath(data.audio),
        file: sanitizeFileMetadata(data.file),
        replyTo: sanitizeReply(data.replyTo),
        time: sanitizeText(data.time || "", 40)
    };
}

function hasMessageContent(message) {
    return Boolean(message.text || message.morse || message.image || message.audio || message.file);
}

module.exports = {
    hasMessageContent,
    sanitizeMessageId,
    sanitizeMessagePayload,
    sanitizeRoomName,
    sanitizeText
};
