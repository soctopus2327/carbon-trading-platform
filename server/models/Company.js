const mongoose = require("mongoose");

const { COMPANY_TYPE, COMPANY_STATUS } = require("./enums");

const companySchema = new mongoose.Schema({

    name: {

        type: String,
        required: true

    },

    companyType: {

        type: String,
        enum: Object.values(COMPANY_TYPE),
        required: true

    },

    status: {

        type: String,
        enum: Object.values(COMPANY_STATUS),
        default: COMPANY_STATUS.PENDING

    },

    registrationNumber: String,

    location: String,
allianceMemberships: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alliance"
    }
  ],


    /*
    Alliance Structure
    */

    parentCompany: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        default: null

    },

    allianceMembers: [

        {

            type: mongoose.Schema.Types.ObjectId,
            ref: "Company"

        }

    ],



    /*
    Carbon data
    */

    carbonCredits: {

        type: Number,
        default: 0

    },

    emissionLevel: {

        type: Number,
        default: 0

    },



    /*
    Wallet / Gamification
    */

    points: {

        type: Number,
        default: 0

    },

    coins: {           // NEW: earned coins, used for discounts
    type: Number,
    default: 0
},

    /*
    Pay Later / Simple Credit
    */

    currentPayLaterDebt: {
        type: Number,
        default: 0,
        description: "Total amount currently owed through pay later transactions"
    },

    payLaterLimit: {
        type: Number,
        default: 500000,
        description: "Maximum amount company can borrow via pay later"
    },


    /*
    AI ready fields
    */

    carbonBenchmark: Number,

    aiRecommendation: String,

    riskScore: Number,



    /*
    Verification
    */

    verifiedBy: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "User"

    },

    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],



    createdAt: {

        type: Date,
        default: Date.now

    }

});

module.exports = mongoose.model("Company", companySchema);
