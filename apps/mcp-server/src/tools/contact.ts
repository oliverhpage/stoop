export interface ContactInitiatedInput {
  match_id: string;
  user_id: string | null;
  contact_method: "phone" | "sms";
}

export interface ContactSupabaseClient {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<unknown>;
  };
}

export async function handleContactInitiated(
  input: ContactInitiatedInput,
  supabase: ContactSupabaseClient,
): Promise<void> {
  // Insert into contacts table
  await supabase.from("contacts").insert({
    match_id: input.match_id,
    user_id: input.user_id,
    contact_method: input.contact_method,
  });

  // Also log analytics event
  await supabase.from("analytics_events").insert({
    event_type: "contact_initiated",
    user_id: input.user_id,
    properties: { match_id: input.match_id, method: input.contact_method },
  });
}
