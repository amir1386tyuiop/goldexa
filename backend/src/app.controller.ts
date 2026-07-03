import { Controller, Get } from '@nestjs/common'

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
}
