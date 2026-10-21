const ParkingSpot = require("../models/ParkingSpot");

const VEHICLE_TYPES = require("../constants/vehicleTypes");

async function createParkingSpot(req, res) {
  try {
    const { spotId, floorNumber, supportedVehicleType } = req.body || {};

    if (typeof spotId !== "string" || !spotId.trim()) {
      return res.status(400).json({
        message: "Spot ID is required",
      });
    }

    if (!Number.isInteger(floorNumber) || floorNumber < 1) {
      return res.status(400).json({
        message: "Floor number must be a positive integer",
      });
    }

    if (!VEHICLE_TYPES.includes(supportedVehicleType)) {
      return res.status(400).json({
        message: "Invalid supported vehicle type",
      });
    }

    const parkingSpot = await ParkingSpot.create({
      spotId: spotId.trim(),
      floorNumber,
      supportedVehicleType,
    });

    return res.status(201).json({
      message: "Parking spot created successfully",
      parkingSpot,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A parking spot with this ID already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create parking spot",
    });
  }
}

async function getParkingSpots(req, res, next) {
  try {
    const filter = {};

    if (req.query.floorNumber !== undefined) {
      const floorNumber = Number(req.query.floorNumber);

      if (!Number.isInteger(floorNumber) || floorNumber < 1) {
        return res.status(400).json({
          message: "Invalid floor number",
        });
      }

      filter.floorNumber = floorNumber;
    }

    if (req.query.vehicleType !== undefined) {
      if (!VEHICLE_TYPES.includes(req.query.vehicleType)) {
        return res.status(400).json({
          message: "Invalid vehicle type",
        });
      }

      filter.supportedVehicleType = req.query.vehicleType;
    }

    if (req.query.status === "available") {
      filter.isOccupied = false;
    } else if (req.query.status === "occupied") {
      filter.isOccupied = true;
    } else if (req.query.status !== undefined) {
      return res.status(400).json({
        message: "Status must be available or occupied",
      });
    }

    const parkingSpots = await ParkingSpot.find(filter).sort({
      floorNumber: 1,
      spotId: 1,
    });

    return res.status(200).json({
      count: parkingSpots.length,
      parkingSpots,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createParkingSpot,
  getParkingSpots,
};
