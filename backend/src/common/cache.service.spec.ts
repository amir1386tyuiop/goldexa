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
})
