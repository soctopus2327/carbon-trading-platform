const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    message: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: ["BROADCAST", "MULTICAST", "UNICAST"],
        required: true
    },

    // Who sent it
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // Which companies received it
    recipients: [
        {
            company: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Company"
            },
            isRead: {
                type: Boolean,
                default: false
            },
            readAt: {
                type: Date,
                default: null
            }
        }
    ],

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Notification", notificationSchema);