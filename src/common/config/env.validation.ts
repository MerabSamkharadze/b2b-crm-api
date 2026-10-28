/**
 * Environment Variables-ის ვალიდაცია აპლიკაციის ჩატვირთვისას.
 *
 * WHY: თუ JWT_ACCESS_SECRET აკლია, გვინდა რომ აპლიკაცია **მაშინვე** ჩავარდეს
 * გასაგები შეტყობინებით — და არა სამი დღის შემდეგ, როცა login-ი ჩუმად
 * არასაიმედო token-ებს დაიწყებს გამოშვებას. ეს "fail fast" პრინციპია.
 *
 * ── Mechanism: ConfigModule.forRoot({ validate }) ამ ფუნქციას გამოიძახებს
 * process.env-ით; დაბრუნებული ობიექტი ხდება ConfigService-ის წყარო.
 */
import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  // ── Mechanism: process.env-ის ყველა მნიშვნელობა **string**-ია ("3000").
  // @Type(() => Number) ეუბნება class-transformer-ს, რომ რიცხვად გარდაქმნას.
  // შეგნებულად არ გვაქვს enableImplicitConversion — explicit @Type უფრო
  // ნათელია და იგივე წესს DTO-ებშიც ვიცავთ (იხ. main.ts ValidationPipe).
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  // 32 სიმბოლო = 256 bit. უფრო მოკლე secret HS256-ს სისუსტეს უქმნის.
  @IsString()
  @MinLength(32, {
    message:
      'JWT_ACCESS_SECRET უნდა იყოს სულ მცირე 32 სიმბოლო (openssl rand -hex 32)',
  })
  JWT_ACCESS_SECRET: string;

  // ცალკე secret: access token-ის გაჟონვა refresh-ს არ უნდა გაუხსნას კარი.
  @IsString()
  @MinLength(32, {
    message:
      'JWT_REFRESH_SECRET უნდა იყოს სულ მცირე 32 სიმბოლო და access-ისგან განსხვავებული',
  })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  // bcrypt cost factor. 4 = სწრაფი (მხოლოდ ტესტებისთვის), 10 = production-ის მინიმუმი.
  @Type(() => Number)
  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_ROUNDS: number = 10;
}

export function validateEnv(
  raw: Record<string, unknown>,
): EnvironmentVariables {
  const config = plainToInstance(EnvironmentVariables, raw, {
    // enableImplicitConversion-ის გარეშე ვენდობით მხოლოდ @Type-ს (იხ. ზემოთ).
    exposeDefaultValues: true,
  });

  const errors = validateSync(config, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `  • ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`\n❌ .env ფაილი არასწორია:\n${details}\n`);
  }

  return config;
}
