import { describe, it, expect } from "vitest";
import { handleServiceSearch } from "../tools/service-search";

describe("handleServiceSearch", () => {
  it("returns 3 providers with ranks 1, 2, 3", () => {
    const result = handleServiceSearch({ query: "ac repair" });
    expect(result.providers).toHaveLength(3);
    expect(result.providers[0].rank).toBe(1);
    expect(result.providers[1].rank).toBe(2);
    expect(result.providers[2].rank).toBe(3);
  });

  it("includes parsed_intent with detected category", () => {
    const result = handleServiceSearch({ query: "ac repair" });
    expect(result.parsed_intent).toBeDefined();
    expect(result.parsed_intent.category).toBe("hvac");
  });

  it("detects urgency from query", () => {
    const result = handleServiceSearch({ query: "emergency plumbing burst pipe" });
    expect(result.parsed_intent.urgency).toBe("emergency");
    expect(result.parsed_intent.category).toBe("plumbing");
  });

  it("includes text_fallback with Licensed text", () => {
    const result = handleServiceSearch({ query: "plumber" });
    expect(result.text_fallback).toContain("Licensed");
    expect(result.text_fallback).toContain("Found 3 providers");
  });

  it("includes request_id", () => {
    const result = handleServiceSearch({ query: "hvac" });
    expect(result.request_id).toMatch(/^req_mock_/);
  });

  it("defaults to plumbing/soon when query has no keywords", () => {
    const result = handleServiceSearch({ query: "" });
    expect(result.parsed_intent.category).toBe("plumbing");
    expect(result.parsed_intent.urgency).toBe("soon");
  });
});
