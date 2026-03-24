import { detectCategory, detectUrgency } from "@stoop/shared";
import type { ParsedIntent, Category, Urgency } from "@stoop/shared";
import { validateIntent } from "./intent-schema";

const MAX_QUERY_LENGTH = 500;
const LLM_MAX_RETRIES = 2;

export interface ParseIntentOptions {
  callLlm: (query: string) => Promise<string>;
}

export interface ParseIntentResult {
  parsed_intent: ParsedIntent;
  source: "keyword" | "llm" | "keyword_fallback_after_llm_failure";
}

export const INTENT_SYSTEM_PROMPT = `You are a home services intent parser. Given a homeowner's query, extract structured intent as JSON.

Respond with ONLY valid JSON matching this schema:
{
  "category": "hvac" | "plumbing" | "electrical" | "roofing" | "cleaning" | "handyman",
  "subcategory": string (e.g. "leak repair", "outlet installation", "ac maintenance"),
  "urgency": "emergency" | "soon" | "planned",
  "timing": string (e.g. "today", "this week", "next month"),
  "budget_max": number | null,
  "special_requirements": string | null,
  "multi_service": boolean
}

Rules:
- Pick the single best category. If unclear, use "handyman".
- Set urgency to "emergency" only for safety hazards (flooding, sparking, gas leak, no heat/ac).
- Extract budget if mentioned, otherwise null.
- Set multi_service to true only if the query clearly needs multiple trades.
- No markdown, no explanation — just the JSON object.`;

function sanitizeQuery(raw: string): string {
  return raw.slice(0, MAX_QUERY_LENGTH).trim();
}

function extractBudget(query: string): number | null {
  const match = query.match(/\$(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function inferSubcategory(query: string, category: Category): string {
  const lower = query.toLowerCase();
  if (lower.includes("install")) return "installation";
  if (lower.includes("inspect")) return "inspection";
  if (lower.includes("maintenance") || lower.includes("tune")) return "maintenance";
  return "repair";
}

function buildKeywordIntent(
  query: string,
  category: Category,
  urgency: Urgency | null,
): ParsedIntent {
  return {
    category,
    subcategory: inferSubcategory(query, category),
    urgency: urgency ?? "planned",
    timing: urgency === "emergency" ? "today" : "flexible",
    budget_max: extractBudget(query),
    special_requirements: null,
    multi_service: false,
  };
}

export async function parseIntent(
  rawQuery: string,
  options: ParseIntentOptions,
): Promise<ParseIntentResult> {
  const query = sanitizeQuery(rawQuery);

  const category = detectCategory(query);
  const urgency = detectUrgency(query);

  // If keyword detected a category, return immediately — no LLM needed
  if (category !== null) {
    return {
      parsed_intent: buildKeywordIntent(query, category, urgency),
      source: "keyword",
    };
  }

  // Ambiguous query — try LLM
  for (let attempt = 0; attempt < LLM_MAX_RETRIES; attempt++) {
    try {
      const llmResponse = await options.callLlm(query);
      const result = validateIntent(llmResponse);
      if (result.success) {
        return {
          parsed_intent: result.data,
          source: "llm",
        };
      }
    } catch {
      // LLM call failed, will retry or fall back
    }
  }

  // LLM failed twice — fall back to keyword as last resort
  const fallbackCategory = category ?? "handyman";
  const fallbackUrgency = urgency ?? "planned";

  return {
    parsed_intent: buildKeywordIntent(query, fallbackCategory, fallbackUrgency),
    source: "keyword_fallback_after_llm_failure",
  };
}
