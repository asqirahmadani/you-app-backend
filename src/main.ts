import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  // Create HTTP app
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties that dont have decorators
      forbidNonWhitelisted: true, // throw error if non-whitelisted properties
      transform: true, // transform payload to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // auto convert types
      },
    }),
  );

  // Set global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  // Connect rabbitmq microservice
  const rabbitMQUrl = process.env.RABBITMQ_URL!;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitMQUrl],
      queue: 'chat_messages_queue',
      queueOptions: {
        durable: true, // queue survives broker restart
      },
      prefetchCount: 1, // process one message at a time
      noAck: false, // require manual acknowledgment
    },
  });

  // Start all microservices
  await app.startAllMicroservices();
  console.log('🐰 RabbitMQ Microservice is listening...');

  // Start HTTP server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/v1`);
  console.log(`🐰 RabbitMQ Management UI: http://localhost:15672`);
}

bootstrap().catch((error) => {
  console.error('❌ Error starting application:', error);
  process.exit(1);
});
