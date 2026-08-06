require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const aiRoutes = require("./routes/aiRoutes");

app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {

    res.send("Multi-Agent GD API Running");

});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});