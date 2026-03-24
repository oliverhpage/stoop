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
