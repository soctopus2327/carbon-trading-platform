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

    createdAt: {

        type: Date,
        default: Date.now

    }

});

module.exports = mongoose.model("Transaction", transactionSchema);