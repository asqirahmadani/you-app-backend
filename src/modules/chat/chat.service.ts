import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Message, MessageDocument } from '../../schemas/message.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { UsersService } from '../users/users.service';

/* 
Chat Service - handle messsage operations and RabbitMQ publishing
*/
@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @Inject('RABBITMQ_CLIENT') private rabbitMQClient: ClientProxy,
    private usersService: UsersService,
  ) {}

  /* 
  Send message
  */
  async sendMessage(
    fromUserId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<MessageDocument> {
    const { to, content, messageType, attachmentUrl } = sendMessageDto;

    // validate sender exists
    const sender = await this.usersService.findById(fromUserId);
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // validate receiver exists
    const receiver = await this.usersService.findById(to);
    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    // prevent self-messaging
    if (fromUserId === to) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    // create message
    const message = new this.messageModel({
      from: new Types.ObjectId(fromUserId),
      to: new Types.ObjectId(to),
      content: content.trim(),
      messageType: messageType || 'text',
      attachmentUrl: attachmentUrl || null,
      delivered: false,
      read: false,
    });

    const savedMessage = await message.save();

    // publish to RabbitMQ
    try {
      await this.publishMessageToQueue(savedMessage);
      console.log(`Message published to RabbitMQ: ${savedMessage._id}`);
    } catch (error) {
      console.error('Failed to publish message to RabbitMQ:', error);
    }

    // populate sender and receiver data
    await savedMessage.populate([
      { path: 'from', select: 'username email' },
      { path: 'to', select: 'username email' },
    ]);

    return savedMessage;
  }

  /* 
  Publish message to RabbitMQ
  */
  private async publishMessageToQueue(message: MessageDocument): Promise<void> {
    const payload = {
      messageId: message._id.toString(),
      from: message.from.toString(),
      to: message.to.toString(),
      content: message.content,
      messageType: message.messageType,
      timestamp: message.createdAt,
    };

    // emit event to RabbitMQ
    this.rabbitMQClient.emit('message.sent', payload);
  }

  /* 
  Get conversation between two users (pagination)
  */
  async getConversation(
    userId1: string,
    userId2: string,
    limit = 50,
    skip = 0,
  ): Promise<MessageDocument[]> {
    if (!Types.ObjectId.isValid(userId1) || !Types.ObjectId.isValid(userId2)) {
      throw new BadRequestException('Invalid user IDs');
    }

    const messages = await this.messageModel
      .find({
        $or: [
          {
            from: new Types.ObjectId(userId1),
            to: new Types.ObjectId(userId2),
          },
          {
            from: new Types.ObjectId(userId2),
            to: new Types.ObjectId(userId1),
          },
        ],
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('from', 'username email')
      .populate('to', 'username email')
      .exec();

    return messages.reverse(); // reverse to show oldest first
  }

  /* 
  Get messages send to user (inbox)
  */
  async getInboxMessages(
    userId: string,
    limit = 50,
    skip = 0,
  ): Promise<MessageDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.messageModel
      .find({
        to: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('from', 'username email')
      .exec();
  }

  /* 
  Get unread messages for user
  */
  async getUnreadMessages(userId: string): Promise<MessageDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.messageModel
      .find({
        to: new Types.ObjectId(userId),
        read: false,
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .populate('from', 'username email')
      .exec();
  }

  /* 
  Get unread count for user
  */
  async getUnreadCount(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) {
      return 0;
    }

    return this.messageModel
      .countDocuments({
        to: new Types.ObjectId(userId),
        read: false,
        isDeleted: false,
      })
      .exec();
  }

  /* 
  Mark message as read
  */
  async markAsRead(
    messageId: string,
    userId: string,
  ): Promise<MessageDocument> {
    if (!Types.ObjectId.isValid(messageId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid IDs');
    }

    const message = await this.messageModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(messageId),
          to: new Types.ObjectId(userId),
          isDeleted: false,
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
            delivered: true,
            deliveredAt: new Date(),
          },
        },
        { new: true },
      )
      .populate('from', 'username email')
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found or unauthorized');
    }

    return message;
  }

  /* 
  Mark all messages as read in conversation
  */
  async markConversationAsRead(
    userId: string,
    fromUserId: string,
  ): Promise<number> {
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(fromUserId)
    ) {
      throw new BadRequestException('Invalid user IDs');
    }

    const result = await this.messageModel.updateMany(
      {
        from: new Types.ObjectId(fromUserId),
        to: new Types.ObjectId(userId),
        read: false,
        isDeleted: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
          delivered: true,
          deliveredAt: new Date(),
        },
      },
    );

    return result.modifiedCount;
  }

  /* 
  Delete message (soft delete)
  */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(messageId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid IDs');
    }

    const message = await this.messageModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(messageId),
          $or: [
            { from: new Types.ObjectId(userId) },
            { to: new Types.ObjectId(userId) },
          ],
        },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        },
      )
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found or unauthorized');
    }
  }

  /* 
  Get chat list (recent conversation)
  */
  async getChatList(userId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const userObjectId = new Types.ObjectId(userId);

    // aggregation to get last message per conversation
    const conversations = await this.messageModel.aggregate([
      {
        $match: {
          $or: [{ from: userObjectId }, { to: userObjectId }],
          isDeleted: false,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$from', userObjectId] }, '$to', '$from'],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$to', userObjectId] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          email: '$user.email',
          lastMessage: {
            content: '$lastMessage.content',
            createdAt: '$lastMessage.createdAt',
            read: '$lastMessage.read',
          },
          unreadCount: 1,
        },
      },
    ]);

    return conversations;
  }

  /* 
  Mark message as delivered (used by RabbitMQ consumer)
  */
  async markAsDelivered(messageId: string): Promise<void> {
    if (!Types.ObjectId.isValid(messageId)) {
      return;
    }

    await this.messageModel
      .findByIdAndUpdate(messageId, {
        $set: {
          delivered: true,
          deliveredAt: new Date(),
        },
      })
      .exec();
  }
}
