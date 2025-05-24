import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, ExceptionFilter, ArgumentsHost, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof UnauthorizedException) {
      status = HttpStatus.UNAUTHORIZED;
      message = 'Authentication failed - Please check your JWT token';
      this.logger.error(`Authentication failed for request ${request.url}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Add global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Setup static file serving for uploads
  app.use('/uploads', express.static(join(__dirname, '..', process.env.UPLOAD_DIRECTORY || 'uploads')));

  // Enable CORS
  app.enableCors();

  // Start the application
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();