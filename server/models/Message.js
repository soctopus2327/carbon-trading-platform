const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  // Subject/title of the message thread
  subject: {
    type: String,
    required: true
  },

  body: {
    type: String,
    required: true
  },

  // "PLATFORM_TO_COMPANY" or "COMPANY_TO_PLATFORM"
  direction: {
    type: String,
    enum: ["PLATFORM_TO_COMPANY", "COMPANY_TO_PLATFORM"],
    required: true
  },

  // BROADCAST = all companies, MULTICAST = multiple, UNICAST = one
  broadcastType: {
    type: String,
    enum: ["BROADCAST", "MULTICAST", "UNICAST"],
    default: null
  },

  // Sender info
  senderCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    default: null  // null if sent by platform admin
  },
  senderUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // For platform→company messages: which companies receive it
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

  // For company→platform messages: admin read status
  adminRead: {
    type: Boolean,
    default: false
  },
  adminReadAt: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Message", messageSchema);