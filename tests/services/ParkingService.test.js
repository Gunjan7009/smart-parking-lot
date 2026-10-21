const mongoose = require("mongoose");

jest.mock("../../src/models/ParkingSpot", () => ({
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../../src/models/ParkingTicket", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
}));

const ParkingSpot = require("../../src/models/ParkingSpot");
const ParkingTicket = require("../../src/models/ParkingTicket");
const ParkingService = require("../../src/services/ParkingService");

let session;

beforeEach(() => {
  jest.clearAllMocks();

  session = {
    withTransaction: jest.fn(async (callback) => callback()),
    endSession: jest.fn().mockResolvedValue(undefined),
  };

  jest.spyOn(mongoose, "startSession").mockResolvedValue(session);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ------------------------------------
// Vehicle Entry Tests
// ------------------------------------

describe("ParkingService - Vehicle Entry", () => {
  test("rejects entry when vehicle number plate is missing", async () => {
    await expect(ParkingService.enterVehicle("", "CAR")).rejects.toThrow(
      "Vehicle number plate is required",
    );

    expect(ParkingTicket.create).not.toHaveBeenCalled();
  });

  test("rejects unsupported vehicle types", async () => {
    await expect(
      ParkingService.enterVehicle("MP09TEST01", "TRUCK"),
    ).rejects.toThrow("Invalid vehicle type");

    expect(ParkingTicket.create).not.toHaveBeenCalled();
  });

  test("rejects a vehicle that already has an active ticket", async () => {
    ParkingTicket.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue({
        ticketId: "existing-ticket",
        status: "ACTIVE",
      }),
    });

    await expect(
      ParkingService.enterVehicle("MP09TEST01", "CAR"),
    ).rejects.toThrow("Vehicle is already parked");

    expect(ParkingTicket.create).not.toHaveBeenCalled();
  });

  test("rejects entry when no compatible spot is available", async () => {
    ParkingTicket.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });

    ParkingSpot.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue([]),
      }),
    });

    await expect(
      ParkingService.enterVehicle("MP09TEST02", "CAR"),
    ).rejects.toThrow("No compatible parking spot available");

    expect(ParkingTicket.create).not.toHaveBeenCalled();
  });

  test("allocates a spot and creates a ticket for a valid vehicle", async () => {
    const spot = {
      _id: "spot-db-id",
      spotId: "F1-CAR-TEST",
      floorNumber: 1,
    };

    ParkingTicket.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });

    ParkingSpot.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue([spot]),
      }),
    });

    ParkingSpot.findOneAndUpdate.mockResolvedValue(spot);

    const ticket = {
      ticketId: "test-ticket-id",
      vehicleNumberPlate: "MP09TEST03",
      vehicleType: "CAR",
      spotId: "F1-CAR-TEST",
      status: "ACTIVE",
    };

    ParkingTicket.create.mockResolvedValue([ticket]);

    const result = await ParkingService.enterVehicle("MP09TEST03", "CAR");

    expect(result.message).toBe("Vehicle parked successfully");
    expect(result.ticket.ticketId).toBe("test-ticket-id");
    expect(ParkingSpot.findOneAndUpdate).toHaveBeenCalled();
    expect(ParkingTicket.create).toHaveBeenCalled();
    expect(session.withTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  test("normalizes the vehicle number plate", async () => {
    const spot = {
      _id: "spot-db-id",
      spotId: "F1-CAR-TEST",
      floorNumber: 1,
    };

    ParkingTicket.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });

    ParkingSpot.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue([spot]),
      }),
    });

    ParkingSpot.findOneAndUpdate.mockResolvedValue(spot);

    ParkingTicket.create.mockResolvedValue([
      {
        ticketId: "test-ticket-id",
        vehicleNumberPlate: "MP09TEST03",
        vehicleType: "CAR",
        status: "ACTIVE",
      },
    ]);

    await ParkingService.enterVehicle(" mp09test03 ", "CAR");

    expect(ParkingTicket.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleNumberPlate: "MP09TEST03",
        status: "ACTIVE",
      }),
    );
  });
});

// ------------------------------------
// Vehicle Exit Tests
// ------------------------------------

describe("ParkingService - Vehicle Exit", () => {
  test("rejects exit when ticket ID is missing", async () => {
    await expect(ParkingService.exitVehicle("")).rejects.toThrow(
      "Ticket ID is required",
    );

    expect(ParkingTicket.findOne).not.toHaveBeenCalled();
    expect(ParkingSpot.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("rejects checkout when no active ticket exists", async () => {
    ParkingTicket.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });

    await expect(ParkingService.exitVehicle("invalid-ticket")).rejects.toThrow(
      "Active parking ticket not found",
    );

    expect(ParkingSpot.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("completes ticket, calculates fee, and releases the spot", async () => {
    const activeTicket = {
      _id: "ticket-db-id",
      ticketId: "ticket-123",
      vehicleNumberPlate: "MP09TEST03",
      vehicleType: "CAR",
      spotId: "F1-CAR-TEST",
      floorNumber: 1,
      entryTime: new Date(Date.now() - 30 * 60 * 1000),
      status: "ACTIVE",
    };

    const completedTicket = {
      ...activeTicket,
      status: "COMPLETED",
      exitTime: new Date(),
      fee: 40,
    };

    ParkingTicket.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(activeTicket),
    });

    ParkingTicket.findOneAndUpdate.mockResolvedValue(completedTicket);

    ParkingSpot.findOneAndUpdate.mockResolvedValue({
      spotId: "F1-CAR-TEST",
      isOccupied: false,
      vehicleNumberPlate: null,
    });

    const result = await ParkingService.exitVehicle("ticket-123");

    expect(result.message).toBe("Vehicle checked out successfully");
    expect(result.ticket.status).toBe("COMPLETED");
    expect(result.fee).toBe(40);
    expect(ParkingTicket.findOneAndUpdate).toHaveBeenCalled();
    expect(ParkingSpot.findOneAndUpdate).toHaveBeenCalled();
    expect(session.withTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  test("rejects checkout if the spot cannot be released", async () => {
    const activeTicket = {
      _id: "ticket-db-id",
      ticketId: "ticket-123",
      vehicleNumberPlate: "MP09TEST03",
      vehicleType: "CAR",
      spotId: "F1-CAR-TEST",
      floorNumber: 1,
      entryTime: new Date(Date.now() - 10 * 60 * 1000),
      status: "ACTIVE",
    };

    ParkingTicket.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(activeTicket),
    });

    ParkingTicket.findOneAndUpdate.mockResolvedValue({
      ...activeTicket,
      status: "COMPLETED",
    });

    ParkingSpot.findOneAndUpdate.mockResolvedValue(null);

    await expect(ParkingService.exitVehicle("ticket-123")).rejects.toThrow(
      "Could not release the parking spot",
    );

    expect(session.withTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  test("rejects checkout if the ticket is no longer active during update", async () => {
    const activeTicket = {
      _id: "ticket-db-id",
      ticketId: "ticket-123",
      vehicleNumberPlate: "MP09TEST03",
      vehicleType: "CAR",
      spotId: "F1-CAR-TEST",
      floorNumber: 1,
      entryTime: new Date(Date.now() - 30 * 60 * 1000),
      status: "ACTIVE",
    };

    ParkingTicket.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(activeTicket),
    });

    ParkingTicket.findOneAndUpdate.mockResolvedValue(null);

    await expect(ParkingService.exitVehicle("ticket-123")).rejects.toThrow(
      "Ticket has already been completed",
    );

    expect(ParkingSpot.findOneAndUpdate).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });
});

// ------------------------------------
// Availability Tests
// ------------------------------------

describe("ParkingService - Availability", () => {
  test("returns total, occupied, and available spot counts", async () => {
    ParkingSpot.aggregate.mockResolvedValue([
      {
        totals: [
          {
            totalSpots: 10,
            occupiedSpots: 4,
            availableSpots: 6,
          },
        ],
        byVehicleType: [
          {
            vehicleType: "CAR",
            totalSpots: 10,
            occupiedSpots: 4,
            availableSpots: 6,
          },
        ],
        byFloor: [
          {
            floorNumber: 1,
            totalSpots: 10,
            occupiedSpots: 4,
            availableSpots: 6,
          },
        ],
      },
    ]);

    const result = await ParkingService.getParkingAvailability();

    expect(result).toEqual({
      totalSpots: 10,
      occupiedSpots: 4,
      availableSpots: 6,
      byVehicleType: [
        {
          vehicleType: "CAR",
          totalSpots: 10,
          occupiedSpots: 4,
          availableSpots: 6,
        },
      ],
      byFloor: [
        {
          floorNumber: 1,
          totalSpots: 10,
          occupiedSpots: 4,
          availableSpots: 6,
        },
      ],
    });

    expect(ParkingSpot.aggregate).toHaveBeenCalledTimes(1);
  });
});
