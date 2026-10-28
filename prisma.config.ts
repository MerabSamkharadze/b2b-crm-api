/**
 * Prisma CLI-ის კონფიგურაცია (Prisma 7+).
 *
 * WHY: Prisma 6-ში seed-ის ბრძანება package.json-ში იწერებოდა
 * (`"prisma": { "seed": ... }`) და CLI თავად კითხულობდა .env-ს.
 * Prisma 7-ში ორივე შეიცვალა — ამიტომ გვჭირდება ეს ფაილი.
 */
// ── Mechanism: Prisma 7 CLI .env-ს **ავტომატურად აღარ** კითხულობს.
// ეს import ავსებს process.env-ს, სანამ env() ქვემოთ წაიკითხავს.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',

    // `npx prisma db seed` ზუსტად ამ ბრძანებას გაუშვებს.
    // tsx გვჭირდება იმიტომ, რომ seed.ts TypeScript-ია და Node მას პირდაპირ ვერ გაუშვებს.
    // ⚠️ Prisma 7-ში seed **აღარ** გაეშვება `migrate dev`-ზე ავტომატურად — მხოლოდ ხელით.
    seed: 'tsx prisma/seed.ts',
  },

  // datasource აქ migration/introspection ბრძანებებისთვისაა საჭირო
  // (schema-ში მითითებული url აპლიკაციის runtime-ს ემსახურება).
  datasource: {
    url: env('DATABASE_URL'),
  },
});
