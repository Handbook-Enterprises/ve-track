import { drizzle } from "drizzle-orm/d1";
import TrackerService from "../services/tracker.service";
import type { Env } from "../types";
import type { TrackerSyncMessage } from "../interfaces/tracker.interface";

export async function trackerConsumer(
  batch: MessageBatch<TrackerSyncMessage>,
  env: Env,
): Promise<void> {
  const db = drizzle(env.DB);
  for (const message of batch.messages) {
    const { trackerId } = message.body;
    try {
      await TrackerService.sync(db, env, trackerId);
      message.ack();
    } catch (err) {
      console.error("[ve-track][tracker.consumer] sync failed", trackerId, err);
      message.retry();
    }
  }
}
