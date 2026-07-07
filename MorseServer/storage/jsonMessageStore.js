const fs = require("fs");
const { toClientMessage } = require("../utils/messageMapper");

function createJsonMessageStore(filePath) {
    let messages = [];

    if (fs.existsSync(filePath)) {
        messages = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    function save() {
        fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
    }

    function all() {
        return messages.map(toClientMessage);
    }

    function add(message) {
        messages.push(message);
        save();
        return message;
    }

    function findById(id) {
        return messages.find((message) => message.id === id);
    }

    function replaceAll(nextMessages) {
        messages = nextMessages;
        save();
        return messages.map(toClientMessage);
    }

    function deleteById(id) {
        messages = messages.filter((message) => message.id !== id);
        save();
    }

    function persist(message) {
        save();
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
    createJsonMessageStore
};
