require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend so the whole app runs from one command:
// http://localhost:5000/pages/index.html
app.use(express.static(path.join(__dirname, "../client")));

const aiRoutes = require("./routes/aiRoutes");

app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {

    res.send("Multi-Agent GD API Running");

});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});