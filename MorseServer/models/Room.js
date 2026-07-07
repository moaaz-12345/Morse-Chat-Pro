const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 2,
            maxlength: 40
        },
        description: {
            type: String,
            default: "",
            maxlength: 160
        },
        members: {
            type: [String],
            default: []
        },
        createdBy: {
            type: String,
            default: null
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Room", roomSchema);
