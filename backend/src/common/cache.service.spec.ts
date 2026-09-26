import { CacheService } from './cache.service'

describe('CacheService fallback cache', () => {
  const originalDriver = process.env.CACHE_DRIVER
  const originalNamespace = process.env.CACHE_NAMESPACE
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.CACHE_DRIVER = 'memory'
    process.env.CACHE_NAMESPACE = 'test-cache'
  })

  afterEach(() => {
    jest.useRealTimers()
    if (originalDriver === undefined) delete process.env.CACHE_DRIVER
    else process.env.CACHE_DRIVER = originalDriver
    if (originalNamespace === undefined) delete process.env.CACHE_NAMESPACE
    else process.env.CACHE_NAMESPACE = originalNamespace
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })

  it('serializes values and applies TTL in the fallback', async () => {
    jest.useFakeTimers()
    const cache = new CacheService()
    await cache.onModuleInit()

    await cache.set('pricing:quote:Q-1', { total: 123 }, 5)
    await expect(cache.get('pricing:quote:Q-1')).resolves.toEqual({ total: 123 })

    jest.advanceTimersByTime(5_001)
    await expect(cache.get('pricing:quote:Q-1')).resolves.toBeNull()
    expect(cache.keyNamespace).toBe('test-cache')
  })

  it('does not leak a deleted fallback value', async () => {
    const cache = new CacheService()
    await cache.onModuleInit()

    await cache.set('pricing:quote:Q-2', { total: 456 }, 300)
    await cache.del('pricing:quote:Q-2')
    await expect(cache.get('pricing:quote:Q-2')).resolves.toBeNull()
  })

  it('fails closed for financial quotes when Redis is unavailable in production', async () => {
    process.env.NODE_ENV = 'production'
    const cache = new CacheService()
    await cache.onModuleInit()

    await expect(cache.set('pricing:quote:Q-prod', { total: 456 }, 300))
      .rejects.toThrow('Redis برای quoteهای checkout در محیط production الزامی است')
    await expect(cache.get('pricing:quote:Q-prod'))
      .rejects.toThrow('Redis برای quoteهای checkout در محیط production الزامی است')
  })

  it('enforces a bounded rate-limit window in the fallback cache', async () => {
    const cache = new CacheService()
    await cache.onModuleInit()

    await expect(cache.consumeRateLimit('otp:127.0.0.1', 2, 60_000)).resolves.toBe(true)
    await expect(cache.consumeRateLimit('otp:127.0.0.1', 2, 60_000)).resolves.toBe(true)
    await expect(cache.consumeRateLimit('otp:127.0.0.1', 2, 60_000)).resolves.toBe(false)
  })

  it('allows only one owner for a short-lived fallback lock', async () => {
    const cache = new CacheService()
    await cache.onModuleInit()

    const token = await cache.acquireLock('auction:lifecycle', 30)
    expect(token).toEqual(expect.any(String))
    await expect(cache.acquireLock('auction:lifecycle', 30)).resolves.toBeNull()
    await cache.releaseLock('auction:lifecycle', token as string)
    await expect(cache.acquireLock('auction:lifecycle', 30)).resolves.toEqual(expect.any(String))
  })
})
