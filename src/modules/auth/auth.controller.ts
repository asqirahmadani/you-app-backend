import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

/* 
Authentication Controller - handles HTTP requests for authentication
*/
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /* 
  POST /auth/register  
  Register new user account
  */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);

    return {
      success: true,
      message: 'User registered successfully',
      data: result,
    };
  }

  /* 
  POST auth/login
  Login with email/username and password
  */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);

    return {
      success: true,
      message: 'Login successful',
      data: result,
    };
  }

  /* 
  GET /auth/me
  Get current authenticated user
  */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@Request() req) {
    return {
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: req.user,
      },
    };
  }

  /* 
  POST /auth/refresh
  Refresh JWT access token
  */
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Request() req) {
    const newToken = await this.authService.refreshToken(req.user.userId);

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newToken,
      },
    };
  }

  /* 
  POST /auth/logout
  Logout user (client-side token removal)
  */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout() {
    return {
      success: true,
      message: 'Logged out successfully. Please remove token from client.',
    };
  }
}
