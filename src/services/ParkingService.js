const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const ParkingSpot = require("../models/ParkingSpot");
const ParkingTicket = require("../models/ParkingTicket");
const { calculateFee } = require("./FeeCalculator");
const VEHICLE_TYPES = require("../constants/vehicleTypes");

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Vehicle entry: reserve a spot and create a ticket atomically.
async function enterVehicle(vehicleNumberPlate, vehicleType) {
  if (typeof vehicleNumberPlate !== "string" || !vehicleNumberPlate.trim()) {
    throw createError("Vehicle number plate is required");
  }

  if (!VEHICLE_TYPES.includes(vehicleType)) {
    throw createError("Invalid vehicle type");
  }

  const plate = vehicleNumberPlate.trim().toUpperCase();
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const existingTicket = await ParkingTicket.findOne({
        vehicleNumberPlate: plate,
        status: "ACTIVE",
      }).session(session);

      if (existingTicket) {
        throw createError("Vehicle is already parked", 409);
      }

      const allocatedSpot = await ParkingSpot.findOneAndUpdate(
        {
          supportedVehicleType: vehicleType,
          isOccupied: false,
        },
        {
          $set: {
            isOccupied: true,
            vehicleNumberPlate: plate,
          },
        },
        {
          sort: { floorNumber: 1, spotId: 1 },
          returnDocument: "after",
          session,
        },
      );

      if (!allocatedSpot) {
        throw createError("No compatible parking spot available", 409);
      }

      const [ticket] = await ParkingTicket.create(
        [
          {
            ticketId: randomUUID(),
            vehicleNumberPlate: plate,
            vehicleType,
            spotId: allocatedSpot.spotId,
            floorNumber: allocatedSpot.floorNumber,
            entryTime: new Date(),
            status: "ACTIVE",
          },
        ],
        { session },
      );

      result = {
        message: "Vehicle parked successfully",
        ticket,
      };
    });

    return result;
  } catch (error) {
    if (error.code === 11000) {
      throw createError("Vehicle already has an active ticket", 409);
    }

    if (
      error.hasErrorLabel?.("TransientTransactionError") ||
      error.hasErrorLabel?.("UnknownTransactionCommitResult")
    ) {
      throw createError(
        "Parking operation encountered a temporary database conflict. Please retry.",
        503,
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

// Vehicle exit: complete the ticket and release its spot atomically.
async function exitVehicle(ticketId) {
  if (typeof ticketId !== "string" || !ticketId.trim()) {
    throw createError("Ticket ID is required");
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const ticket = await ParkingTicket.findOne({
        ticketId: ticketId.trim(),
        status: "ACTIVE",
      }).session(session);

      if (!ticket) {
        throw createError("Active parking ticket not found", 404);
      }

      const exitTime = new Date();
      const fee = calculateFee(ticket.vehicleType, ticket.entryTime, exitTime);

      const completedTicket = await ParkingTicket.findOneAndUpdate(
        {
          _id: ticket._id,
          status: "ACTIVE",
        },
        {
          $set: {
            exitTime,
            fee,
            status: "COMPLETED",
          },
        },
        {
          returnDocument: "after",
          session,
          runValidators: true,
        },
      );

      if (!completedTicket) {
        throw createError("Ticket has already been completed", 409);
      }

      const releasedSpot = await ParkingSpot.findOneAndUpdate(
        {
          spotId: ticket.spotId,
          vehicleNumberPlate: ticket.vehicleNumberPlate,
          isOccupied: true,
        },
        {
          $set: {
            isOccupied: false,
            vehicleNumberPlate: null,
          },
        },
        {
          returnDocument: "after",
          session,
        },
      );

      if (!releasedSpot) {
        throw createError("Could not release the parking spot", 409);
      }

      result = {
        message: "Vehicle checked out successfully",
        ticket: completedTicket,
        fee,
      };
    });

    return result;
  } catch (error) {
    if (
      error.hasErrorLabel?.("TransientTransactionError") ||
      error.hasErrorLabel?.("UnknownTransactionCommitResult")
    ) {
      throw createError(
        "Checkout encountered a temporary database conflict. Please retry.",
        503,
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

// Current availability, read directly from MongoDB.
async function getParkingAvailability() {
  const [summary] = await ParkingSpot.aggregate([
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalSpots: { $sum: 1 },
              occupiedSpots: {
                $sum: { $cond: ["$isOccupied", 1, 0] },
              },
              availableSpots: {
                $sum: { $cond: ["$isOccupied", 0, 1] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalSpots: 1,
              occupiedSpots: 1,
              availableSpots: 1,
            },
          },
        ],
        byVehicleType: [
          {
            $group: {
              _id: "$supportedVehicleType",
              totalSpots: { $sum: 1 },
              occupiedSpots: {
                $sum: { $cond: ["$isOccupied", 1, 0] },
              },
              availableSpots: {
                $sum: { $cond: ["$isOccupied", 0, 1] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              vehicleType: "$_id",
              totalSpots: 1,
              occupiedSpots: 1,
              availableSpots: 1,
            },
          },
          { $sort: { vehicleType: 1 } },
        ],
        byFloor: [
          {
            $group: {
              _id: "$floorNumber",
              totalSpots: { $sum: 1 },
              occupiedSpots: {
                $sum: { $cond: ["$isOccupied", 1, 0] },
              },
              availableSpots: {
                $sum: { $cond: ["$isOccupied", 0, 1] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              floorNumber: "$_id",
              totalSpots: 1,
              occupiedSpots: 1,
              availableSpots: 1,
            },
          },
          { $sort: { floorNumber: 1 } },
        ],
      },
    },
  ]);

  const totals = summary?.totals[0] ?? {
    totalSpots: 0,
    occupiedSpots: 0,
    availableSpots: 0,
  };

  return {
    ...totals,
    byVehicleType: summary?.byVehicleType ?? [],
    byFloor: summary?.byFloor ?? [],
  };
}

module.exports = {
  enterVehicle,
  exitVehicle,
  getParkingAvailability,
};
