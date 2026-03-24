/**
 * MCP Tool Definitions — JSON Schema input specs for all 4 Stoop tools.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "service_search",
    description:
      "Search for licensed home service providers (HVAC, plumbing, electrical) near a location. Returns ranked results with ratings, pricing, and contact info.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language description of the service needed, e.g. 'AC not cooling' or 'need a plumber for a leak'",
        },
        location: {
          type: "string",
          description: "Address or area to search near, e.g. 'Miami Beach, FL'. Defaults to Miami.",
        },
        urgency: {
          type: "string",
          enum: ["emergency", "urgent", "routine"],
          description: "How urgently the service is needed",
        },
        budget_max: {
          type: "number",
          description: "Maximum budget in USD for the service",
        },
        category: {
          type: "string",
          enum: ["hvac", "plumbing", "electrical"],
          description: "Explicit trade category override (normally inferred from query)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "provider_profile",
    description:
      "Retrieve detailed profile information for a specific service provider including license status, reviews, and service history.",
    inputSchema: {
      type: "object",
      properties: {
        provider_id: {
          type: "string",
          description: "Unique identifier of the provider to look up",
        },
      },
      required: ["provider_id"],
    },
  },
  {
    name: "home_profile",
    description:
      "Manage the authenticated user's home profile — view or update property details like square footage, year built, and systems installed.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get", "update"],
          description: "Whether to retrieve or update the home profile",
        },
        fields: {
          type: "object",
          description: "Fields to update when action is 'update'",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "job_history",
    description:
      "Retrieve the authenticated user's past service requests and completed jobs, optionally filtered by trade category.",
    inputSchema: {
      type: "object",
      properties: {
        filter_trade: {
          type: "string",
          enum: ["hvac", "plumbing", "electrical"],
          description: "Filter results to a specific trade category",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 10)",
        },
      },
      required: [],
    },
  },
];
