import Anthropic from "@anthropic-ai/sdk";
import { INTENT_SYSTEM_PROMPT } from "@stoop/matching";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 200;

export function createIntentLlmCaller(apiKey: string): (query: string) => Promise<string> {
  const client = new Anthropic({ apiKey });

  return async (query: string): Promise<string> => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: INTENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }
    return textBlock.text;
  };
}
