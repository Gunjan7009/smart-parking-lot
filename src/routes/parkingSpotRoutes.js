const express = require("express");

const {
  createParkingSpot,
  getParkingSpots,
} = require("../controllers/parkingSpotController");

const router = express.Router();

// Create a parking spot
router.post("/", createParkingSpot);

// Get all parking spots, with optional filters
router.get("/", getParkingSpots);

module.exports = router;
