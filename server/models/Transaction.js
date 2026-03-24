const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({

    buyerCompany: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true

    },

    sellerCompany: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true

    },

    listing: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "TradeListing"

    },

    credits: {

        type: Number,
        required: true

    },

    pricePerCredit: {

        type: Number,
        required: true

    },

    totalAmount: {

        type: Number,
        required: true

    },
    discountApplied: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED"],
        default: "SUCCESS"
    },

    payLater: {
        type: Boolean,
        default: false
    },

    payLaterDate: {
        type: Date,
        default: null
    },

    payLaterPaymentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PayLaterPayment",
        default: null
    },

    createdAt: {

        type: Date,
        default: Date.now

    }

});

module.exports = mongoose.model("Transaction", transactionSchema);