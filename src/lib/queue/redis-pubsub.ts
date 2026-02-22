import { Queue } from 'bullmq'

// Re-use BullMQ's bundled ioredis for pub/sub to avoid dependency conflicts.
// We create lightweight Queue instances just to access Redis connections.

let publisherQueue: Queue | null = null

function getRedisUrl(): string | null {
  return process.env.REDIS_URL || null
}

/**
 * Publish a scratchpad event to a Redis channel.
 * Falls back to no-op if Redis is not available.
 */
export async function publishScratchpadEvent(
  documentId: string,
  event: Record<string, unknown>
): Promise<void> {
  const redisUrl = getRedisUrl()
  if (!redisUrl) return

  try {
    if (!publisherQueue) {
      publisherQueue = new Queue('scratchpad-pub', {
        connection: { url: redisUrl },
      })
    }

    // Use BullMQ's underlying Redis client to publish
    const client = await publisherQueue.client
    await client.publish(
      `scratchpad:${documentId}`,
      JSON.stringify(event)
    )
  } catch {
    // Silent — pub/sub should never break API responses
  }
}
