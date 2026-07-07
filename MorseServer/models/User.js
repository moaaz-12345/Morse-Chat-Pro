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
        passwordHash: {
            type: String,
            required: true
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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
