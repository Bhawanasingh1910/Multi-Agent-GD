const express = require("express");
const router = express.Router();

const {
    generateDiscussion
} = require("../controllers/aiController");

router.post("/discussion", generateDiscussion);

module.exports = router;