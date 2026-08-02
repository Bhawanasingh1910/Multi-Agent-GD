require("dotenv").config();

const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(5000, () => {
  console.log("Server running...");
});

setInterval(() => {
  console.log("Still alive...");
}, 5000);