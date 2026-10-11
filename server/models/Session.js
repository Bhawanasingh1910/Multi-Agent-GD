const mongoose = require("mongoose");

// strict:false -> the whole session object the frontend already builds
// (topic, transcript, feedback, ...) is stored exactly as it is.
const sessionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        id: { type: String, required: true }
    },
    { strict: false, timestamps: true }
);

sessionSchema.index({ userId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model("Session", sessionSchema);