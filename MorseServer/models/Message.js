const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
    {
        id: String,
        text: String,
        morse: String
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        // Public id is kept for compatibility with the current frontend and Socket.IO payloads.
        id: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        type: {
            type: String,
            enum: ["private", "room"],
            required: true,
            default: "private"
        },
        room: {
            type: String,
            default: null,
            index: true
        },
        from: {
            type: String,
            default: null,
            index: true
        },
        to: {
            type: String,
            default: null,
            index: true
        },
        text: {
            type: String,
            default: ""
        },
        morse: {
            type: String,
            default: ""
        },
        avatar: {
            type: String,
            default: null
        },
        time: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["sent", "delivered", "seen", "✓✓ Delivered"],
            default: "sent"
        },
        image: {
            type: String,
            default: null
        },
        audio: {
            type: String,
            default: null
        },
        file: {
            path: {
                type: String,
                default: null
            },
            originalName: {
                type: String,
                default: ""
            },
            mimeType: {
                type: String,
                default: ""
            },
            size: {
                type: Number,
                default: 0
            }
        },
        replyTo: {
            type: replySchema,
            default: null
        },
        reactions: {
            type: Map,
            of: [String],
            default: {}
        },
        pinned: {
            type: Boolean,
            default: false
        },
        pinnedBy: {
            type: String,
            default: null
        },
        edited: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

messageSchema.index({ type: 1, room: 1, createdAt: 1 });
messageSchema.index({ from: 1, to: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
