const request = require("supertest");
const app = require("../src/app");

describe("Health Check API", () => {
  test("GET / should return 200 and a success message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "Smart Parking Lot API is running",
    });
  });

  test("GET /unknown should return 404 for an unknown route", async () => {
    const response = await request(app).get("/unknown");

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      message: "Route not found",
    });
  });
});
