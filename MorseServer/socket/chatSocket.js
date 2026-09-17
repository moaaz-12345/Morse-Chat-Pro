const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const Call = require("../models/Call");
const {
    hasMessageContent,
    sanitizeMessageId,
    sanitizeMessagePayload,
    sanitizeRoomName,
    sanitizeText
} = require("../utils/messageValidation");

const allowedReactions = ["❤️", "👍", "😂", "🔥"];

function createPrivateMessage(data) {
    return {
        id: uuidv4(),
        type: "private",
        from: data.from,
        to: data.to,
        morse: data.morse,
        text: data.text,
        avatar: data.avatar || null,
        time: data.time,
        status: "sent",
        image: data.image || null,
        audio: data.audio || null,
        file: data.file || null,
        replyTo: data.replyTo || null,
        reactions: {},
        pinned: false
    };
}

function createRoomMessage(data) {
    return {
        id: uuidv4(),
        type: "room",
        room: data.room,
        from: data.from,
        to: null,
        morse: data.morse,
        text: data.text,
        avatar: data.avatar || null,
        time: data.time,
        status: "sent",
        image: data.image || null,
        audio: data.audio || null,
        file: data.file || null,
        replyTo: data.replyTo || null,
        reactions: {},
        pinned: false
    };
}

function getReactionUsers(reactions, emoji) {
    if (!reactions) {
        return [];
    }

    if (typeof reactions.get === "function") {
        return reactions.get(emoji) || [];
    }

    return reactions[emoji] || [];
}

function setReactionUsers(reactions, emoji, users) {
    if (typeof reactions.set === "function") {
        reactions.set(emoji, users);
        return;
    }

    reactions[emoji] = users;
}

function registerChatSocket(io, messageStore) {
    let users = [];
    let lastSeen = {};
    const activeCalls = new Map();

    function isUserBusy(username) {
        return username && activeCalls.has(username);
    }

    function markUsersBusy(callId, ...usernames) {
        usernames
            .filter(Boolean)
            .forEach((username) => activeCalls.set(username, callId));
    }

    function clearBusyUsers(callId) {
        for (const [username, activeCallId] of activeCalls.entries()) {
            if (activeCallId === callId) {
                activeCalls.delete(username);
            }
        }
    }

    io.on("connection", (socket) => {
        socket.on("join", async (data = {}) => {
            const joinedUser = socket.user || {
                username: data.username,
                avatar: data.avatar
            };

            if (!joinedUser.username || joinedUser.username === "null") {
                socket.disconnect(true);
                return;
            }

            users = users.filter((user) => user.id !== socket.id);

            users.push({
                id: socket.id,
                username: joinedUser.username,
                avatar: joinedUser.avatar || null
            });

            await User.updateOne(
                { username: joinedUser.username },
                {
                    $set: {
                        isOnline: true,
                        lastSeen: null,
                        avatar: joinedUser.avatar || null
                    }
                }
            ).catch(() => {});

            io.emit("users-list", { users, lastSeen });
        });

        socket.on("message-delivered", (id) => {
            socket.broadcast.emit("message-status", {
                id: sanitizeMessageId(id),
                status: "✓✓ Delivered"
            });
        });

        socket.on("private-message", async (data, acknowledge) => {
            data = sanitizeMessagePayload(data);

            if (socket.user) {
                data.from = socket.user.username;
                data.avatar = socket.user.avatar;
            }

            if (!data.to || !hasMessageContent(data)) {
                return;
            }

            const message = await messageStore.add(createPrivateMessage(data));
            const targetUser = users.find((user) => user.username === data.to);
            let clientMessage = messageStore.toClient(message);

            if (targetUser) {
                message.status = "delivered";
                clientMessage = await messageStore.persist(message);
                io.to(targetUser.id).emit("receive-message", clientMessage);
            }

            if (typeof acknowledge === "function") {
                acknowledge(clientMessage);
            }
        });

        socket.on("join-room", (data) => {
            const room = sanitizeRoomName(data?.room || "");

            if (room) {
                socket.join(`room:${room}`);
            }
        });

        socket.on("room-message", async (data, acknowledge) => {
            data = sanitizeMessagePayload(data);

            if (!data.room) {
                return;
            }

            if (socket.user) {
                data.from = socket.user.username;
                data.avatar = socket.user.avatar;
            }

            if (!hasMessageContent(data)) {
                return;
            }

            const message = await messageStore.add(createRoomMessage(data));
            const clientMessage = messageStore.toClient(message);
            socket.to(`room:${data.room}`).emit("receive-room-message", clientMessage);

            if (typeof acknowledge === "function") {
                acknowledge(clientMessage);
            }
        });

        socket.on("load-room-history", async (room) => {
            room = sanitizeRoomName(room);
            const messages = await messageStore.all();
            const roomMessages = messages
                .filter((message) => message.type === "room" && message.room === room);

            socket.emit("room-history", roomMessages);
        });

        socket.on("message-seen", async (messageId) => {
            messageId = sanitizeMessageId(messageId);
            const message = await messageStore.findById(messageId);

            if (message) {
                message.status = "seen";
                await messageStore.persist(message);

                io.emit("message-status", {
                    id: messageId,
                    status: "seen"
                });
            }
        });

        socket.on("delete-message", async (messageId) => {
            messageId = sanitizeMessageId(messageId);
            const message = await messageStore.findById(messageId);

            if (!message) {
                return;
            }

            const currentUser = socket.user?.username;

            if (currentUser && message.from !== currentUser) {
                socket.emit("message-action-denied", {
                    id: messageId,
                    action: "delete",
                    error: "You can only delete your own messages."
                });
                return;
            }

            await messageStore.deleteById(messageId);
            io.emit("message-deleted", messageId);
        });

        socket.on("edit-message", async (data) => {
            const messageId = sanitizeMessageId(data.id);
            const nextMorse = sanitizeText(data.morse || "", 8000);
            const message = await messageStore.findById(messageId);

            if (message) {
                const currentUser = socket.user?.username;

                if (currentUser && message.from !== currentUser) {
                    socket.emit("message-action-denied", {
                        id: messageId,
                        action: "edit",
                        error: "You can only edit your own messages."
                    });
                    return;
                }

                message.morse = nextMorse;
                message.edited = true;
                const clientMessage = await messageStore.persist(message);

                io.emit("message-edited", clientMessage);
            }
        });

        socket.on("load-history", async (user) => {
            const currentUser = sanitizeText(typeof user === "string" ? user : user.username, 32);
            const withUser = typeof user === "object" ? sanitizeText(user.withUser, 32) : null;

            const messages = await messageStore.all();
            const userMessages = messages.filter((message) => {
                if (message.type === "room") {
                    return false;
                }

                if (withUser) {
                    return (
                        (message.from === currentUser && message.to === withUser) ||
                        (message.from === withUser && message.to === currentUser)
                    );
                }

                return message.from === currentUser || message.to === currentUser;
            });

            socket.emit("chat-history", userMessages);
        });

        socket.on("typing", (data) => {
            data = {
                from: sanitizeText(data?.from || "", 32),
                to: sanitizeText(data?.to || "", 32)
            };
            const targetUser = users.find((user) => user.username === data.to);

            if (targetUser) {
                io.to(targetUser.id).emit("user-typing", data);
            }
        });

        socket.on("react-message", async (data) => {
            data = {
                id: sanitizeMessageId(data?.id),
                emoji: data?.emoji,
                username: socket.user?.username || sanitizeText(data?.username || "", 32)
            };

            if (!allowedReactions.includes(data.emoji)) {
                return;
            }

            const message = await messageStore.findById(data.id);

            if (!message || !data.username) {
                return;
            }

            message.reactions = message.reactions || {};
            const reactionUsers = getReactionUsers(message.reactions, data.emoji);

            if (reactionUsers.includes(data.username)) {
                setReactionUsers(
                    message.reactions,
                    data.emoji,
                    reactionUsers.filter((user) => user !== data.username)
                );
            } else {
                setReactionUsers(message.reactions, data.emoji, [...reactionUsers, data.username]);
            }

            const clientMessage = await messageStore.persist(message);
            io.emit("message-reacted", clientMessage);
        });

        socket.on("pin-message", async (data) => {
            const messageId = sanitizeMessageId(data?.id);
            const pinnedBy = socket.user?.username || sanitizeText(data?.username || "", 32);
            const message = await messageStore.findById(messageId);

            if (!message) {
                return;
            }

            message.pinned = !message.pinned;
            message.pinnedBy = message.pinned ? pinnedBy || null : null;
            const clientMessage = await messageStore.persist(message);

            io.emit("message-pinned", clientMessage);
        });

        socket.on("call-offer", async (data) => {
            data = {
                ...data,
                to: sanitizeText(data?.to || "", 32),
                type: ["audio", "video", "screen"].includes(data?.type) ? data.type : "audio",
                callId: sanitizeMessageId(data?.callId || "")
            };
            const caller = socket.user?.username || data.from;
            const targetUser = users.find((user) => user.username === data.to);
            const callId = data.callId || uuidv4();

            if (isUserBusy(caller) || isUserBusy(data.to)) {
                socket.emit("call-busy", {
                    callId,
                    to: data.to,
                    reason: isUserBusy(caller) ? "caller-busy" : "user-busy"
                });
                return;
            }

            markUsersBusy(callId, caller, data.to);

            await Call.create({
                callId,
                from: caller,
                to: data.to,
                type: data.type || "audio",
                status: "ringing"
            }).catch(() => {});

            if (targetUser) {
                io.to(targetUser.id).emit("incoming-call", {
                    ...data,
                    callId,
                    from: caller
                });
            }
        });

        socket.on("call-answer", async (data) => {
            data = {
                ...data,
                from: socket.user?.username || sanitizeText(data?.from || "", 32),
                to: sanitizeText(data?.to || "", 32),
                callId: sanitizeMessageId(data?.callId || "")
            };
            const targetUser = users.find((user) => user.username === data.to);

            markUsersBusy(data.callId, socket.user?.username || data.from, data.to);

            await Call.updateOne(
                { callId: data.callId },
                {
                    $set: {
                        status: "answered",
                        answeredAt: new Date()
                    }
                }
            ).catch(() => {});

            if (targetUser) {
                io.to(targetUser.id).emit("call-answered", data);
            }
        });

        socket.on("ice-candidate", (data) => {
            data = {
                ...data,
                from: socket.user?.username || sanitizeText(data?.from || "", 32),
                to: sanitizeText(data?.to || "", 32),
                callId: sanitizeMessageId(data?.callId || "")
            };
            const targetUser = users.find((user) => user.username === data.to);

            if (targetUser) {
                io.to(targetUser.id).emit("ice-candidate", data);
            }
        });

        socket.on("call-video-frame", (data = {}) => {
            const targetUser = users.find((user) => user.username === sanitizeText(data?.to || "", 32));
            const frame = typeof data.frame === "string" ? data.frame : "";

            if (!targetUser || !frame.startsWith("data:image/jpeg;base64,") || frame.length > 180000) {
                return;
            }

            io.to(targetUser.id).emit("call-video-frame", {
                from: socket.user?.username || sanitizeText(data?.from || "", 32),
                callId: sanitizeMessageId(data?.callId || ""),
                frame
            });
        });

        socket.on("end-call", async (data) => {
            data = {
                ...data,
                from: socket.user?.username || sanitizeText(data?.from || "", 32),
                to: sanitizeText(data?.to || "", 32),
                callId: sanitizeMessageId(data?.callId || ""),
                reason: sanitizeText(data?.reason || "", 20)
            };
            const targetUser = users.find((user) => user.username === data.to);
            const endedAt = new Date();
            const call = data.callId
                ? await Call.findOne({ callId: data.callId }).catch(() => null)
                : null;
            const durationSeconds = call?.answeredAt
                ? Math.max(0, Math.round((endedAt - call.answeredAt) / 1000))
                : 0;

            if (call) {
                call.status = data.reason === "declined"
                    ? "declined"
                    : (call.answeredAt ? "ended" : "missed");
                call.endedAt = endedAt;
                call.durationSeconds = durationSeconds;
                await call.save().catch(() => {});
            }

            if (data.callId) {
                clearBusyUsers(data.callId);
            }

            if (targetUser) {
                io.to(targetUser.id).emit("call-ended", {
                    ...data,
                    durationSeconds
                });
            }
        });

        socket.on("load-call-history", async () => {
            const currentUser = socket.user?.username;

            if (!currentUser) {
                return;
            }

            const calls = await Call.find({
                $or: [
                    { from: currentUser },
                    { to: currentUser }
                ]
            })
                .sort({ createdAt: -1 })
                .limit(30)
                .lean()
                .catch(() => []);

            socket.emit("call-history", calls);
        });

        socket.on("disconnect", () => {
            const user = users.find((connectedUser) => connectedUser.id === socket.id);

            if (user) {
                const activeCallId = activeCalls.get(user.username);

                if (activeCallId) {
                    clearBusyUsers(activeCallId);
                }

                const seenAt = new Date();
                lastSeen[user.username] = seenAt.toLocaleTimeString();

                User.updateOne(
                    { username: user.username },
                    {
                        $set: {
                            isOnline: false,
                            lastSeen: seenAt
                        }
                    }
                ).catch(() => {});
            }

            users = users.filter((connectedUser) => connectedUser.id !== socket.id);
            io.emit("users-list", { users, lastSeen });
        });
    });
}

module.exports = {
    registerChatSocket
};
