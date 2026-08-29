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
  private readonly namespace = this.normaliseNamespace(process.env.CACHE_NAMESPACE ?? 'goldexa')
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

  /** The configured key namespace, exposed for diagnostics and tests. */
  get keyNamespace(): string {
    return this.namespace
  }

  async get<T>(key: string): Promise<T | null> {
    this.assertDistributedInProduction(key)
    let raw: string | null = null
    const namespacedKey = this.keyFor(key)
    if (this.redisReady && this.client) {
      try {
        raw = await this.client.get(namespacedKey)
      } catch {
        // Redis is an acceleration/distribution layer, not a reason to crash
        // the request. Read the expiring local fallback when Redis is down.
        raw = this.getFromMemory(namespacedKey)
      }
    } else {
      raw = this.getFromMemory(namespacedKey)
    }
    if (raw == null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.assertDistributedInProduction(key)
    const raw = JSON.stringify(value)
    const namespacedKey = this.keyFor(key)
    const ttl = Math.max(1, Math.ceil(ttlSeconds))
    if (this.redisReady && this.client) {
      try {
        await this.client.set(namespacedKey, raw, 'EX', ttl)
        return
      } catch {
        // Keep a bounded, expiring fallback for local development and a
        // graceful degradation path during a short Redis outage.
      }
    }
    this.memory.set(namespacedKey, { value: raw, expiresAt: Date.now() + ttl * 1000 })
  }

  async del(key: string): Promise<void> {
    this.assertDistributedInProduction(key)
    const namespacedKey = this.keyFor(key)
    if (this.redisReady && this.client) {
      try {
        await this.client.del(namespacedKey)
        this.memory.delete(namespacedKey)
        return
      } catch {
        /* fall through */
      }
    }
    this.memory.delete(namespacedKey)
  }

  private keyFor(key: string): string {
    return `${this.namespace}:${key.replace(/^:+/, '')}`
  }

  private assertDistributedInProduction(key: string): void {
    if (process.env.NODE_ENV === 'production' && key.replace(/^:+/, '').startsWith('pricing:quote:') && !this.redisReady) {
      throw new Error('Redis برای quoteهای checkout در محیط production الزامی است')
    }
  }

  private normaliseNamespace(namespace: string): string {
    const value = namespace.trim().replace(/[^a-zA-Z0-9:_-]/g, '-')
    return value || 'goldexa'
  }

  private getFromMemory(key: string): string | null {
    const entry = this.memory.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key)
      return null
    }
    return entry.value
  }
}
