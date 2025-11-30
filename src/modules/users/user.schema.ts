import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // email validation regex
  })
  email: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/, // alphanumeric and underscore only
  })
  username: string;

  @Prop({
    required: true,
    minlength: 6,
    select: false,
  })
  password: string;

  @Prop({
    default: true,
  })
  isActive: boolean;

  @Prop({
    default: null,
  })
  lastLoginAt: Date;

  @Prop({
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  })
  role: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for better query performance
UserSchema.index({ email: 1 }); // single field index
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1, username: 1 }); // compound index

// Virtual field for profile relationship
UserSchema.virtual('profile', {
  ref: 'Profile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    const { password, __v, ...sanitized } = ret;
    return sanitized;
  },
});
