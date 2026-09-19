import { CacheService } from './cache.service'

describe('CacheService fallback cache', () => {
  const originalDriver = process.env.CACHE_DRIVER
  const originalNamespace = process.env.CACHE_NAMESPACE

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
