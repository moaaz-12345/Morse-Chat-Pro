require("dotenv").config({ quiet: true, override: true });

const fs = require("fs");
const mongoose = require("mongoose");

const { MESSAGE_DB_FILE, MONGO_URI } = require("../config/serverConfig");
const { connectDatabase } = require("../config/database");
const Message = require("../models/Message");
const { normalizeMessageForDb } = require("../utils/messageMapper");

function normalizeLegacyMessage(message) {
    return normalizeMessageForDb({
        ...message,
        type: message.type || (message.room ? "room" : "private"),
        text: message.text || "",
        image: message.image || null,
        audio: message.audio || null,
        replyTo: message.replyTo || null,
        reactions: message.reactions || {},
        pinned: Boolean(message.pinned),
        edited: Boolean(message.edited)
    });
}

async function migrateMessagesToMongo() {
    if (!MONGO_URI) {
        throw new Error("MONGO_URI is required to run migration.");
    }

    if (!fs.existsSync(MESSAGE_DB_FILE)) {
        throw new Error(`messages.json was not found at ${MESSAGE_DB_FILE}`);
    }

    await connectDatabase(MONGO_URI);

    const legacyMessages = JSON.parse(fs.readFileSync(MESSAGE_DB_FILE, "utf8"));
    const normalizedMessages = legacyMessages
        .filter((message) => message && message.id)
        .map(normalizeLegacyMessage);

    let inserted = 0;
    let skipped = 0;

    for (const message of normalizedMessages) {
        const result = await Message.updateOne(
            { id: message.id },
            { $setOnInsert: message },
            { upsert: true }
        );

        if (result.upsertedCount > 0) {
            inserted += 1;
        } else {
            skipped += 1;
        }
    }

    console.log(`Migration complete. Inserted: ${inserted}. Skipped existing: ${skipped}.`);
    await mongoose.connection.close();
}

migrateMessagesToMongo().catch(async (error) => {
    console.error("Migration failed:", error.message);

    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }

    process.exit(1);
});
