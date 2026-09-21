import { AppController } from './app.controller'

describe('AppController observability', () => {
  it('exposes Prometheus text metrics with stable metric names', () => {
    const result = new AppController().prometheusMetrics()

    expect(result).toContain('# TYPE goldexa_up gauge')
    expect(result).toContain('goldexa_up 1')
    expect(result).toContain('goldexa_process_uptime_seconds ')
    expect(result.endsWith('\n')).toBe(true)
  })

  it('reports database and Redis readiness explicitly', async () => {
    const controller = new AppController(
      { query: jest.fn().mockResolvedValue([{ ok: 1 }]) } as never,
      { driver: 'redis' } as never,
      { getFeedStatus: jest.fn().mockReturnValue({ source: 'tgju', lastFetchAt: new Date() }) } as never,
    )

    await expect(controller.readiness()).resolves.toEqual(expect.objectContaining({
      status: 'ready',
      ready: true,
      checks: { database: 'ok', cache: 'ok', priceFeed: 'ok' },
    }))
  })

  it('does not report production readiness when the price feed is missing or stale', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const controller = new AppController(
        { query: jest.fn().mockResolvedValue([{ ok: 1 }]) } as never,
        { driver: 'redis' } as never,
        { getFeedStatus: jest.fn().mockReturnValue({ source: 'tgju', lastFetchAt: new Date(Date.now() - 181_000) }) } as never,
      )

      await expect(controller.readiness()).resolves.toEqual(expect.objectContaining({
        status: 'not_ready',
        ready: false,
        checks: { database: 'ok', cache: 'ok', priceFeed: 'degraded' },
      }))
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previousNodeEnv
    }
  })
})
