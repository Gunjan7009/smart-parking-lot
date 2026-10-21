const { calculateFee } = require("../../src/services/FeeCalculator");

describe("FeeCalculator", () => {
  test("calculates the minimum fee for a car", () => {
    const entryTime = new Date("2026-10-15T10:00:00Z");
    const exitTime = new Date("2026-10-15T10:05:00Z");

    expect(calculateFee("CAR", entryTime, exitTime)).toBe(40);
  });

  test("rounds partial hours up", () => {
    const entryTime = new Date("2026-10-15T10:00:00Z");
    const exitTime = new Date("2026-10-15T11:10:00Z");

    expect(calculateFee("CAR", entryTime, exitTime)).toBe(80);
  });

  test("calculates motorcycle fees", () => {
    const entryTime = new Date("2026-10-15T10:00:00Z");
    const exitTime = new Date("2026-10-15T11:00:00Z");

    expect(calculateFee("MOTORCYCLE", entryTime, exitTime)).toBe(20);
  });

  test("rejects unsupported vehicle types", () => {
    expect(() =>
      calculateFee(
        "TRUCK",
        new Date("2026-10-15T10:00:00Z"),
        new Date("2026-10-15T11:00:00Z"),
      ),
    ).toThrow("Unsupported vehicle type");
  });
});
