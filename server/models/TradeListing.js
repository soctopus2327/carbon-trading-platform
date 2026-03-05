const mongoose = require("mongoose");

const { LISTING_STATUS } = require("./enums");

const tradeListingSchema = new mongoose.Schema({

    sellerCompany: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true

    },

    pricePerCredit: {

        type: Number,
        required: true

    },

    quantity: {

        type: Number,
        required: true

    },

    remainingQuantity: {

        type: Number,
        required: true

    },

    status: {

        type: String,
        enum: Object.values(LISTING_STATUS),
        default: LISTING_STATUS.ACTIVE

    },

    createdAt: {

        type: Date,
        default: Date.now

    }

});

module.exports = mongoose.model("TradeListing", tradeListingSchema);