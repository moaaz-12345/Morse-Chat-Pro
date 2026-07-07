const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
    {
        messageId: {
            type: String,
            required: true,
            index: true
        },
        emoji: {
            type: String,
            enum: ["❤️", "👍", "😂", "🔥"],
            required: true
        },
        username: {
            type: String,
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

reactionSchema.index({ messageId: 1, emoji: 1, username: 1 }, { unique: true });

module.exports = mongoose.model("Reaction", reactionSchema);
