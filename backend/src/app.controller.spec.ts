import { AppController } from './app.controller'

describe('AppController observability', () => {
  it('exposes Prometheus text metrics with stable metric names', () => {
    const result = new AppController().prometheusMetrics()

    expect(result).toContain('# TYPE goldexa_up gauge')
    expect(result).toContain('goldexa_up 1')
    expect(result).toContain('goldexa_process_uptime_seconds ')
    expect(result.endsWith('\n')).toBe(true)
  })
})
