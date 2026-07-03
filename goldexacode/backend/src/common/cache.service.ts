import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Redis } from 'ioredis'

/**
 * Cache abstraction that uses Redis when a server is reachable and transparently
 * falls back to an in-process map otherwise. This keeps local/dev working with
 * zero infrastructure while being production-ready: bring up a Redis server
 * (REDIS_HOST/REDIS_PORT) and the same code uses it, no changes required.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Cache')
  private client: Redis | null = null
  private redisReady = false
  private readonly memory = new Map<string, { value: string; expiresAt: number }>()

  async onModuleInit(): Promise<void> {
    if ((process.env.CACHE_DRIVER ?? 'redis').toLowerCase() === 'memory') {
      this.logger.log('Cache driver: in-memory (CACHE_DRIVER=memory)')
      return
    }
    try {
      const client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        reconnectOnError: () => false,
      })
      // Swallow async errors so a missing Redis never crashes the app.
      client.on('error', () => undefined)
      await client.connect()
      this.client = client
      this.redisReady = true
      this.logger.log('Cache driver: Redis')
    } catch {
      this.redisReady = false
      this.logger.warn('Redis unavailable — using in-memory cache fallback')
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client?.quit()
    } catch {
      /* ignore */
    }
  }

  get driver(): 'redis' | 'memory' {
    return this.redisReady ? 'redis' : 'memory'
  }

  async get<T>(key: string): Promise<T | null> {
    let raw: string | null = null
    if (this.redisReady && this.client) {
      try {
        raw = await this.client.get(key)
      } catch {
        raw = null
      }
    } else {
      const entry = this.memory.get(key)
      if (entry && entry.expiresAt > Date.now()) raw = entry.value
      else if (entry) this.memory.delete(key)
    }
    if (raw == null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value)
    if (this.redisReady && this.client) {
      try {
        await this.client.set(key, raw, 'EX', Math.max(1, ttlSeconds))
        return
      } catch {
        /* fall through to memory */
      }
    }
    this.memory.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  async del(key: string): Promise<void> {
    if (this.redisReady && this.client) {
      try {
        await this.client.del(key)
        return
      } catch {
        /* fall through */
      }
    }
    this.memory.delete(key)
  }
}
