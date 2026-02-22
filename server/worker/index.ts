import { Worker } from "bullmq";
import { deliverWebhook, type WebhookEvent } from "./webhooks.js";

// ---------------------------------------------------------------------------
// Redis connection
// ---------------------------------------------------------------------------
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error("REDIS_URL environment variable is required");
  process.exit(1);
}

const connection = { url: REDIS_URL };

// ---------------------------------------------------------------------------
// BullMQ worker — processes webhook dispatch jobs
// ---------------------------------------------------------------------------
const worker = new Worker<WebhookEvent>(
  "webhooks",
  async (job) => {
    const event = job.data;
    console.log(`Processing webhook ${event.id} (${event.type})`);

    const result = await deliverWebhook(event);

    if (!result.success) {
      const msg = result.error ?? `HTTP ${result.statusCode}`;
      console.error(`Webhook delivery failed: ${msg}`);
      throw new Error(`Webhook delivery failed: ${msg}`);
    }

    console.log(`Webhook ${event.id} delivered (${result.statusCode})`);
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 50,
      duration: 60_000,
    },
  }
);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown() {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ---------------------------------------------------------------------------
// Event logging
// ---------------------------------------------------------------------------
worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

console.log("Webhook worker started, waiting for jobs...");
