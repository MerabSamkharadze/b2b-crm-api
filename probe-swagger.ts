import { Test } from '@nestjs/testing';
import { AppModule } from './src/app.module.js';
import { configureApp } from './src/common/config/configure-app.js';
import { PrismaService } from './src/modules/prisma/prisma.service.js';

const prismaMock = {
  $connect: async () => undefined,
  $disconnect: async () => undefined,
  onModuleInit: async () => undefined,
  onModuleDestroy: async () => undefined,
};

const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(PrismaService)
  .useValue(prismaMock)
  .compile();

const app = moduleRef.createNestApplication();
configureApp(app);
await app.listen(4099, '127.0.0.1');
console.log('RESULT listening');
await app.close();
