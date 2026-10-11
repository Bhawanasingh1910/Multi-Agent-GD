require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const requireAuth = require("./middleware/auth");

for (const name of ["MONGO_URI", "JWT_SECRET"]) {
    if (!process.env[name]) {
        console.error(`Missing ${name} in server/.env (or in the host's environment variables)`);
        process.exit(1);
    }
}

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Serve the frontend: http://localhost:5000/pages/index.html
app.use(express.static(path.join(__dirname, "../client")));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/sessions", require("./routes/sessionRoutes"));

// AI routes now need a logged-in user (protects your Groq/Gemini quota)
app.use("/api/ai", requireAuth, require("./routes/aiRoutes"));

app.get("/", (req, res) => res.redirect("/pages/index.html"));
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    });