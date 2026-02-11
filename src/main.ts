import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import { execSync } from 'child_process';

import { AppModule } from 'src/app.module';
import { isSeeded, seed } from '../prisma/seed';

async function bootstrap() {
  // Run Prisma DB Push to sync database schema
  try {
    console.log('Syncing database schema...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('Database schema synced!');
  } catch (error) {
    console.error('Error syncing database schema:', error);
    // Continue application startup even if db push fails
  }

  // Check and run seed if not already done
  try {
    const alreadySeeded = await isSeeded();
    if (!alreadySeeded) {
      console.log('Database not seeded, running seed...');
      await seed();
      console.log('Database seeding completed!');
    } else {
      console.log('Database already seeded, skipping...');
    }
  } catch (error) {
    console.error('Error checking or running seed:', error);
    // Continue application startup even if seed fails
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());

  const apiPrefix = process.env.API_PREFIX || '';
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Turbo Badges API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerPath = apiPrefix ? `${apiPrefix}/docs` : 'docs';
  SwaggerModule.setup(swaggerPath, app, swaggerDocument);

  const uploadsPrefix = apiPrefix ? `${apiPrefix}/uploads/` : '/uploads/';
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: uploadsPrefix,
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
