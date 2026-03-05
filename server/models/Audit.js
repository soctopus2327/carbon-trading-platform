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

    createdAt: {

        type: Date,
        default: Date.now

    }

});

module.exports = mongoose.model("Audit", auditSchema);