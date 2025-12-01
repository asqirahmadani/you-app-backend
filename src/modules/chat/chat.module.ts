import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';

import { Message, MessageSchema } from 'src/schemas/message.schema';
import { ChatMicroservice } from './chat.microservice';
import { UsersModule } from '../users/users.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

/* 
Chat Module - manages chat functionality with RabbitMQ integration
*/
@Module({
  imports: [
    // register message schema with mongoose
    MongooseModule.forFeature([
      {
        name: Message.name,
        schema: MessageSchema,
      },
    ]),

    // import UsersModule for user validation
    UsersModule,

    // register RabbitMQ Client for publishing
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')!],
            queue: 'chat_messages_queue',
            queueOptions: {
              durable: true, // queue survive broker restart
            },
            // publisher options
            noAck: false, // require acknowledgement
            persistent: true, // messages survive broker restart
          },
        }),
      },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatMicroservice],
  exports: [ChatService],
})
export class ChatModule {}
