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
    )

    await expect(controller.readiness()).resolves.toEqual(expect.objectContaining({
      status: 'ready',
      ready: true,
      checks: { database: 'ok', cache: 'ok' },
    }))
  })
})
