import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';

import { ProfilesModule } from './modules/profiles/profiles.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true, // make config available globally
      envFilePath: '.env',
      cache: true, // cache environment variables
    }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        retryAttempts: 3,
        retryDelay: 1000,
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('✅ MongoDB connected successfully');
          });
          connection.on('disconnected', () => {
            console.log('❌ MongoDB disconnected');
          });
          connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
          });
          return connection;
        },
      }),
    }),

    UsersModule,
    AuthModule,
    ProfilesModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
