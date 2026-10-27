import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { AppLogger } from './infrastructure/app-logger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
export async function createApp() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, abortOnError: false });
  const logger = app.get(AppLogger);
  app.useLogger(logger);
  app.use(
    pinoHttp({
      logger: logger.raw,
      genReqId: (request, response) => {
        const value = request.headers['x-request-id'];
        const id =
          typeof value === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(value) ? value : randomUUID();
        response.setHeader('x-request-id', id);
        return id;
      },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url?.split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new ApiExceptionFilter(logger));
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Flashlab API')
      .setVersion('1.0')
      .setDescription('Catalog, merchandising and flash sale APIs. Prices are integer VND strings.')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
  app.enableShutdownHooks();
  return app;
}
