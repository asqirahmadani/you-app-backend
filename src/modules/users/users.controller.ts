import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  NotFoundException,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

/* 
Users Controller - Handles HTTP requests for user operations
*/
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /* 
  GET /users
  Get list of users with pagination
  */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    // parse and validate pagination params
    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;

    // fetch users
    const users = await this.usersService.findAll(skip, limitNum);
    const total = await this.usersService.count();

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    };
  }

  /* 
  GET /users/search
  Search users by username
  */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(@Query('q') searchTerm: string, @Query('limit') limit = 10) {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        success: true,
        message: 'Please provide a search term',
        data: {
          users: [],
        },
      };
    }

    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit))));
    const users = await this.usersService.searchByUsername(
      searchTerm.trim(),
      limitNum,
    );

    return {
      success: true,
      message: 'Search completed successfully',
      data: {
        users,
        count: users.length,
      },
    };
  }

  /* 
  GET /users/me
  Get current authenticated user
  */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    };
  }

  /* 
  GET /users/:id
  Get user by id
  */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    };
  }
}
