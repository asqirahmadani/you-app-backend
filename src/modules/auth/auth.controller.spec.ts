import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  // Mock AuthService
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  // Mock user data
  const mockUser = {
    id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
    createdAt: new Date(),
  };

  const mockAuthResult = {
    user: mockUser,
    accessToken: 'jwt-token-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Password123',
    };

    it('should register a new user successfully', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue(mockAuthResult);

      // Act
      const result = await authController.register(registerDto);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        success: true,
        message: 'User registered successfully',
        data: mockAuthResult,
      });
    });

    it('should throw error if registration fails', async () => {
      // Arrange
      const error = new Error('Registration failed');
      mockAuthService.register.mockRejectedValue(error);

      // Act & Assert
      await expect(authController.register(registerDto)).rejects.toThrow(error);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    const loginDto = {
      emailOrUsername: 'test@example.com',
      password: 'Password123',
    };

    it('should login user successfully', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResult);

      // Act
      const result = await authController.login(loginDto);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        data: mockAuthResult,
      });
    });

    it('should throw error if login fails', async () => {
      // Arrange
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(authController.login(loginDto)).rejects.toThrow(error);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getMe', () => {
    const mockRequest = {
      user: {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
      },
    };

    it('should return current user information', async () => {
      // Act
      const result = await authController.getMe(mockRequest);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'User retrieved successfully',
        data: {
          user: mockRequest.user,
        },
      });
    });
  });

  describe('refreshToken', () => {
    const mockRequest = {
      user: {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
      },
    };

    it('should refresh token successfully', async () => {
      // Arrange
      const newToken = 'new-jwt-token-456';
      mockAuthService.refreshToken.mockResolvedValue(newToken);

      // Act
      const result = await authController.refreshToken(mockRequest);

      // Assert
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        mockRequest.user.userId,
      );
      expect(result).toEqual({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newToken,
        },
      });
    });

    it('should throw error if refresh fails', async () => {
      // Arrange
      const error = new Error('User not found');
      mockAuthService.refreshToken.mockRejectedValue(error);

      // Act & Assert
      await expect(authController.refreshToken(mockRequest)).rejects.toThrow(
        error,
      );
    });
  });

  describe('logout', () => {
    it('should return logout success message', async () => {
      // Act
      const result = await authController.logout();

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Logged out successfully. Please remove token from client.',
      });
    });
  });
});
