// models/AdvisorConversation.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  sources: [String],
  metadata: mongoose.Schema.Types.Mixed,
});

const advisorConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
      sparse: true,
    },
    title: {
      type: String,
      default: 'New chat',
      trim: true,
      maxlength: 100,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // you are manually managing timestamps
  }
);

// ✅ FIXED: Removed `next` completely
advisorConversationSchema.pre('save', function () {
  this.lastActive = new Date();

  // Generate title only if still default
  if (this.title === 'New chat' && this.messages?.length > 0) {
    const firstUserMessage = this.messages.find((m) => m.role === 'user');

    if (firstUserMessage?.content) {
      const cleaned = firstUserMessage.content
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s.,!?'-]/g, '');

      this.title =
        cleaned.substring(0, 70) +
        (cleaned.length > 70 ? '...' : '');
    }
  }
});

// Virtual for message count
advisorConversationSchema.virtual('messageCount').get(function () {
  return this.messages?.length || 0;
});

// Include virtuals in output
advisorConversationSchema.set('toJSON', { virtuals: true });
advisorConversationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model(
  'AdvisorConversation',
  advisorConversationSchema
);