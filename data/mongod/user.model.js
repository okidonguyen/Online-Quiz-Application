let mongoose = require("mongoose");

let userSchema = new mongoose.Schema({
    sbd: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    shkb: {
        type: String,
        required: true
    },
    group: {
        type: String,
        required: true
    },
    grouptype: {
        type: String,
        required: true
    }
});

let User = mongoose.model("User", userSchema);

module.exports = User;