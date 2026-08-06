const express = require("express");
const router = express.Router();

const {
    startDiscussion,
    nextTurn,
    userMessage
} = require("../controllers/aiController");

router.post("/discussion/start", startDiscussion);

router.post("/discussion/next", nextTurn);

router.post("/discussion/user", userMessage);

module.exports = router;