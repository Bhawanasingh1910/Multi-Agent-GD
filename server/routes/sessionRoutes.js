const express = require("express");
const Session = require("../models/Session");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

// Remove database-only fields before sending to the browser
function clean(doc) {
    const { _id, __v, userId, createdAt, updatedAt, ...rest } = doc;
    return rest;
}

// All of this user's sessions (history)
router.get("/", async (req, res) => {
    try {
        const list = await Session.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
        res.json({ success: true, sessions: list.map(clean) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Could not load history." });
    }
});

// Create or update one session (same id = update)
router.put("/:id", async (req, res) => {
    try {
        const body = { ...req.body };
        delete body._id; delete body.userId; delete body.__v;
        body.id = req.params.id;

        await Session.findOneAndUpdate(
            { userId: req.userId, id: req.params.id },
            { $set: body },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Could not save session." });
    }
});

router.delete("/:id", async (req, res) => {
    await Session.deleteOne({ userId: req.userId, id: req.params.id });
    res.json({ success: true });
});

module.exports = router;