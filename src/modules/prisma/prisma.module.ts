/**
 * PrismaModule — @Global, რომ PrismaService ყველგან ხელმისაწვდომი იყოს.
 *
 * WHY @Global(): ბაზასთან კავშირი ჭეშმარიტად cross-cutting რესურსია — მას
 * ყველა feature module იყენებს. @Global-ის გარეშე ყოველ module-ში
 * `imports: [PrismaModule]` უნდა გვეწერა. ⚠️ @Global-ს ზომიერად იყენებენ:
 * როცა ყველაფერი global-ია, module-ების საზღვრები აზრს კარგავს.
 *
 * ── Mechanism: @Global მხოლოდ იმას ნიშნავს, რომ ამ module-ის **exports**
 * ავტომატურად ხელმისაწვდომია სხვებისთვის — ის singleton-ობას არ ცვლის
 * (NestJS-ში provider ისედაც singleton-ია თითო application context-ზე).
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
