let mongoose = require('mongoose');

let topSchema = new mongoose.Schema({
    sbd: {
        unique: true,
        type: String
    },
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    group: {
        type: String,
        required: true,
    },
    bocauhoi: {
        type: String,
        required: true,
    },
    mark: {
        type: Number,
        required: true,
    },
    time: {
        type: Number,
        required: true
    },
    starttime: {
        type: Number,
        required: true
    },
    endtime: {
        type: Number,
        required: true
    },
});

let Top = mongoose.model('Top', topSchema);

module.exports = Top;