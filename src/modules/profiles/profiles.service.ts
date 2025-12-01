import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Profile, ProfileDocument } from 'src/schemas/profile.schema';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from '../users/users.service';

/* 
Profiles Service - handles all profile-related database operations
*/
@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private usersService: UsersService,
  ) {}

  /* 
  Create new profile
  */
  async create(
    userId: string | Types.ObjectId,
    createProfileDto: CreateProfileDto,
  ): Promise<ProfileDocument> {
    // validate user exists
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // check if profile already exists
    const existingProfile = await this.findByUserId(userId);
    if (existingProfile) {
      throw new ConflictException('Profile already exists for this user');
    }

    // check handle uniqueness if provided
    if (createProfileDto.handle) {
      const handleExists = await this.handleExists(createProfileDto.handle);
      if (handleExists) {
        throw new ConflictException('Handle already taken');
      }
    }

    try {
      // create profile
      const profile = new this.profileModel({
        userId: new Types.ObjectId(userId.toString()),
        ...createProfileDto,
        birthday: createProfileDto.birthday
          ? new Date(createProfileDto.birthday)
          : undefined,
      });

      return await profile.save();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new ConflictException(`${field} already exists`);
      }
      throw error;
    }
  }

  /* 
  Find profile by user id 
  */
  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    return this.profileModel
      .findOne({ userId: new Types.ObjectId(userId.toString()) })
      .populate('userId', 'username email isActive')
      .exec();
  }

  /* 
  Find profile by handle 
  */
  async findByHandle(handle: string): Promise<ProfileDocument | null> {
    // ensure handle start with @
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;

    return this.profileModel
      .findOne({ handle: formattedHandle })
      .populate('userId', 'username email isActive')
      .exec();
  }

  /* 
  Find profile by id
  */
  async findById(id: string | Types.ObjectId): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return this.profileModel
      .findById(id)
      .populate('userId', 'username email isActive')
      .exec();
  }

  /* 
  Update profile
  */
  async update(
    userId: string | Types.ObjectId,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    // find existing profile
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // check handle uniqueness if being updated
    if (updateProfileDto.handle && updateProfileDto.handle !== profile.handle) {
      const handleExists = await this.handleExists(updateProfileDto.handle);
      if (handleExists) {
        throw new ConflictException('Handle already taken');
      }
    }

    // prepare update data
    const updateData: any = { ...updateProfileDto };

    // convert birthday string to Date if provided
    if (updateProfileDto.birthday) {
      updateData.birthday = new Date(updateProfileDto.birthday);
    }

    try {
      // update profile
      const updatedProfile = await this.profileModel
        .findOneAndUpdate(
          { userId: new Types.ObjectId(userId.toString()) },
          { $set: updateData },
          { new: true, runValidators: true },
        )
        .populate('userId', 'username email isActive')
        .exec();

      if (!updatedProfile) {
        throw new NotFoundException('Profile not found');
      }

      return updatedProfile;
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new ConflictException(`${field} already exists`);
      }
      throw error;
    }
  }

  /* 
  Delete profile
  */
  async delete(userId: string | Types.ObjectId): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.profileModel
      .findOneAndDelete({ userId: new Types.ObjectId(userId.toString()) })
      .exec();

    if (!result) {
      throw new NotFoundException('Profile not found');
    }
  }

  /* 
  Search profiles by display name
  */
  async searchByDisplayName(
    searchTerm: string,
    limit = 10,
  ): Promise<ProfileDocument[]> {
    return this.profileModel
      .find({
        $text: { $search: searchTerm },
      })
      .limit(limit)
      .populate('userId', 'username email isActive')
      .sort({ score: { $meta: 'textScore' } })
      .exec();
  }

  /* 
  Get profiles by interests
  */
  async findByInterests(
    interests: string[],
    limit = 20,
  ): Promise<ProfileDocument[]> {
    return this.profileModel
      .find({
        interests: { $in: interests },
      })
      .limit(limit)
      .populate('userId', 'username email isActive')
      .sort({ createdAt: -1 })
      .exec();
  }

  /* 
  Get profiles by zodiac
  */
  async findByZodiac(zodiac: string, limit = 20): Promise<ProfileDocument[]> {
    return this.profileModel
      .find({ zodiac })
      .limit(limit)
      .populate('userId', 'username email isActive')
      .sort({ createdAt: -1 })
      .exec();
  }

  /* 
  Get profiles by horoscope
  */
  async findByHoroscope(
    horoscope: string,
    limit = 20,
  ): Promise<ProfileDocument[]> {
    return this.profileModel
      .find({ horoscope })
      .limit(limit)
      .populate('userId', 'username email isActive')
      .sort({ createdAt: -1 })
      .exec();
  }

  /* 
  Check if handle exists 
  */
  async handleExists(handle: string): Promise<boolean> {
    // ensure handle start with @
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;

    const count = await this.profileModel
      .countDocuments({ handle: formattedHandle })
      .exec();

    return count > 0;
  }

  /* 
  Count total profiles
  */
  async count(): Promise<number> {
    return this.profileModel.countDocuments().exec();
  }

  /* 
  Get all profiles (with pagination)
  */
  async findAll(skip = 0, limit = 20): Promise<ProfileDocument[]> {
    return this.profileModel
      .find()
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username email isActive')
      .sort({ createdAt: -1 })
      .exec();
  }

  /* 
  Add interest to profile
  */
  async addInterest(
    userId: string | Types.ObjectId,
    interest: string,
  ): Promise<ProfileDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const profile = await this.profileModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId.toString()),
          interests: { $ne: interest }, // only add if not already exists
          $expr: { $lt: [{ $size: '$interests' }, 10] }, // max 10 interests
        },
        { $addToSet: { interests: interest } },
        { new: true },
      )
      .populate('userId', 'username email isActive')
      .exec();

    if (!profile) {
      throw new NotFoundException(
        'Profile not found or intersts already exists or limited reached',
      );
    }

    return profile;
  }

  /* 
  Remove interest from profile
  */
  async removeInterest(
    userId: string | Types.ObjectId,
    interest: string,
  ): Promise<ProfileDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const profile = await this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId.toString()) },
        { $pull: { interests: interest } },
        { new: true },
      )
      .populate('userId', 'username email isActive')
      .exec();

    if (!profile) {
      throw new NotFoundException(
        'Profile not found or intersts already exists or limited reached',
      );
    }

    return profile;
  }
}
