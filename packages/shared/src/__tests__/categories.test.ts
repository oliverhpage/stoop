import { describe, it, expect } from "vitest";
import { detectCategory, detectUrgency, LICENSE_TYPE_MAP } from "../categories";

describe("detectCategory", () => {
  it("detects HVAC from 'ac'", () => {
    expect(detectCategory("my ac is broken")).toBe("hvac");
  });

  it("detects plumbing from 'faucet'", () => {
    expect(detectCategory("kitchen faucet is leaking")).toBe("plumbing");
  });

  it("detects electrical from 'outlet'", () => {
    expect(detectCategory("outlet is sparking")).toBe("electrical");
  });

  it("returns null for ambiguous query", () => {
    expect(detectCategory("I need help with my house")).toBeNull();
  });

  it("prioritizes trade keywords over generic terms", () => {
    // "ac" matches HVAC, should return hvac even with no other signals
    expect(detectCategory("fix ac unit")).toBe("hvac");
  });

  it("detects roofing", () => {
    expect(detectCategory("shingle came off")).toBe("roofing");
  });

  it("detects cleaning", () => {
    expect(detectCategory("need a deep clean")).toBe("cleaning");
  });

  it("detects handyman", () => {
    expect(detectCategory("need a handyman for odd jobs")).toBe("handyman");
  });
});

describe("detectUrgency", () => {
  it("detects emergency", () => {
    expect(detectUrgency("pipe burst flooding my kitchen")).toBe("emergency");
  });

  it("detects soon", () => {
    expect(detectUrgency("faucet is broken, need it fixed this week")).toBe("soon");
  });

  it("detects planned", () => {
    expect(detectUrgency("annual maintenance tune-up")).toBe("planned");
  });

  it("returns null for no match", () => {
    expect(detectUrgency("I have a question")).toBeNull();
  });
});

describe("LICENSE_TYPE_MAP", () => {
  it("maps hvac to CAC", () => {
    expect(LICENSE_TYPE_MAP["hvac"]).toBe("CAC");
  });

  it("maps plumbing to CFC", () => {
    expect(LICENSE_TYPE_MAP["plumbing"]).toBe("CFC");
  });

  it("maps electrical to EC", () => {
    expect(LICENSE_TYPE_MAP["electrical"]).toBe("EC");
  });
});
