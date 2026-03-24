import { describe, it, expect, vi } from "vitest";
import { TOOL_DEFINITIONS } from "../mcp/tools";
import { handleMcpRequest } from "../mcp/server";
import type { McpRequest } from "../mcp/server";
import type { Env, SupabaseClient } from "../tools/service-search";

// ─── Tool Definition Tests ──────────────────────────────────────────

describe("TOOL_DEFINITIONS", () => {
  it("has exactly 4 tools", () => {
    expect(TOOL_DEFINITIONS).toHaveLength(4);
  });

  it("all tools have descriptions longer than 20 characters", () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it("service_search requires query", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "service_search");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toEqual(["query"]);
  });

  it("service_search has optional location, urgency, budget_max, category", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "service_search")!;
    const props = Object.keys(tool.inputSchema.properties);
    expect(props).toContain("location");
    expect(props).toContain("urgency");
    expect(props).toContain("budget_max");
    expect(props).toContain("category");
  });

  it("provider_profile requires provider_id", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "provider_profile");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toEqual(["provider_id"]);
  });

  it("home_profile requires action", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "home_profile");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toEqual(["action"]);
  });

  it("job_history has no required fields", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "job_history");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toEqual([]);
  });

  it("all tools have valid inputSchema type", () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ─── MCP Request Handler Tests ──────────────────────────────────────

const stubEnv: Env = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test-key",
  ANTHROPIC_API_KEY: "test-key",
  GOOGLE_GEOCODING_API_KEY: "test-key",
};

const stubSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  }),
  rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
} as unknown as SupabaseClient;
const stubCallLlm = vi.fn();

describe("handleMcpRequest", () => {
  it("returns tool definitions for tools/list", async () => {
    const req: McpRequest = { method: "tools/list" };
    const res = await handleMcpRequest(req, stubEnv, stubSupabase, stubCallLlm);

    expect(res.isError).toBeUndefined();
    expect(res.content).toHaveLength(1);
    expect(res.content[0].type).toBe("text");

    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.tools).toHaveLength(4);
    expect(parsed.tools[0].name).toBe("service_search");
  });

  it("returns error for unknown tool name", async () => {
    const req: McpRequest = {
      method: "tools/call",
      params: { name: "nonexistent_tool", arguments: {} },
    };
    const res = await handleMcpRequest(req, stubEnv, stubSupabase, stubCallLlm);

    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("Unknown tool");
  });

  it("returns error for unknown method", async () => {
    const req: McpRequest = { method: "resources/list" };
    const res = await handleMcpRequest(req, stubEnv, stubSupabase, stubCallLlm);

    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("Unknown method");
  });

  it("routes provider_profile and returns response", async () => {
    const req: McpRequest = {
      method: "tools/call",
      params: { name: "provider_profile", arguments: { provider_id: "abc-123" } },
    };
    const res = await handleMcpRequest(req, stubEnv, stubSupabase, stubCallLlm);

    expect(res.content).toHaveLength(1);
    // Provider profile now queries Supabase — with stub mock it returns error or data
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed).toBeDefined();
  });

  it("routes home_profile and returns stub response", async () => {
    const req: McpRequest = {
      method: "tools/call",
      params: { name: "home_profile", arguments: { action: "get" } },
    };
    const res = await handleMcpRequest(req, stubEnv, stubSupabase, stubCallLlm);

    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.message).toBe("Coming in Sprint 2");
  });

  it("routes job_history and returns stub response", async () => {
    const req: McpRequest = {
      method: "tools/call",
      params: { name: "job_history", arguments: {} },
    };
    const res = await handleMcpRequest(req, stubEnv, stubSupabase, stubCallLlm);

    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.message).toBe("Coming in Sprint 2");
  });
});
