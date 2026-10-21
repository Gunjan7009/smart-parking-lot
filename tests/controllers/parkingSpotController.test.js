const request = require("supertest");
const app = require("../../src/app");
const ParkingSpot = require("../../src/models/ParkingSpot");

describe("Parking Spot API - Error Handling", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("GET /api/spots returns 500 when database query fails", async () => {
    jest.spyOn(ParkingSpot, "find").mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error("Database unavailable")),
    });

    const response = await request(app).get("/api/spots");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal server error",
    });
  });
});
