const mongoose = require("mongoose");
const VEHICLE_TYPES = require("../constants/vehicleTypes");

const parkingSpotSchema = new mongoose.Schema(
  {
    spotId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    floorNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    supportedVehicleType: {
      type: String,
      required: true,
      enum: VEHICLE_TYPES,
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
    vehicleNumberPlate: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
  },
  { timestamps: true },
);

parkingSpotSchema.index({
  supportedVehicleType: 1,
  isOccupied: 1,
  floorNumber: 1,
  spotId: 1,
});

module.exports = mongoose.model("ParkingSpot", parkingSpotSchema);
