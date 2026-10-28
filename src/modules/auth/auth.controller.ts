/**
 * AuthController — HTTP-ის "კარი" ავთენტიფიკაციისთვის.
 *
 * Controller-ის პასუხისმგებლობა შეგნებულად ვიწროა: მიიღე request, გადაეცი
 * service-ს, დააბრუნე პასუხი. **ბიზნეს ლოგიკა controller-ში არ იწერება** —
 * თორემ მისი ტესტირება HTTP-ის გარეშე შეუძლებელი ხდება.
 */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { minutes, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('auth')
@Controller('auth')
// ── Mechanism: rate limiting მხოლოდ **აქ** და არა გლობალურად.
// WHY: login/register არის brute-force-ის მთავარი სამიზნე. გლობალური ლიმიტი
// კი development-ს ურთულებს (Swagger-ით ტესტირებისას ზედმეტი 429-ები).
// ⚠️ ნაკლი: ლიმიტი მეხსიერებაშია, ანუ ერთ instance-ზე მუშაობს. რეალურ
// განაწილებულ სისტემაში Redis storage სჭირდება.
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: minutes(1) } })
  @ApiOperation({
    summary: 'ახალი ანგარიშის რეგისტრაცია (role ყოველთვის SALES_REP)',
  })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'email უკვე რეგისტრირებულია' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  // ── Mechanism: @HttpCode(200) — POST-ის default 201-ია ("შეიქმნა"), მაგრამ
  // login-ი არაფერს ქმნის. სწორი სტატუსი API-ის თვითდოკუმენტირების ნაწილია.
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  @ApiOperation({ summary: 'შესვლა და access token-ის მიღება' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'email ან პაროლი არასწორია' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ახალი access token refresh token-ით (სავარჯიშო #09)',
  })
  @ApiResponse({ status: 501, description: 'ჯერ არ არის იმპლემენტირებული' })
  refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<AuthResponseDto> {
    return this.auth.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'გასვლა — refresh token-ის გაუქმება (სავარჯიშო #09)',
  })
  logout(@CurrentUser() actor: AuthUser): Promise<void> {
    return this.auth.logout(actor.id);
  }
}
