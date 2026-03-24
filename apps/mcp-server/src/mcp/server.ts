/**
 * MCP protocol request handler.
 * Routes tools/list and tools/call requests to the appropriate tool handlers.
 */

import { TOOL_DEFINITIONS } from "./tools";
import { handleServiceSearch } from "../tools/service-search";
import { handleProviderProfile } from "../tools/provider-profile";
import { handleHomeProfile } from "../tools/home-profile";
import { handleJobHistory } from "../tools/job-history";
import type { Env, SupabaseClient } from "../tools/service-search";

export interface McpRequest {
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

export interface McpResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export async function handleMcpRequest(
  request: McpRequest,
  env: Env,
  supabase: SupabaseClient,
  callLlm: (query: string) => Promise<string>,
): Promise<McpResponse> {
  // tools/list — return all tool definitions
  if (request.method === "tools/list") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ tools: TOOL_DEFINITIONS }),
        },
      ],
    };
  }

  // tools/call — route to appropriate handler
  if (request.method === "tools/call") {
    const toolName = request.params?.name;
    const args = request.params?.arguments ?? {};

    switch (toolName) {
      case "service_search": {
        const result = await handleServiceSearch(
          args as Parameters<typeof handleServiceSearch>[0],
          env,
          supabase,
          callLlm,
        );
        const { text_fallback, ...structured } = result;
        return {
          content: [
            { type: "text", text: JSON.stringify(structured) },
            { type: "text", text: text_fallback },
          ],
        };
      }

      case "provider_profile": {
        const result = handleProviderProfile(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "home_profile": {
        const result = handleHomeProfile(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "job_history": {
        const result = handleJobHistory(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
    }
  }

  // Unknown method
  return {
    content: [{ type: "text", text: `Unknown method: ${request.method}` }],
    isError: true,
  };
}
