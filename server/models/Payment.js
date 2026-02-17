const mongoose = require("mongoose");

const { PAYMENT_STATUS } = require("./enums");

const paymentSchema = new mongoose.Schema({

    transaction: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        required: true

    },

    amount: {

        type: Number,
        required: true

    },

    paymentMode: String,

    status: {

        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING

    },

    paidAt: Date,

    createdAt: {

        type: Date,
        default: Date.now

    }

});

module.exports = mongoose.model("Payment", paymentSchema);