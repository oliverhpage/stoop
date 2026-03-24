import { describe, it, expect } from "vitest";
import { rankProvider, type RankableProvider } from "../ranking";
import type { ParsedIntent } from "@stoop/shared";

const baseIntent: ParsedIntent = {
  category: "plumbing",
  subcategory: "leak repair",
  urgency: "soon",
  timing: "this week",
  budget_max: 500,
  special_requirements: null,
  multi_service: false,
};

const perfectProvider: RankableProvider = {
  license_status: "active",
  avg_rating: 5,
  review_count: 100,
  distance_miles: 2,
  price_range_low: 100,
  available_today: true,
};

describe("rankProvider", () => {
  it("perfect provider scores > 80", () => {
    const score = rankProvider(perfectProvider, baseIntent);
    expect(score).toBeGreaterThan(80);
  });

  it("unverified license penalizes by >= 30 points", () => {
    const activeScore = rankProvider(perfectProvider, baseIntent);
    const inactiveScore = rankProvider(
      { ...perfectProvider, license_status: "inactive" },
      baseIntent,
    );
    expect(activeScore - inactiveScore).toBeGreaterThanOrEqual(30);
  });

  it("emergency urgency boosts score for available provider", () => {
    const normalScore = rankProvider(perfectProvider, baseIntent);
    const emergencyScore = rankProvider(perfectProvider, {
      ...baseIntent,
      urgency: "emergency",
    });
    expect(emergencyScore).toBeGreaterThan(normalScore);
  });

  it("emergency does not boost unavailable provider", () => {
    const unavailable: RankableProvider = {
      ...perfectProvider,
      available_today: false,
    };
    const normalScore = rankProvider(unavailable, baseIntent);
    const emergencyScore = rankProvider(unavailable, {
      ...baseIntent,
      urgency: "emergency",
    });
    // No emergency boost when unavailable, but availability penalty applies in both
    expect(emergencyScore).toBe(normalScore);
  });

  it("distance penalty reduces score for far providers", () => {
    const nearScore = rankProvider(
      { ...perfectProvider, distance_miles: 1 },
      baseIntent,
    );
    const farScore = rankProvider(
      { ...perfectProvider, distance_miles: 14 },
      baseIntent,
    );
    expect(nearScore).toBeGreaterThan(farScore);
  });

  it("distance beyond 15 miles gives zero proximity points", () => {
    const score15 = rankProvider(
      { ...perfectProvider, distance_miles: 15 },
      baseIntent,
    );
    const score20 = rankProvider(
      { ...perfectProvider, distance_miles: 20 },
      baseIntent,
    );
    expect(score15).toBe(score20);
  });

  it("provider with price above budget loses price_match points", () => {
    const cheapScore = rankProvider(
      { ...perfectProvider, price_range_low: 100 },
      { ...baseIntent, budget_max: 500 },
    );
    const expensiveScore = rankProvider(
      { ...perfectProvider, price_range_low: 600 },
      { ...baseIntent, budget_max: 500 },
    );
    expect(cheapScore).toBeGreaterThan(expensiveScore);
  });
});
