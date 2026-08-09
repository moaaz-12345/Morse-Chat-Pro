const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 32,
            match: /^[a-zA-Z0-9_]+$/
        },
        displayName: {
            type: String,
            trim: true,
            maxlength: 60,
            default: ""
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            lowercase: true,
            maxlength: 254
        },
        phone: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            maxlength: 20
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },
        passwordHash: {
            type: String,
            default: null
        },
        avatar: {
            type: String,
            default: null,
            maxlength: 750000
        },
        bio: {
            type: String,
            default: "",
            maxlength: 180
        },
        status: {
            type: String,
            default: "Available",
            maxlength: 80
        },
        lastSeen: {
            type: Date,
            default: null
        },
        isOnline: {
            type: Boolean,
            default: false
        },
        mutedUsers: {
            type: [String],
            default: []
        },
        blockedUsers: {
            type: [String],
            default: []
        },
        blockWindows: {
            type: [
                {
                    username: {
                        type: String,
                        required: true
                    },
                    blockedAt: {
                        type: Date,
                        required: true
                    },
                    unblockedAt: {
                        type: Date,
                        default: null
                    }
                }
            ],
            default: []
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
