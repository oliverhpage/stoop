interface PipelineRunners {
  runGooglePlaces: () => Promise<any>;
  runYelp: () => Promise<any>;
  runDbpr: () => Promise<any>;
}

export async function handleScheduled(
  cron: string,
  pipelines: PipelineRunners
): Promise<void> {
  switch (cron) {
    case "0 6 * * 1": // Monday 6am — Google Places
      await pipelines.runGooglePlaces();
      break;
    case "0 7 * * 1": // Monday 7am — Yelp
      await pipelines.runYelp();
      break;
    case "0 5 * * *": // Daily 5am — DBPR
      await pipelines.runDbpr();
      break;
    default:
      console.warn(`Unknown cron schedule: ${cron}`);
  }
}
