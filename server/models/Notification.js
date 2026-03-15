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
        enum: ["BROADCAST", "MULTICAST", "UNICAST", "PAYMENT_REMINDER"],
        required: true
    },

    // Who sent it
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
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

    // For payment reminders
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction"
    },

    dueDate: {
        type: Date
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Notification", notificationSchema);