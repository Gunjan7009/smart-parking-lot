const mongoose = require("mongoose");
const VEHICLE_TYPES = require("../constants/vehicleTypes");

const parkingTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    vehicleNumberPlate: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      required: true,
      enum: VEHICLE_TYPES,
    },
    spotId: {
      type: String,
      required: true,
    },
    floorNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    entryTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    fee: {
      type: Number,
      default: null,
      min: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true },

);

parkingTicketSchema.index(
  { vehicleNumberPlate: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" },
  },
);

module.exports = mongoose.model("ParkingTicket", parkingTicketSchema);
