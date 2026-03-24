import { describe, it, expect, vi } from "vitest";
import { handleScheduled } from "../pipeline/cron-handler";

function makePipelines() {
  return {
    runGooglePlaces: vi.fn().mockResolvedValue({ ok: true }),
    runYelp: vi.fn().mockResolvedValue({ ok: true }),
    runDbpr: vi.fn().mockResolvedValue({ ok: true }),
  };
}

describe("handleScheduled", () => {
  it("dispatches Google Places on '0 6 * * 1'", async () => {
    const p = makePipelines();
    await handleScheduled("0 6 * * 1", p);

    expect(p.runGooglePlaces).toHaveBeenCalledOnce();
    expect(p.runYelp).not.toHaveBeenCalled();
    expect(p.runDbpr).not.toHaveBeenCalled();
  });

  it("dispatches Yelp on '0 7 * * 1'", async () => {
    const p = makePipelines();
    await handleScheduled("0 7 * * 1", p);

    expect(p.runYelp).toHaveBeenCalledOnce();
    expect(p.runGooglePlaces).not.toHaveBeenCalled();
    expect(p.runDbpr).not.toHaveBeenCalled();
  });

  it("dispatches DBPR on '0 5 * * *'", async () => {
    const p = makePipelines();
    await handleScheduled("0 5 * * *", p);

    expect(p.runDbpr).toHaveBeenCalledOnce();
    expect(p.runGooglePlaces).not.toHaveBeenCalled();
    expect(p.runYelp).not.toHaveBeenCalled();
  });

  it("handles unknown cron gracefully without error", async () => {
    const p = makePipelines();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await handleScheduled("0 0 * * *", p);

    expect(p.runGooglePlaces).not.toHaveBeenCalled();
    expect(p.runYelp).not.toHaveBeenCalled();
    expect(p.runDbpr).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("Unknown cron schedule: 0 0 * * *");

    warn.mockRestore();
  });
});
