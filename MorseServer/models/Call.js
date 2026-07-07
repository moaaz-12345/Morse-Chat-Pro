const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
    {
        callId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        from: {
            type: String,
            required: true,
            index: true
        },
        to: {
            type: String,
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: ["audio", "video", "screen"],
            required: true
        },
        status: {
            type: String,
            enum: ["ringing", "answered", "ended", "missed", "declined"],
            default: "ringing"
        },
        startedAt: {
            type: Date,
            default: Date.now
        },
        answeredAt: {
            type: Date,
            default: null
        },
        endedAt: {
            type: Date,
            default: null
        },
        durationSeconds: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

callSchema.index({ from: 1, to: 1, createdAt: -1 });

module.exports = mongoose.model("Call", callSchema);
