import { describe, it, expect } from "vitest";
import { normalizeAddress, jaroWinkler, isDuplicate } from "../pipeline/dedup";

describe("normalizeAddress", () => {
  it('expands "St" to "Street"', () => {
    const result = normalizeAddress("123 Main St, Miami, FL 33101");
    expect(result).toContain("street");
    expect(result).not.toMatch(/\bst\b/);
  });

  it('strips "Suite 200"', () => {
    const result = normalizeAddress("456 Oak Ave Suite 200, Miami, FL");
    expect(result).not.toContain("suite");
    expect(result).not.toContain("200");
    expect(result).toContain("avenue");
  });

  it("strips apt and unit numbers", () => {
    expect(normalizeAddress("100 Elm Dr Apt 3B")).not.toContain("apt");
    expect(normalizeAddress("200 Pine Blvd Unit 12")).not.toContain("unit");
  });

  it("expands multiple abbreviations", () => {
    const result = normalizeAddress("1 Oak Blvd, 2 Elm Ct, 3 Pine Rd");
    expect(result).toContain("boulevard");
    expect(result).toContain("court");
    expect(result).toContain("road");
  });
});

describe("jaroWinkler", () => {
  it("returns 1.0 for identical strings", () => {
    expect(jaroWinkler("hello", "hello")).toBe(1.0);
  });

  it('returns > 0.85 for "CoolBreeze HVAC" vs "Cool Breeze HVAC LLC"', () => {
    const score = jaroWinkler("CoolBreeze HVAC", "Cool Breeze HVAC LLC");
    expect(score).toBeGreaterThan(0.85);
  });

  it("returns < 0.5 for completely different strings", () => {
    const score = jaroWinkler("Alpha Plumbing", "Zeta Electrical Corp");
    expect(score).toBeLessThan(0.5);
  });

  it("returns 0 for empty vs non-empty string", () => {
    expect(jaroWinkler("", "hello")).toBe(0.0);
    expect(jaroWinkler("hello", "")).toBe(0.0);
  });

  it("is case insensitive", () => {
    expect(jaroWinkler("Hello World", "hello world")).toBe(1.0);
  });
});

describe("isDuplicate", () => {
  it("matches by phone number", () => {
    const a = { phone: "+1 (305) 555-1234", name: "ABC Plumbing", address: "1 Main St" };
    const b = { phone: "1-305-555-1234", name: "XYZ Services", address: "999 Other Rd" };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("matches by name + address similarity", () => {
    const a = {
      phone: null,
      name: "CoolBreeze HVAC Services",
      address: "123 Main Street, Miami, FL 33101",
    };
    const b = {
      phone: null,
      name: "Cool Breeze HVAC Services LLC",
      address: "123 Main St, Miami, FL 33101",
    };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("rejects different providers", () => {
    const a = {
      phone: "+1 305-555-1234",
      name: "Alpha Plumbing Co",
      address: "100 First Ave, Miami, FL",
    };
    const b = {
      phone: "+1 786-999-0000",
      name: "Beta Electrical Services",
      address: "999 Ocean Dr, Miami Beach, FL",
    };
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("does not match when only name is similar but address differs", () => {
    const a = { phone: null, name: "Miami Plumbing Pro", address: "100 First Ave, Miami, FL" };
    const b = {
      phone: null,
      name: "Miami Plumbing Pro",
      address: "9999 Ocean Drive, Key West, FL",
    };
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("does not match when phones are null", () => {
    const a = { phone: null, name: "Totally Different A", address: "1 A St" };
    const b = { phone: null, name: "Completely Other B", address: "2 B Rd" };
    expect(isDuplicate(a, b)).toBe(false);
  });
});
