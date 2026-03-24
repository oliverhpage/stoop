import { describe, it, expect } from "vitest";
import { PropertyDataSchema, ParsedIntentSchema } from "../types";

describe("PropertyDataSchema", () => {
  it("validates a complete object", () => {
    const data = {
      type: "house",
      year_built: "1970_1990",
      sqft: "2000_3000",
      heating_system: "gas_furnace",
      cooling_system: "central_ac",
      water_heater_type: "tank_gas",
      roof_type: "shingle",
      sewer_type: "city_sewer",
      scheduling_preference: "morning",
      location_geo: { lat: 25.76, lng: -80.19 },
      preferred_providers: ["provider-1"],
    };
    const result = PropertyDataSchema.parse(data);
    expect(result).toEqual(data);
  });

  it("validates an empty object (all fields optional)", () => {
    const result = PropertyDataSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects invalid enum values", () => {
    expect(() => PropertyDataSchema.parse({ type: "castle" })).toThrow();
  });
});

describe("ParsedIntentSchema", () => {
  it("validates a valid intent", () => {
    const intent = {
      category: "plumbing",
      subcategory: "faucet repair",
      urgency: "soon",
      timing: "this week",
      budget_max: 500,
      special_requirements: null,
      multi_service: false,
    };
    const result = ParsedIntentSchema.parse(intent);
    expect(result).toEqual(intent);
  });

  it("rejects invalid category", () => {
    expect(() =>
      ParsedIntentSchema.parse({
        category: "landscaping",
        subcategory: "lawn",
        urgency: "soon",
        timing: "next week",
        budget_max: null,
        special_requirements: null,
        multi_service: false,
      })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => ParsedIntentSchema.parse({ category: "hvac" })).toThrow();
  });
});
