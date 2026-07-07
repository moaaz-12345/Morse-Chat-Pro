const Message = require("../models/Message");
const { normalizeMessageForDb, toClientMessage } = require("../utils/messageMapper");

function createMongoMessageStore() {
    async function all() {
        const messages = await Message.find({ deletedAt: null })
            .sort({ createdAt: 1 })
            .lean();

        return messages.map(toClientMessage);
    }

    async function add(message) {
        return Message.create(normalizeMessageForDb(message));
    }

    async function findById(id) {
        return Message.findOne({ id, deletedAt: null });
    }

    async function deleteById(id) {
        await Message.deleteOne({ id });
    }

    async function replaceAll(nextMessages) {
        await Message.deleteMany({});
        await Message.insertMany(nextMessages.map(normalizeMessageForDb));
        return all();
    }

    async function persist(message) {
        if (message && typeof message.save === "function") {
            await message.save();
        }

        return toClientMessage(message);
    }

    return {
        all,
        add,
        findById,
        deleteById,
        replaceAll,
        persist,
        toClient: toClientMessage
    };
}

module.exports = {
    createMongoMessageStore
};
