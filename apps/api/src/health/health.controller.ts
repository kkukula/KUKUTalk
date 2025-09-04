import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    // Basic liveness; deeper checks (DB/Redis) are added in later iterations
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    }
  }
}
