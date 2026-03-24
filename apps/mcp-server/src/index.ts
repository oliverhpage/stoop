import { handleServiceSearch } from "./tools/service-search";
import type { ServiceSearchInput, Env } from "./tools/service-search";
import { handleProviderProfile } from "./tools/provider-profile";
import { handleHomeProfile } from "./tools/home-profile";
import { handleJobHistory } from "./tools/job-history";
import { createIntentLlmCaller } from "./lib/anthropic";
import { createClient } from "@supabase/supabase-js";

export default {
  async fetch(request: Request, rawEnv?: Record<string, string>): Promise<Response> {
    if (request.method === "POST") {
      const body = (await request.json()) as {
        tool?: string;
        params?: Record<string, unknown>;
      };

      const params = body.params ?? {};

      switch (body.tool) {
        case "service_search": {
          const env: Env = {
            SUPABASE_URL: rawEnv?.SUPABASE_URL ?? "",
            SUPABASE_ANON_KEY: rawEnv?.SUPABASE_ANON_KEY ?? "",
            ANTHROPIC_API_KEY: rawEnv?.ANTHROPIC_API_KEY ?? "",
            GOOGLE_GEOCODING_API_KEY: rawEnv?.GOOGLE_GEOCODING_API_KEY ?? "",
          };
          const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
          const callLlm = createIntentLlmCaller(env.ANTHROPIC_API_KEY);
          const result = await handleServiceSearch(params as ServiceSearchInput, env, supabase as any, callLlm);
          return Response.json(result);
        }
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
