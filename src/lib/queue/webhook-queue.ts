import { Queue } from "bullmq";

// ---------------------------------------------------------------------------
// Lazy-initialized Redis connection + BullMQ queue
// ---------------------------------------------------------------------------
let queue: Queue | null = null;

function getQueue(): Queue | null {
  if (queue) return queue;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  queue = new Queue("webhooks", { connection: { url: redisUrl } });
  return queue;
}

// ---------------------------------------------------------------------------
// Public API — enqueue a webhook event
// ---------------------------------------------------------------------------
export interface EnqueueWebhookOptions {
  id: string;
  type: string;
  workspace_id: string;
  payload: Record<string, unknown>;
  webhook_url: string;
  signing_secret: string;
}

export async function enqueueWebhook(
  options: EnqueueWebhookOptions
): Promise<void> {
  const q = getQueue();
  if (!q) return; // Redis not configured — skip silently

  await q.add(options.type, {
    ...options,
    created_at: new Date().toISOString(),
  }, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
