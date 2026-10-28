/**
 * @Roles(Role.ADMIN, Role.MANAGER) — endpoint-ზე დაშვებული როლები.
 *
 * ეს დეკორატორი თავად **არაფერს ამოწმებს** — ის მხოლოდ metadata-ს აწერს.
 * შემოწმებას RolesGuard აკეთებს. ასეთი გაყოფა (მონიშვნა vs. აღსრულება)
 * NestJS-ის ტიპური პატერნია: დეკორატორი აღწერს *რა გვინდა*, Guard — *როგორ*.
 */
import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../prisma-client.js';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
