const ParkingSpot = require("../../src/models/ParkingSpot");
const ParkingTicket = require("../../src/models/ParkingTicket");
const ParkingService = require("../../src/services/ParkingService");

describe("Parking concurrency integration test", () => {
  beforeEach(async () => {
    // Safe because this test uses a separate test database.
    await ParkingTicket.deleteMany({});
    await ParkingSpot.deleteMany({});

    // Create exactly one available car spot.
    await ParkingSpot.create({
      spotId: "TEST-CAR-001",
      floorNumber: 1,
      supportedVehicleType: "CAR",
      isOccupied: false,
      vehicleNumberPlate: null,
    });
  });

  afterEach(async () => {
    await ParkingTicket.deleteMany({});
    await ParkingSpot.deleteMany({});
  });

  test("only one of two simultaneous cars gets the single spot", async () => {
    const results = await Promise.allSettled([
      ParkingService.enterVehicle("TEST-CAR-A", "CAR"),
      ParkingService.enterVehicle("TEST-CAR-B", "CAR"),
    ]);

    const successfulEntries = results.filter(
      (result) => result.status === "fulfilled",
    );

    const failedEntries = results.filter(
      (result) => result.status === "rejected",
    );

    expect(successfulEntries).toHaveLength(1);
    expect(failedEntries).toHaveLength(1);

    const spot = await ParkingSpot.findOne({
      spotId: "TEST-CAR-001",
    });

    const activeTickets = await ParkingTicket.find({
      status: "ACTIVE",
    });

    expect(spot.isOccupied).toBe(true);
    expect(["TEST-CAR-A", "TEST-CAR-B"]).toContain(spot.vehicleNumberPlate);
    expect(activeTickets).toHaveLength(1);
    expect(activeTickets[0].vehicleNumberPlate).toBe(spot.vehicleNumberPlate);
  });

  test("prevents two simultaneous entries for the same vehicle", async () => {
    const results = await Promise.allSettled([
      ParkingService.enterVehicle("MP09SAME01", "CAR"),
      ParkingService.enterVehicle("MP09SAME01", "CAR"),
    ]);

    const successfulEntries = results.filter(
      (result) => result.status === "fulfilled",
    );

    const failedEntries = results.filter(
      (result) => result.status === "rejected",
    );

    expect(successfulEntries).toHaveLength(1);
    expect(failedEntries).toHaveLength(1);

    const activeTickets = await ParkingTicket.find({
      vehicleNumberPlate: "MP09SAME01",
      status: "ACTIVE",
    });

    const occupiedSpots = await ParkingSpot.find({
      vehicleNumberPlate: "MP09SAME01",
      isOccupied: true,
    });

    expect(activeTickets).toHaveLength(1);
    expect(occupiedSpots).toHaveLength(1);
  });

  test("only one of two simultaneous checkout requests succeeds", async () => {
    const spot = await ParkingSpot.findOne({
      spotId: "TEST-CAR-001",
    });

    // Simulate a vehicle that is already parked.
    spot.isOccupied = true;
    spot.vehicleNumberPlate = "TEST-CHECKOUT-A";
    await spot.save();

    const [ticket] = await ParkingTicket.create([
      {
        ticketId: "TEST-CHECKOUT-TICKET",
        vehicleNumberPlate: "TEST-CHECKOUT-A",
        vehicleType: "CAR",
        spotId: "TEST-CAR-001",
        floorNumber: 1,
        entryTime: new Date(Date.now() - 30 * 60 * 1000),
        status: "ACTIVE",
      },
    ]);

    const results = await Promise.allSettled([
      ParkingService.exitVehicle(ticket.ticketId),
      ParkingService.exitVehicle(ticket.ticketId),
    ]);

    const successfulExits = results.filter(
      (result) => result.status === "fulfilled",
    );

    const failedExits = results.filter(
      (result) => result.status === "rejected",
    );

    expect(successfulExits).toHaveLength(1);
    expect(failedExits).toHaveLength(1);

    const completedTicket = await ParkingTicket.findOne({
      ticketId: "TEST-CHECKOUT-TICKET",
    });

    const releasedSpot = await ParkingSpot.findOne({
      spotId: "TEST-CAR-001",
    });

    expect(completedTicket.status).toBe("COMPLETED");
    expect(completedTicket.exitTime).toBeDefined();
    expect(completedTicket.fee).toBe(40);

    expect(releasedSpot.isOccupied).toBe(false);
    expect(releasedSpot.vehicleNumberPlate).toBeNull();
  });
});
