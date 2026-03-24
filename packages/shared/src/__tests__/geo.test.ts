import { describe, it, expect } from "vitest";
import { haversineDistance } from "../geo";

describe("haversineDistance", () => {
  it("returns ~0 for same point", () => {
    const dist = haversineDistance(25.7617, -80.1918, 25.7617, -80.1918);
    expect(dist).toBeCloseTo(0, 1);
  });

  it("returns ~25 miles for Miami to Fort Lauderdale", () => {
    // Miami: 25.7617, -80.1918
    // Fort Lauderdale: 26.1224, -80.1373
    const dist = haversineDistance(25.7617, -80.1918, 26.1224, -80.1373);
    expect(dist).toBeGreaterThan(20);
    expect(dist).toBeLessThan(30);
  });
});
