import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfilesService } from './profiles.service';

/* 
Profiles Controller - handles HTTP requests for profile operations
*/
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /* 
  POST /profiles
  Create new profile for authenticated user
  */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req, @Body() createProfileDto: CreateProfileDto) {
    const profile = await this.profilesService.create(
      req.user.userId,
      createProfileDto,
    );

    return {
      success: true,
      message: 'Profile created successfully',
      data: { profile },
    };
  }

  /* 
  GET /profiles/me
  Get current user's profile
  */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyProfile(@Request() req) {
    const profile = await this.profilesService.findByUserId(req.user.userId);

    if (!profile) {
      throw new NotFoundException(
        'Profile not found. Please create one first.',
      );
    }

    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: { profile },
    };
  }

  /* 
  PATCH /profiles
  Update current user's profile
  */
  @Patch()
  @HttpCode(HttpStatus.OK)
  async update(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const profile = await this.profilesService.update(
      req.user.userId,
      updateProfileDto,
    );

    return {
      success: true,
      message: 'Profile updated successfully',
      data: { profile },
    };
  }

  /* 
  DELETE /profiles
  Delete current user's profile
  */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async delete(@Request() req) {
    await this.profilesService.delete(req.user.userId);

    return {
      success: true,
      message: 'Profile deleted successfully',
    };
  }

  /* 
  GET /profiles
  Get all profiles with pagination
  */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;

    const profiles = await this.profilesService.findAll(skip, limitNum);
    const total = await this.profilesService.count();

    return {
      success: true,
      message: 'Profiles retrieved successfully',
      data: {
        profiles,
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
  GET /profiles/search
  Search profiles by display name
  */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(@Query('q') searchTerm: string, @Query('limit') limit = 10) {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        success: true,
        message: 'Please provide a search term',
        data: { profiles: [] },
      };
    }

    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit))));
    const profiles = await this.profilesService.searchByDisplayName(
      searchTerm.trim(),
      limitNum,
    );

    return {
      success: true,
      message: 'Search completed successfully',
      data: {
        profiles,
        count: profiles.length,
      },
    };
  }

  /* 
  GET /profiles/interests/:interests
  Find profiles by interests
  */
  @Get('interests/:interests')
  @HttpCode(HttpStatus.OK)
  async findByInterest(
    @Param('interests') interests: string,
    @Query('limit') limit = 20,
  ) {
    const interestsArray = interests.split(',').map((i) => i.trim());
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));

    const profiles = await this.profilesService.findByInterests(
      interestsArray,
      limitNum,
    );

    return {
      success: true,
      message: 'Profiles retrieved successfully',
      data: {
        profiles,
        count: profiles.length,
      },
    };
  }

  /* 
  GET /profiles/zodiac/:zodiac
  Find profiles by zodiac sign
  */
  @Get('zodiac/:zodiac')
  @HttpCode(HttpStatus.OK)
  async findByZodiac(
    @Param('zodiac') zodiac: string,
    @Query('limit') limit = 20,
  ) {
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
    const profiles = await this.profilesService.findByZodiac(zodiac, limitNum);

    return {
      success: true,
      message: 'Profiles retrieved successfully',
      data: {
        profiles,
        count: profiles.length,
      },
    };
  }

  /* 
  GET /profiles/horoscope/:horoscope
  Find profiles by horoscope sign
  */
  @Get('horoscoper/:horoscope')
  @HttpCode(HttpStatus.OK)
  async findByHoroscope(
    @Param('horoscope') horoscope: string,
    @Query('limit') limit = 20,
  ) {
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
    const profiles = await this.profilesService.findByHoroscope(
      horoscope,
      limitNum,
    );

    return {
      success: true,
      message: 'Profiles retrieved successfully',
      data: {
        profiles,
        count: profiles.length,
      },
    };
  }

  /* 
  GET /profiles/handle/:handle
  Get profile by handle (@username)
  */
  @Get('handle/:handle')
  @HttpCode(HttpStatus.OK)
  async findByHandle(@Param('handle') handle: string) {
    const profile = await this.profilesService.findByHandle(handle);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: { profile },
    };
  }

  /* 
  POST /profiles/interests
  Add interest to current user's profile
  */
  @Post('interests')
  @HttpCode(HttpStatus.OK)
  async addInterest(@Request() req, @Body('interest') interest: string) {
    if (!interest || interest.trim().length === 0) {
      throw new BadRequestException('Interest is required');
    }

    const profile = await this.profilesService.addInterest(
      req.user.userId,
      interest.trim(),
    );

    return {
      success: true,
      message: 'Interest added successfully',
      data: { profile },
    };
  }

  /* 
  DELETE /profiles/interests/:interest
  Remove interest from current user's profile
  */
  @Delete('interests/:interest')
  @HttpCode(HttpStatus.OK)
  async removeInterest(@Request() req, @Param('interest') interest: string) {
    const profile = await this.profilesService.removeInterest(
      req.user.userId,
      interest,
    );

    return {
      success: true,
      message: 'Interest removed successfully',
      data: { profile },
    };
  }

  /* 
  GET /profiles/:id
  Get profile by id
  */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    const profile = await this.profilesService.findById(id);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: { profile },
    };
  }
}
