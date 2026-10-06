const express = require("express");
const router = express.Router();

const {
    startDiscussion,
    nextTurn,
    userMessage,
    feedback
} = require("../controllers/aiController");

router.post("/discussion/start", startDiscussion);

router.post("/discussion/next", nextTurn);

router.post("/discussion/user", userMessage);

router.post("/discussion/feedback", feedback);

module.exports = router;
