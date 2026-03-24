import { describe, it, expect } from "vitest";
import { validateIntent } from "../intent-schema";

describe("validateIntent", () => {
  const validJSON = JSON.stringify({
    category: "plumbing",
    subcategory: "leak repair",
    urgency: "emergency",
    timing: "today",
    budget_max: 500,
    special_requirements: null,
    multi_service: false,
  });

  it("accepts valid JSON with correct fields", () => {
    const result = validateIntent(validJSON);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("plumbing");
      expect(result.data.urgency).toBe("emergency");
      expect(result.data.budget_max).toBe(500);
    }
  });

  it("rejects malformed JSON", () => {
    const result = validateIntent("not json at all");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid JSON");
    }
  });

  it("rejects invalid category", () => {
    const bad = JSON.stringify({
      category: "landscaping",
      subcategory: "mowing",
      urgency: "soon",
      timing: "next week",
      budget_max: null,
      special_requirements: null,
      multi_service: false,
    });
    const result = validateIntent(bad);
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = validateIntent(JSON.stringify({ category: "hvac" }));
    expect(result.success).toBe(false);
  });

  it("accepts null budget_max", () => {
    const json = JSON.stringify({
      category: "electrical",
      subcategory: "outlet install",
      urgency: "planned",
      timing: "next month",
      budget_max: null,
      special_requirements: null,
      multi_service: false,
    });
    const result = validateIntent(json);
    expect(result.success).toBe(true);
  });
});
