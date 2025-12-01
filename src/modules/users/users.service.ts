import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User, UserDocument } from '../../schemas/user.schema';

/* 
Users Service - handle all user-related database operations
*/
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // create new user
  async create(userData: Partial<User>): Promise<UserDocument> {
    try {
      const user = new this.userModel(userData);
      return await user.save();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new ConflictException(`${field} already exists`);
      }
      throw error;
    }
  }

  // find user by id
  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return this.userModel.findById(id).select('+password').exec(); // include password fot authentication
  }

  // find user by email
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();
  }

  // find user by username
  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ username: username.toLowerCase() })
      .select('+password')
      .exec();
  }

  // find user by email or username
  async findByEmailOrUsername(
    emailOrUsername: string,
  ): Promise<UserDocument | null> {
    const searchTerm = emailOrUsername.toLowerCase();

    return this.userModel
      .findOne({
        $or: [{ email: searchTerm }, { username: searchTerm }],
      })
      .select('+password')
      .exec();
  }

  // find all users (with pagination)
  async findAll(skip = 0, limit = 20): Promise<UserDocument[]> {
    return this.userModel
      .find({ isActive: true })
      .skip(skip)
      .limit(limit)
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();
  }

  // update user
  async update(
    id: string | Types.ObjectId,
    updateData: Partial<User>,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    // remove fields that shouldn't be updated directly
    delete updateData['password'];
    delete updateData['email'];
    delete updateData['role'];

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // update last login timestamp
  async updateLastLogin(id: string | Types.ObjectId): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      return;
    }

    await this.userModel
      .findByIdAndUpdate(id, { $set: { lastLoginAt: new Date() } })
      .exec();
  }

  // deactivate user (soft delete)
  async deactivate(id: string | Types.ObjectId): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const result = await this.userModel
      .findByIdAndUpdate(id, { $set: { isActive: false } })
      .exec();

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  // activate user
  async activate(id: string | Types.ObjectId): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const result = await this.userModel
      .findByIdAndUpdate(id, { $set: { isActive: true } })
      .exec();

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  // delete user (hard delete)
  async delete(id: string | Types.ObjectId): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const result = await this.userModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  // count total users
  async count(includeInactive = false): Promise<number> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.userModel.countDocuments(filter).exec();
  }

  // search users by username
  async searchByUsername(
    searchTerm: string,
    limit = 10,
  ): Promise<UserDocument[]> {
    return this.userModel
      .find({
        username: { $regex: searchTerm, $options: 'i' },
        isActive: true,
      })
      .limit(limit)
      .select('-password')
      .sort({ username: 1 })
      .exec();
  }

  // check if email exists
  async emailExists(email: string): Promise<boolean> {
    const count = await this.userModel
      .countDocuments({ email: email.toLowerCase() })
      .exec();

    return count > 0;
  }

  // check if username exists
  async usernameExists(username: string): Promise<boolean> {
    const count = await this.userModel
      .countDocuments({ username: username.toLowerCase() })
      .exec();

    return count > 0;
  }
}
