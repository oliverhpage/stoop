import { handleServiceSearch } from "./tools/service-search";
import { handleProviderProfile } from "./tools/provider-profile";
import { handleHomeProfile } from "./tools/home-profile";
import { handleJobHistory } from "./tools/job-history";

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "POST") {
      const body = (await request.json()) as {
        tool?: string;
        params?: Record<string, unknown>;
      };

      const params = body.params ?? {};

      switch (body.tool) {
        case "service_search":
          return Response.json(handleServiceSearch(params));
        case "provider_profile":
          return Response.json(handleProviderProfile(params));
        case "home_profile":
          return Response.json(handleHomeProfile(params));
        case "job_history":
          return Response.json(handleJobHistory(params));
        default:
          return Response.json({ message: "Tool not yet implemented" });
      }
    }

    return new Response("Stoop MCP Server - Ring 1");
  },
};
