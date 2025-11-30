import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/* 
Authentication Module - configures JWT auth and related services
*/
@Module({
  imports: [
    // import UsersModule to access UsersService
    UsersModule,

    // configuer passport with JWT strategy
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false, // stateless auth
    }),

    // configure JWT module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),

        // token expiration time
        signOptions: {
          expiresIn: configService.get<any>('JWT_EXPIRATION') || '7d',
          issuer: 'you-app-api',
          audience: 'you-app-users',
        },

        // verification options
        verifyOptions: {
          issuer: 'you-app-api',
          audience: 'you-app-users',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
