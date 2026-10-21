const express = require("express");

const {
  enterVehicle,
  exitVehicle,
  getParkingAvailability,
} = require("../controllers/parkingController");

const router = express.Router();

// Vehicle entry
router.post("/entry", enterVehicle);

// Vehicle exit
router.post("/exit", exitVehicle);

// Parking availability
router.get("/availability", getParkingAvailability);

module.exports = router;
