import { Controller, Get, Header } from '@nestjs/common'

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      service: 'Goldexa API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }

  @Get('health')
  health() {
    return {
      service: 'Goldexa API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }

  /** Process-level operational metrics (for monitoring / uptime checks). */
  @Get('metrics')
  metrics() {
    const mem = process.memoryUsage()
    return {
      service: 'Goldexa API',
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    }
  }

  /** Prometheus exposition format for a scrape target. */
  @Get('metrics/prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  prometheusMetrics() {
    const mem = process.memoryUsage()
    const lines = [
      '# HELP goldexa_process_uptime_seconds Process uptime in seconds.',
      '# TYPE goldexa_process_uptime_seconds gauge',
      `goldexa_process_uptime_seconds ${process.uptime()}`,
      '# HELP goldexa_process_resident_memory_bytes Resident process memory in bytes.',
      '# TYPE goldexa_process_resident_memory_bytes gauge',
      `goldexa_process_resident_memory_bytes ${mem.rss}`,
      '# HELP goldexa_process_heap_used_bytes Node.js heap currently used in bytes.',
      '# TYPE goldexa_process_heap_used_bytes gauge',
      `goldexa_process_heap_used_bytes ${mem.heapUsed}`,
      '# HELP goldexa_process_heap_total_bytes Node.js heap allocated in bytes.',
      '# TYPE goldexa_process_heap_total_bytes gauge',
      `goldexa_process_heap_total_bytes ${mem.heapTotal}`,
      '# HELP goldexa_up Whether the Goldexa API process is running.',
      '# TYPE goldexa_up gauge',
      'goldexa_up 1',
    ]
    return `${lines.join('\n')}\n`
  }
}
