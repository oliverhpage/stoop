import { ParsedIntentSchema, type ParsedIntent } from "@stoop/shared";

type ValidationResult =
  | { success: true; data: ParsedIntent }
  | { success: false; error: string };

export function validateIntent(raw: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: "Invalid JSON" };
  }
  const result = ParsedIntentSchema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}
