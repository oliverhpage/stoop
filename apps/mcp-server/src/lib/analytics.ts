export interface AnalyticsEvent {
  event_type: string;
  user_id: string | null;
  properties: Record<string, unknown>;
}

export function logEvent(
  eventType: string,
  userId: string | null,
  properties: Record<string, unknown>,
): AnalyticsEvent {
  return {
    event_type: eventType,
    user_id: userId,
    properties,
  };
}

/**
 * Write an analytics event to the Supabase `analytics_events` table.
 * Fire-and-forget — errors are silently swallowed so search flow is never blocked.
 */
export async function writeEvent(
  supabase: { from: (table: string) => { insert: (row: Record<string, unknown>) => Promise<unknown> } },
  eventType: string,
  userId: string | null,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("analytics_events").insert({
      event_type: eventType,
      user_id: userId,
      properties,
    });
  } catch {
    // Silently swallow — analytics must never break the search flow
  }
}
