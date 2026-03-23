const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema({

    company: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true

    },

    auditor: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true

    },

    emissionLevel: Number,

    report: String,

    status: {
        type: String,
        enum: ["PENDING", "GENERATED", "FAILED"],
        default: "PENDING"
    },

    reportPeriod: String,

    sourceDocumentPath: String,

    sourceDocumentName: String,

    summary: String,

    findings: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    recommendations: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    riskLevel: {
        type: String,
        default: "MEDIUM"
    },

    limitations: {
        type: [String],
        default: []
    },

    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    generatedAt: Date,

    errorMessage: String,

    createdAt: {

        type: Date,
        default: Date.now

    }

});

module.exports = mongoose.model("Audit", auditSchema);