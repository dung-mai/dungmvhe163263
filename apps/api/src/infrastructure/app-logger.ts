import { Injectable, type LoggerService } from '@nestjs/common';
import pino from 'pino';
@Injectable()
export class AppLogger implements LoggerService {
  readonly raw = pino({
    level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body',
      'res.headers["set-cookie"]',
    ],
    ...(process.env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
  log(message: unknown, context?: string) {
    this.raw.info({ context }, String(message));
  }
  error(message: unknown, trace?: string, context?: string) {
    this.raw.error({ context, trace }, String(message));
  }
  warn(message: unknown, context?: string) {
    this.raw.warn({ context }, String(message));
  }
  debug(message: unknown, context?: string) {
    this.raw.debug({ context }, String(message));
  }
  verbose(message: unknown, context?: string) {
    this.raw.trace({ context }, String(message));
  }
  fatal(message: unknown, context?: string) {
    this.raw.fatal({ context }, String(message));
  }
}
