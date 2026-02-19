const mongoose = require("mongoose");

const { USER_ROLE } = require("./enums");

const userSchema = new mongoose.Schema({

    name: {

        type: String,
        required: true

    },

    email: {

        type: String,
        required: true,
        unique: true

    },

    password: {

        type: String,
        required: true

    },

    role: {

        type: String,
        enum: Object.values(USER_ROLE),
        required: true

    },

    company: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true

    },



    /*
    Permission Codes
    */

    traderCode: String,

    auditorCode: String,



    points: {

        type: Number,
        default: 0

    },



    createdAt: {

        type: Date,
        default: Date.now

    }

});

module.exports = mongoose.model("User", userSchema);