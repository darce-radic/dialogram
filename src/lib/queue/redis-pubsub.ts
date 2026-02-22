import { Queue } from 'bullmq'

// Re-use BullMQ's bundled ioredis for pub/sub to avoid dependency conflicts.
// Single shared publisher + single shared subscriber connection (not per-SSE-client).

let publisherQueue: Queue | null = null
let subscriberQueue: Queue | null = null
// The subscriber client is an ioredis instance obtained by duplicating BullMQ's
// internal connection. Typed loosely because BullMQ doesn't export the Redis type.
let subscriberClient: {
  on: (event: string, handler: (...args: string[]) => void) => void
  subscribe: (channel: string) => Promise<unknown>
  unsubscribe: (channel: string) => Promise<unknown>
  duplicate: () => unknown
} | null = null

// Track channel subscriptions: channel -> Set of callbacks
const channelListeners = new Map<string, Set<(message: string) => void>>()
let messageHandlerAttached = false

function getRedisUrl(): string | null {
  return process.env.REDIS_URL || null
}

async function getSubscriberClient() {
  if (subscriberClient) return subscriberClient

  const redisUrl = getRedisUrl()
  if (!redisUrl) return null

  if (!subscriberQueue) {
    subscriberQueue = new Queue('scratchpad-sub', {
      connection: { url: redisUrl },
    })
  }

  const baseClient = await subscriberQueue.client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscriberClient = (baseClient as any).duplicate()

  return subscriberClient
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

    const client = await publisherQueue.client
    await client.publish(
      `scratchpad:${documentId}`,
      JSON.stringify(event)
    )
  } catch {
    // Silent — pub/sub should never break API responses
  }
}

/**
 * Subscribe to a scratchpad channel. Returns an unsubscribe function.
 * Uses a single shared Redis subscriber connection for all channels.
 */
export async function subscribeScratchpad(
  documentId: string,
  callback: (message: string) => void
): Promise<() => void> {
  const channel = `scratchpad:${documentId}`
  const client = await getSubscriberClient()

  if (!client) {
    return () => {}
  }

  // Attach the global message handler once
  if (!messageHandlerAttached) {
    client.on('message', (ch: string, message: string) => {
      const listeners = channelListeners.get(ch)
      if (listeners) {
        for (const listener of listeners) {
          try {
            listener(message)
          } catch {
            // Ignore listener errors
          }
        }
      }
    })
    messageHandlerAttached = true
  }

  // Add this callback to the channel's listener set
  if (!channelListeners.has(channel)) {
    channelListeners.set(channel, new Set())
    await client.subscribe(channel)
  }
  channelListeners.get(channel)!.add(callback)

  // Return unsubscribe function
  return () => {
    const listeners = channelListeners.get(channel)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        channelListeners.delete(channel)
        client.unsubscribe(channel).catch(() => {})
      }
    }
  }
}
