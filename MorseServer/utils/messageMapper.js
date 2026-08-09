function mapReactions(reactions) {
    if (!reactions) {
        return {};
    }

    if (reactions instanceof Map) {
        return Object.fromEntries(reactions);
    }

    return reactions;
}

function toClientMessage(message) {
    if (!message) {
        return null;
    }

    const plainMessage = typeof message.toObject === "function"
        ? message.toObject()
        : message;

    return {
        id: plainMessage.id,
        type: plainMessage.type || (plainMessage.room ? "room" : "private"),
        room: plainMessage.room || null,
        from: plainMessage.from || null,
        to: plainMessage.to || null,
        morse: plainMessage.morse || "",
        text: plainMessage.text || "",
        avatar: plainMessage.avatar || null,
        time: plainMessage.time || "",
        status: plainMessage.status || "sent",
        image: plainMessage.image || null,
        audio: plainMessage.audio || null,
        file: plainMessage.file?.path ? plainMessage.file : null,
        replyTo: plainMessage.replyTo || null,
        reactions: mapReactions(plainMessage.reactions),
        pinned: Boolean(plainMessage.pinned),
        pinnedBy: plainMessage.pinnedBy || null,
        edited: Boolean(plainMessage.edited),
        createdAt: plainMessage.createdAt || null
    };
}

function normalizeMessageForDb(message) {
    return {
        id: message.id,
        type: message.type || (message.room ? "room" : "private"),
        room: message.room || null,
        from: message.from || null,
        to: message.to || null,
        morse: message.morse || "",
        text: message.text || "",
        avatar: message.avatar || null,
        time: message.time || "",
        status: message.status || "sent",
        image: message.image || null,
        audio: message.audio || null,
        file: message.file?.path ? message.file : null,
        replyTo: message.replyTo || null,
        reactions: mapReactions(message.reactions),
        pinned: Boolean(message.pinned),
        pinnedBy: message.pinnedBy || null,
        edited: Boolean(message.edited)
    };
}

module.exports = {
    normalizeMessageForDb,
    toClientMessage
};
