import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { BaseSchema } from './base.schema';

export type MessageDocument = HydratedDocument<Message>;

@Schema({
  timestamps: true,
  collection: 'messages',
})
export class Message extends BaseSchema {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  from: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  to: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  })
  content: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  delivered: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  read: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  deliveredAt: Date;

  @Prop({
    type: Date,
    default: null,
  })
  readAt: Date;

  @Prop({
    type: String,
    enum: ['text', 'image', 'video', 'file'],
    default: 'text',
  })
  messageType: string;

  @Prop({
    type: String,
    default: null,
  })
  attachmentUrl: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

/* 
Indexes
*/
MessageSchema.index(
  { to: 1, createdAt: -1 },
  {
    name: 'inbox_messages',
    background: true,
  },
);

MessageSchema.index(
  { from: 1, to: 1, createdAt: -1 },
  {
    name: 'conversation_messages',
    background: true,
  },
);

MessageSchema.index(
  { to: 1, read: 1, createdAt: -1 },
  {
    name: 'unread_messages',
    background: true,
  },
);

MessageSchema.index(
  { to: 1, delivered: 1, createdAt: -1 },
  {
    name: 'undelivered_messages',
    background: true,
  },
);

MessageSchema.index(
  { deletedAt: 1 },
  {
    name: 'ttl_deleted_messages',
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: { isDeleted: true },
    background: true,
  },
);

/* 
Virtual populations 
*/
MessageSchema.virtual('sender', {
  ref: 'User',
  localField: 'from',
  foreignField: '_id',
  justOne: true,
});

MessageSchema.virtual('receiver', {
  ref: 'User',
  localField: 'to',
  foreignField: '_id',
  justOne: true,
});

/* 
Middleware
*/

// Validate message content
MessageSchema.pre('save', function (next) {
  if (this.from.equals(this.to)) {
    throw new Error('Cannot send message to yourself');
  }

  if (this.content) {
    this.content = this.content.trim();
  }

  if (!this.content || this.content.length === 0) {
    throw new Error('Message content cannot be empty');
  }

  next();
});

MessageSchema.post('save', function (doc) {
  console.log(`📨 Message saved: ${doc._id} from ${doc.from} to ${doc.to}`);
});

/* 
Instance Methods
*/

// mark message as delivered
MessageSchema.methods.markAsDelivered = function () {
  this.delivered = true;
  this.deliveredAt = new Date();
  return this.save();
};

// mark message as read
MessageSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();

  if (!this.delivered) {
    this.delivered = true;
    this.deliveredAt = new Date();
  }

  return this.save();
};

// soft deleted message
MessageSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

/* 
Static Methods
*/

// get conversation between two users
MessageSchema.statics.getConversation = function (
  userId1: Types.ObjectId,
  userId2: Types.ObjectId,
  limit = 50,
  skip = 0,
) {
  return this.find({
    $or: [
      { from: userId1, to: userId2 },
      { from: userId2, to: userId1 },
    ],
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('from', 'username email')
    .populate('to', 'username email')
    .exec();
};

// get unread count for a user
MessageSchema.statics.getUnreadCount = function (userId: Types.ObjectId) {
  return this.countDocuments({
    to: userId,
    read: fail,
    isDeleted: false,
  }).exec();
};

/* 
JSON Transformation
*/
MessageSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    const { __v, ...sanitized } = ret;
    return sanitized;
  },
});

MessageSchema.set('toObject', {
  virtuals: true,
  transform: function (doc, ret) {
    const { __v, ...sanitized } = ret;
    return sanitized;
  },
});
