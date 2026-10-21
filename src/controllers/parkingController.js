const ParkingService = require("../services/ParkingService");

async function enterVehicle(req, res, next) {
  try {
    const { vehicleNumberPlate, vehicleType } = req.body || {};

    const result = await ParkingService.enterVehicle(
      vehicleNumberPlate,
      vehicleType,
    );

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function exitVehicle(req, res, next) {
  try {
    const { ticketId } = req.body || {};

    const result = await ParkingService.exitVehicle(ticketId);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getParkingAvailability(req, res, next) {
  try {
    const result = await ParkingService.getParkingAvailability();

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  enterVehicle,
  exitVehicle,
  getParkingAvailability,
};
