const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(u) {
    return { name: u.name, email: u.email, college: u.college || "", language: u.language || "English" };
}

function makeToken(user) {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/signup", async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!name) return res.status(400).json({ success: false, message: "Please enter your name." });
        if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, message: "Please enter a valid email." });
        if (password.length < 6) return res.status(400).json({ success: false, message: "Password must contain at least 6 characters." });

        if (await User.findOne({ email })) {
            return res.status(400).json({ success: false, message: "An account with this email already exists. Please login." });
        }

        const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });

        res.json({ success: true, token: makeToken(user), user: publicUser(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Signup failed. Try again." });
    }
});

router.post("/login", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ success: false, message: "No account found with this email. Please sign up." });

        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ success: false, message: "Incorrect password." });
        }

        res.json({ success: true, token: makeToken(user), user: publicUser(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Login failed. Try again." });
    }
});

router.get("/me", requireAuth, async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ success: false, message: "Please log in." });
    res.json({ success: true, user: publicUser(user) });
});

router.put("/me", requireAuth, async (req, res) => {
    try {
        const changes = {};
        for (const key of ["name", "college", "language"]) {
            if (typeof req.body[key] === "string") changes[key] = req.body[key].trim();
        }
        if (changes.name === "") delete changes.name;

        const user = await User.findByIdAndUpdate(req.userId, changes, { new: true });
        res.json({ success: true, user: publicUser(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Could not update profile." });
    }
});

module.exports = router;