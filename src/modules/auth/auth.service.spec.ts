import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Mock user data
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedPassword123',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
  };

  // Mock UsersService
  const mockUsersService = {
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
    findById: jest.fn(),
  };

  // Mock JwtService
  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  // Mock ConfigService
  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        BCRYPT_ROUNDS: 10,
        JWT_SECRET: 'test-secret',
        JWT_EXPIRATION: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Password123',
    };

    it('should register a new user successfully', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Act
      const result = await authService.register(registerDto);

      // Assert
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith(
        registerDto.username,
      );
      //   expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        username: registerDto.username,
        password: 'hashedPassword',
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'jwt-token');
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(authService.register(registerDto)).rejects.toThrow(
        'Email already exists',
      );
    });

    it('should throw ConflictException if username already exists', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(authService.register(registerDto)).rejects.toThrow(
        'Username already exists',
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      emailOrUsername: 'test@example.com',
      password: 'Password123',
    };

    it('should login user successfully with email', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        loginDto.emailOrUsername,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        mockUser._id,
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'jwt-token');
    });

    it('should login user successfully with username', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith(
        loginDto.emailOrUsername,
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        'User account is deactivated',
      );
    });
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await authService.validateUser(
        'test@example.com',
        'Password123',
      );

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.validateUser('wrong@example.com', 'Password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      // Arrange
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      // Act
      const result = await authService.hashPassword('Password123');

      // Assert
      //   expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(result).toBe('hashedPassword');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await authService.comparePassword(
        'Password123',
        'hashedPassword',
      );

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'Password123',
        'hashedPassword',
      );
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await authService.comparePassword(
        'WrongPassword',
        'hashedPassword',
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', async () => {
      // Arrange
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Act
      const result = await authService.generateToken(mockUser);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser._id.toString(),
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
      });
      expect(result).toBe('jwt-token');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      // Arrange
      const payload = {
        sub: mockUser._id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
      };
      mockJwtService.verify.mockReturnValue(payload);

      // Act
      const result = await authService.verifyToken('valid-token');

      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      // Arrange
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.verifyToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token for active user', async () => {
      // Arrange
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      // Act
      const result = await authService.refreshToken(mockUser._id);

      // Assert
      expect(mockUsersService.findById).toHaveBeenCalledWith(mockUser._id);
      expect(result).toBe('new-jwt-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      mockUsersService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refreshToken('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findById.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(authService.refreshToken(mockUser._id)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
