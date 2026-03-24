import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

import { createIntentLlmCaller } from "../lib/anthropic.js";

describe("createIntentLlmCaller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a callable function", () => {
    const caller = createIntentLlmCaller("test-api-key");
    expect(typeof caller).toBe("function");
  });

  it("calls Claude and returns the text content", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"trade":"plumbing","urgency":"routine"}' }],
    });

    const caller = createIntentLlmCaller("test-api-key");
    const result = await caller("I need a plumber");

    expect(result).toBe('{"trade":"plumbing","urgency":"routine"}');
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [{ role: "user", content: "I need a plumber" }],
      }),
    );
  });

  it("throws when no text block in response", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "1", name: "foo", input: {} }],
    });

    const caller = createIntentLlmCaller("test-api-key");
    await expect(caller("some query")).rejects.toThrow("No text response from Claude");
  });
});
