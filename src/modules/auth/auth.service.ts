import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';

/* 
Authentication Service - handle user registration, login, and token generation
*/
@Injectable()
export class AuthService {
  private readonly bcryptRounds: number;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.bcryptRounds = this.configService.get<number>('BCRYPT_ROUNDS') || 10;
  }

  /*
  register new user
  */
  async register(registerDto: RegisterDto) {
    const { email, username, password } = registerDto;

    // check if email already exists
    const existingUserByEmail = await this.usersService.findByEmail(email);
    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    // check if username already exists
    const existingUserByUsername =
      await this.usersService.findByUsername(username);
    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }

    // hash password
    const hashedPasssword = await this.hashPassword(password);

    // create user
    const user = await this.usersService.create({
      email,
      username,
      password: hashedPasssword,
    });

    // generate JWT token
    const accessToken = await this.generateToken(user);

    return {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
    };
  }

  /* 
  login user
  */
  async login(loginDto: LoginDto) {
    const { emailOrUsername, password } = loginDto;

    // validate credentials
    const user = await this.validateUser(emailOrUsername, password);

    // update last login timestamp
    await this.usersService.updateLastLogin(user._id);

    // generate JWT token
    const accessToken = await this.generateToken(user);

    return {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        lastLoginAt: new Date(),
      },
      accessToken,
    };
  }

  /* 
  validate user credentials
  */
  async validateUser(emailOrUsername: string, password: string) {
    let user = await this.usersService.findByEmail(emailOrUsername);

    if (!user) {
      user = await this.usersService.findByUsername(emailOrUsername);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  /* 
  hash password 
  */
  async hashPassword(password: string): Promise<string> {
    try {
      // const salt = await bcrypt.genSalt(this.bcryptRounds);
      return await bcrypt.hash(password, 10);
    } catch (error) {
      throw new BadRequestException('Error hashing password');
    }
  }

  /* 
  compare password 
  */
  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      return false;
    }
  }

  /* 
  generate JWT token 
  */
  async generateToken(user: any): Promise<string> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /* 
  verify JWT token token
  */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /* 
  refresh token 
  */
  async refreshToken(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return this.generateToken(user);
  }
}
