import { describe, it, expect } from "vitest";
import { logEvent } from "../lib/analytics";

describe("logEvent", () => {
  it("formats event with userId", () => {
    const event = logEvent("service_search", "user_123", { query: "ac repair" });
    expect(event).toEqual({
      event_type: "service_search",
      user_id: "user_123",
      properties: { query: "ac repair" },
    });
  });

  it("formats event with null userId for anonymous", () => {
    const event = logEvent("page_view", null, { page: "/search" });
    expect(event).toEqual({
      event_type: "page_view",
      user_id: null,
      properties: { page: "/search" },
    });
  });
});
