import { describe, it, expect, vi } from "vitest";
import { handleContactInitiated } from "../tools/contact";

function mockSupabase() {
  const insertedRows: { table: string; row: Record<string, unknown> }[] = [];
  return {
    client: {
      from: (table: string) => ({
        insert: async (row: Record<string, unknown>) => {
          insertedRows.push({ table, row });
        },
      }),
    },
    insertedRows,
  };
}

describe("handleContactInitiated", () => {
  it("inserts into contacts table", async () => {
    const { client, insertedRows } = mockSupabase();
    await handleContactInitiated(
      { match_id: "m-1", user_id: "u-1", contact_method: "phone" },
      client,
    );
    const contactRow = insertedRows.find((r) => r.table === "contacts");
    expect(contactRow).toBeDefined();
    expect(contactRow!.row).toEqual({
      match_id: "m-1",
      user_id: "u-1",
      contact_method: "phone",
    });
  });

  it("inserts into analytics_events table", async () => {
    const { client, insertedRows } = mockSupabase();
    await handleContactInitiated(
      { match_id: "m-1", user_id: "u-1", contact_method: "sms" },
      client,
    );
    const analyticsRow = insertedRows.find((r) => r.table === "analytics_events");
    expect(analyticsRow).toBeDefined();
    expect(analyticsRow!.row).toEqual({
      event_type: "contact_initiated",
      user_id: "u-1",
      properties: { match_id: "m-1", method: "sms" },
    });
  });

  it("handles null user_id", async () => {
    const { client, insertedRows } = mockSupabase();
    await handleContactInitiated(
      { match_id: "m-2", user_id: null, contact_method: "phone" },
      client,
    );
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0].row.user_id).toBeNull();
    expect(insertedRows[1].row.user_id).toBeNull();
  });
});
