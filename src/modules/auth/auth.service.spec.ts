/**
 * AuthService-ის unit ტესტები — **ბაზის გარეშე**.
 *
 * ── Mechanism: Test.createTestingModule აწყობს NestJS-ის DI კონტეინერს,
 * სადაც ნამდვილი UsersService/JwtService ჩანაცვლებულია mock-ებით
 * (`{ provide: UsersService, useValue: ... }`). ასე ვტესტავთ **მხოლოდ**
 * AuthService-ის ლოგიკას: PostgreSQL, HTTP და JWT-ის ხელმოწერა არ გვჭირდება.
 *
 * ეს ფაილი ნიმუშია — იმავე პატერნით დაწერე ტესტები შენი სავარჯიშოებისთვის.
 */
import { NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { Role } from '../../prisma-client.js';

describe('AuthService', () => {
  let service: AuthService;

  const usersMock = {
    create: vi.fn(),
    findByEmailForAuth: vi.fn(),
    setRefreshTokenHash: vi.fn(),
  };

  const jwtMock = { signAsync: vi.fn() };

  // ConfigService-ის mock: ყოველთვის default-ს აბრუნებს, ანუ BCRYPT_ROUNDS = 10.
  const configMock = {
    get: vi.fn((_key: string, fallback?: unknown) => fallback),
  };

  /**
   * ⚠️ rounds = 4 და არა 10.
   * WHY: bcrypt შეგნებულად ნელია (~100ms @ 10). ათეულ ტესტზე ეს წამებში
   * გადაიზრდება. ტესტის გარემოში დაბალი cost factor ნორმალური პრაქტიკაა —
   * ჩვენ ალგორითმის სისწრაფეს არ ვტესტავთ, ლოგიკას ვტესტავთ.
   */
  const CORRECT_PASSWORD = 'Password123!';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(CORRECT_PASSWORD, 4);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    jwtMock.signAsync.mockResolvedValue('signed.jwt.token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('ქმნის მომხმარებელს და აბრუნებს token-ს', async () => {
      usersMock.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@crm.test',
        role: Role.SALES_REP,
      });

      const result = await service.register({
        email: 'new@crm.test',
        password: CORRECT_PASSWORD,
        firstName: 'ტესტი',
        lastName: 'ტესტაძე',
      });

      expect(usersMock.create).toHaveBeenCalledTimes(1);
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.user.role).toBe(Role.SALES_REP);
    });

    it('JWT-ის payload-ში მხოლოდ `sub` წერია (role შეგნებულად არ არის)', async () => {
      usersMock.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@crm.test',
        role: Role.ADMIN,
      });

      await service.register({
        email: 'new@crm.test',
        password: CORRECT_PASSWORD,
        firstName: 'ა',
        lastName: 'ბ',
      });

      expect(jwtMock.signAsync).toHaveBeenCalledWith({ sub: 'user-1' });
    });
  });

  describe('login', () => {
    it('სწორი credential-ებით აბრუნებს token-ს', async () => {
      usersMock.findByEmailForAuth.mockResolvedValue({
        id: 'user-1',
        email: 'admin@crm.test',
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
      });

      const result = await service.login({
        email: 'admin@crm.test',
        password: CORRECT_PASSWORD,
      });

      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('არასწორ პაროლზე აგდებს 401-ს', async () => {
      usersMock.findByEmailForAuth.mockResolvedValue({
        id: 'user-1',
        email: 'admin@crm.test',
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
      });

      await expect(
        service.login({ email: 'admin@crm.test', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('არარსებულ email-ზე აგდებს იმავე 401-ს (enumeration-ის დაცვა)', async () => {
      usersMock.findByEmailForAuth.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@crm.test', password: CORRECT_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('დეაქტივირებულ ანგარიშს არ უშვებს', async () => {
      usersMock.findByEmailForAuth.mockResolvedValue({
        id: 'user-1',
        email: 'fired@crm.test',
        password: passwordHash,
        role: Role.SALES_REP,
        isActive: false,
      });

      await expect(
        service.login({ email: 'fired@crm.test', password: CORRECT_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('token-ს არ გამოუშვებს, როცა ავთენტიფიკაცია ჩავარდა', async () => {
      usersMock.findByEmailForAuth.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@crm.test', password: 'x' }),
      ).rejects.toThrow();

      expect(jwtMock.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('refresh (სავარჯიშო #09)', () => {
    it('ჯერ არ არის იმპლემენტირებული — 501', async () => {
      await expect(service.refresh('some.refresh.token')).rejects.toThrow(
        NotImplementedException,
      );
    });
  });
});
