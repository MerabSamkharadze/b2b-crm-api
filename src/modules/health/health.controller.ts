/**
 * HealthController — "walking skeleton"-ის საბოლოო წერტილი.
 *
 * WHY: სანამ ექვს entity-ს დავამოდელირებთ, გვინდა დავრწმუნდეთ, რომ სრული ჯაჭვი
 * Request → Controller → Service → Prisma → PostgreSQL → Response მუშაობს.
 * ასე ყოველი მომავალი შეცდომას ერთმნიშვნელოვანი მიზეზი აქვს.
 *
 * ეს endpoint ასევე რეალურ სამყაროშიც საჭიროა: load balancer-ები და
 * orchestrator-ები (Kubernetes liveness/readiness probe) სწორედ ამას ეკითხებიან.
 */
import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('health')
// ── Mechanism: version: VERSION_NEUTRAL ნიშნავს, რომ ეს route ყველა ვერსიაზე
// პასუხობს — /api/health (და არა /api/v1/health). Health check-ი API-ის
// კონტრაქტის ნაწილი არ არის, ამიტომ ვერსიონირებას არ ექვემდებარება.
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ამოწმებს, რომ აპლიკაცია ცოცხალია **და** ბაზას ნამდვილად სწვდება.
   *
   * WHY `SELECT 1`: ეს ყველაზე იაფი query-ია, რომელიც მაინც სრულ გზას გაივლის —
   * connection pool → TCP → PostgreSQL → უკან. მხოლოდ `{ status: 'ok' }`-ის
   * დაბრუნება ტყუილი იქნებოდა: აპლიკაცია შეიძლება ცოცხალი იყოს, ბაზა კი არა.
   */
  @Get()
  @ApiOperation({ summary: 'აპლიკაციისა და ბაზის მდგომარეობა' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error(
        'Health check ჩავარდა: ბაზა მიუწვდომელია',
        error as Error,
      );
      // 503 (და არა 500): პრობლემა dependency-შია, არა ჩვენს კოდში.
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }

    return {
      status: 'ok',
      database: 'up',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
