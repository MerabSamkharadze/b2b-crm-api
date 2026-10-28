/**
 * @Public() — ამ endpoint-ს ავთენტიფიკაცია არ სჭირდება.
 *
 * WHY ასე და არა პირიქით: JwtAuthGuard გლობალურად არის რეგისტრირებული, ანუ
 * **ყველაფერი დაცულია by default**. დაცვა რომ ხელით გვემატებინა
 * (`@UseGuards(JwtAuthGuard)` ყოველ controller-ზე), ერთ დავიწყებას
 * ღია endpoint-ი ეწოდებოდა. ახლა დავიწყება მხოლოდ 401-ს იწვევს — უსაფრთხო მარცხი.
 *
 * ── Mechanism: SetMetadata აწერს კლასს/მეთოდს metadata-ს, რომელსაც Guard
 * `Reflector`-ით კითხულობს. ეს არის NestJS-ის დეკორატორების საფუძველი.
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
