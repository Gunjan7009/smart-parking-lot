const request = require("supertest");
const app = require("../../src/app");
const ParkingService = require("../../src/services/ParkingService");

describe("Parking API - Availability", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("GET /api/parking/availability returns parking counts", async () => {
    jest.spyOn(ParkingService, "getParkingAvailability").mockResolvedValue({
      totalSpots: 10,
      occupiedSpots: 4,
      availableSpots: 6,
      byVehicleType: [],
      byFloor: [],
    });

    const response = await request(app).get("/api/parking/availability");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalSpots: 10,
      occupiedSpots: 4,
      availableSpots: 6,
      byVehicleType: [],
      byFloor: [],
    });
  });

  test("POST /api/parking/entry returns 201 when a vehicle is parked", async () => {
    jest.spyOn(ParkingService, "enterVehicle").mockResolvedValue({
      message: "Vehicle parked successfully",
      ticket: {
        ticketId: "test-ticket-123",
        vehicleNumberPlate: "MP09TEST01",
        vehicleType: "CAR",
        status: "ACTIVE",
      },
    });

    const response = await request(app).post("/api/parking/entry").send({
      vehicleNumberPlate: "MP09TEST01",
      vehicleType: "CAR",
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Vehicle parked successfully");
    expect(response.body.ticket.ticketId).toBe("test-ticket-123");
  });

  test("POST /api/parking/exit returns 200 when checkout succeeds", async () => {
    jest.spyOn(ParkingService, "exitVehicle").mockResolvedValue({
      message: "Vehicle checked out successfully",
      ticket: {
        ticketId: "test-ticket-123",
        status: "COMPLETED",
      },
      fee: 40,
    });

    const response = await request(app).post("/api/parking/exit").send({
      ticketId: "test-ticket-123",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Vehicle checked out successfully");
    expect(response.body.ticket.status).toBe("COMPLETED");
    expect(response.body.fee).toBe(40);
  });

  test("POST /api/parking/entry returns 409 when no spot is available", async () => {
    const error = new Error("No compatible parking spot available");
    error.statusCode = 409;

    jest.spyOn(ParkingService, "enterVehicle").mockRejectedValue(error);

    const response = await request(app).post("/api/parking/entry").send({
      vehicleNumberPlate: "MP09TEST02",
      vehicleType: "CAR",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "No compatible parking spot available",
    });
  });

  test("POST /api/parking/exit returns 404 when no active ticket exists", async () => {
    const error = new Error("Active parking ticket not found");
    error.statusCode = 404;

    jest.spyOn(ParkingService, "exitVehicle").mockRejectedValue(error);

    const response = await request(app).post("/api/parking/exit").send({
      ticketId: "missing-ticket",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Active parking ticket not found",
    });
  });

  test("GET /api/parking/availability returns 500 when service fails", async () => {
    jest
      .spyOn(ParkingService, "getParkingAvailability")
      .mockRejectedValue(new Error("Database unavailable"));

    const response = await request(app).get("/api/parking/availability");

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      message: "Internal server error",
    });
  });
});
