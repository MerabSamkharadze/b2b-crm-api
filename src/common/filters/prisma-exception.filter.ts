/**
 * PrismaExceptionFilter — ბაზის შეცდომებს HTTP პასუხებად თარგმნის.
 *
 * WHY: ფილტრის გარეშე Prisma-ს unique-constraint შეცდომა კლიენტს
 * **500 Internal Server Error**-ად დაუბრუნდება, თითქოს ჩვენი bug იყოს.
 * სინამდვილეში ეს კლიენტის შეცდომაა (409 Conflict) — სწორი სტატუსი კლიენტს
 * საშუალებას აძლევს სწორად მოიქცეს (retry არ ცადოს, შეტყობინება აჩვენოს).
 *
 * ── Mechanism: @Catch(...) ეუბნება NestJS-ს, რომ ეს ფილტრი მხოლოდ ამ
 * ტიპის exception-ებს დაიჭერს. ფილტრები მუშაობენ ყველაფრის **შემდეგ** —
 * ისინი exception-ის "last mile"-ია, სანამ პასუხი კლიენტს გაეგზავნება.
 *
 * Prisma-ს კოდების სრული სია: https://pris.ly/d/error-reference
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../prisma-client.js';

type PrismaError =
  Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError;

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: PrismaError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.translate(exception, request);

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private translate(
    exception: PrismaError,
    request: Request,
  ): { status: number; message: string } {
    // PrismaClientValidationError = **ჩვენი** შეცდომა (არასწორად აწყობილი query).
    // ამიტომ ხმამაღლა ვლოგავთ: ეს bug-ია და არა მომხმარებლის ბრალი.
    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(
        `Prisma query არასწორად აწყობილია: ${exception.message}`,
      );
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'მოთხოვნა ვერ დამუშავდა',
      };
    }

    switch (exception.code) {
      // Unique constraint — მაგ. იგივე email-ით მეორე რეგისტრაცია.
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: `ასეთი ჩანაწერი უკვე არსებობს${this.safeFields(exception)}`,
        };

      // ჩანაწერი ვერ მოიძებნა — ან არ არსებობს, ან **სხვისია** (იხ.
      // scopedWhereUnique: role-scope-ის დარღვევაც ამ კოდს იწვევს).
      // სწორედ ამიტომ 404-ია და არა 403: არსებობის ფაქტს არ ვამჟღავნებთ.
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'ჩანაწერი ვერ მოიძებნა',
        };

      // Foreign key constraint. DELETE-ზე ეს ნიშნავს "დამოკიდებული ჩანაწერები
      // არსებობს" (onDelete: Restrict), სხვა მეთოდზე — "არასწორი id მივუთითეთ".
      case 'P2003':
        return request.method === 'DELETE'
          ? {
              status: HttpStatus.CONFLICT,
              message: 'წაშლა ვერ მოხდა: ჩანაწერს დამოკიდებული მონაცემები აქვს',
            }
          : {
              status: HttpStatus.BAD_REQUEST,
              message: 'მიბმული ჩანაწერი ვერ მოიძებნა',
            };

      // მნიშვნელობა სვეტის ზომას აღემატება.
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'მნიშვნელობა ძალიან გრძელია',
        };

      // სავალდებულო რელაცია დარღვეულია.
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'ოპერაცია არღვევს ჩანაწერებს შორის სავალდებულო კავშირს',
        };

      // Transaction write conflict / deadlock — ორი request ერთსა და იმავე
      // სტრიქონს ერთდროულად ცვლის. ეს კლიენტს უნდა აცნობოს, რომ **ხელახლა ცადოს**.
      case 'P2034':
        return {
          status: HttpStatus.CONFLICT,
          message: 'ჩანაწერი პარალელურად შეიცვალა, გაიმეორეთ მოთხოვნა',
        };

      default:
        this.logger.error(
          `დაუმუშავებელი Prisma კოდი ${exception.code}: ${exception.message}`,
        );
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'ბაზის შიდა შეცდომა',
        };
    }
  }

  /**
   * ⚠️ უსაფრთხოება: exception.meta.target შეიცავს ბაზის სვეტების სახელებს.
   * production-ში ასეთი დეტალი კლიენტს არ უნდა გაეგზავნოს (schema-ს ამჟღავნებს).
   * development-ში კი ის ძალიან გვეხმარება — ამიტომ გარემოზეა დამოკიდებული.
   */
  private safeFields(exception: Prisma.PrismaClientKnownRequestError): string {
    if (process.env.NODE_ENV === 'production') return '';
    const target = exception.meta?.['target'];
    return Array.isArray(target) ? ` (${target.join(', ')})` : '';
  }
}
