require("dotenv").config();

const express = require("express");
const errorHandler = require("./middlewares/errorHandler");
const parkingSpotRoutes = require("./routes/parkingSpotRoutes");
const parkingRoutes = require("./routes/parkingRoutes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Smart Parking Lot API is running",
  });
});

app.use("/api/spots", parkingSpotRoutes);
app.use("/api/parking", parkingRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use(errorHandler);

module.exports = app;
