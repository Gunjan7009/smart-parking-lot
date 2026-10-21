const HOURLY_RATES = {
  MOTORCYCLE: 20,
  CAR: 40,
  BUS: 100,
};

function calculateFee(vehicleType, entryTime, exitTime = new Date()) {
  const rate = HOURLY_RATES[vehicleType];

  if (rate === undefined) {
    throw new Error("Unsupported vehicle type");
  }

  const entry = new Date(entryTime);
  const exit = new Date(exitTime);

  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) {
    throw new Error("Invalid parking time");
  }

  const durationInMs = exit.getTime() - entry.getTime();

  if (durationInMs < 0) {
    throw new Error("Exit time cannot be before entry time");
  }

  const hours = Math.max(1, Math.ceil(durationInMs / (1000 * 60 * 60)));

  return hours * rate;
}

module.exports = { calculateFee };
