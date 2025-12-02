import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { Message } from '../../schemas/message.schema';
import { UsersService } from '../users/users.service';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let chatService: ChatService;
  let messageModel: any;
  let usersService: UsersService;
  let rabbitMQClient: any;

  // Mock user IDs
  const userId1 = new Types.ObjectId('507f1f77bcf86cd799439011');
  const userId2 = new Types.ObjectId('507f1f77bcf86cd799439012');

  // Mock message
  const mockMessage = {
    _id: new Types.ObjectId(),
    from: userId1,
    to: userId2,
    content: 'Hello, how are you?',
    messageType: 'text',
    delivered: false,
    read: false,
    isDeleted: false,
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
    populate: jest.fn().mockReturnThis(),
  };

  // Mock Mongoose Model
  const mockMessageModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: new Types.ObjectId(),
    save: jest.fn().mockResolvedValue(mockMessage),
    populate: jest.fn().mockResolvedValue(mockMessage),
  }));

  mockMessageModel.find = jest.fn();
  mockMessageModel.findOne = jest.fn();
  mockMessageModel.findById = jest.fn();
  mockMessageModel.findByIdAndUpdate = jest.fn();
  mockMessageModel.findOneAndUpdate = jest.fn();
  mockMessageModel.updateMany = jest.fn();
  mockMessageModel.countDocuments = jest.fn();
  mockMessageModel.aggregate = jest.fn();

  // Mock UsersService
  const mockUsersService = {
    findById: jest.fn(),
  };

  // Mock RabbitMQ Client
  const mockRabbitMQClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: 'RABBITMQ_CLIENT',
          useValue: mockRabbitMQClient,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    chatService = module.get<ChatService>(ChatService);
    messageModel = module.get(getModelToken(Message.name));
    usersService = module.get<UsersService>(UsersService);
    rabbitMQClient = module.get('RABBITMQ_CLIENT');

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(chatService).toBeDefined();
  });

  describe('sendMessage', () => {
    const sendMessageDto = {
      to: userId2.toString(),
      content: 'Hello, how are you?',
      messageType: 'text',
    };

    const mockUser = {
      _id: userId1,
      username: 'user1',
      email: 'user1@example.com',
    };

    it('should send message successfully', async () => {
      // Arrange
      mockUsersService.findById.mockResolvedValue(mockUser);
      const saveMock = jest.fn().mockResolvedValue(mockMessage);
      const populateMock = jest.fn().mockResolvedValue(mockMessage);

      mockMessageModel.mockImplementation(() => ({
        save: saveMock,
        populate: populateMock,
      }));

      // Act
      const result = await chatService.sendMessage(
        userId1.toString(),
        sendMessageDto,
      );

      // Assert
      expect(mockUsersService.findById).toHaveBeenCalledTimes(2); // sender and receiver
      expect(saveMock).toHaveBeenCalled();
      expect(mockRabbitMQClient.emit).toHaveBeenCalledWith(
        'message.sent',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if receiver not found', async () => {
      // Arrange
      mockUsersService.findById
        .mockResolvedValueOnce(mockUser) // sender exists
        .mockResolvedValueOnce(null); // receiver not found

      // Act & Assert
      await expect(
        chatService.sendMessage(userId1.toString(), sendMessageDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw correct error message when receiver not found', async () => {
      // Arrange
      mockUsersService.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        chatService.sendMessage(userId1.toString(), sendMessageDto),
      ).rejects.toThrow('Receiver not found');
    });

    it('should throw BadRequestException for self-messaging', async () => {
      // Arrange
      const selfMessageDto = {
        to: userId1.toString(),
        content: 'Talking to myself',
        messageType: 'text',
      };
      mockUsersService.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        chatService.sendMessage(userId1.toString(), selfMessageDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        chatService.sendMessage(userId1.toString(), selfMessageDto),
      ).rejects.toThrow('Cannot send message to yourself');
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation between two users', async () => {
      // Arrange
      const mockMessages = [mockMessage];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      };
      mockMessageModel.find.mockReturnValue(mockQuery);

      // Act
      const result = await chatService.getConversation(
        userId1.toString(),
        userId2.toString(),
        50,
        0,
      );

      // Assert
      expect(mockMessageModel.find).toHaveBeenCalledWith({
        $or: [
          { from: userId1, to: userId2 },
          { from: userId2, to: userId1 },
        ],
        isDeleted: false,
      });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid user IDs', async () => {
      // Act & Assert
      await expect(
        chatService.getConversation('invalid-id', userId2.toString()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread message count', async () => {
      // Arrange
      const mockCount = 5;
      mockMessageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCount),
      });

      // Act
      const result = await chatService.getUnreadCount(userId1.toString());

      // Assert
      expect(mockMessageModel.countDocuments).toHaveBeenCalledWith({
        to: userId1,
        read: false,
        isDeleted: false,
      });
      expect(result).toBe(mockCount);
    });

    it('should return 0 for invalid user ID', async () => {
      // Act
      const result = await chatService.getUnreadCount('invalid-id');

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      // Arrange
      const messageId = new Types.ObjectId().toString();
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessage),
      };
      mockMessageModel.findOneAndUpdate.mockReturnValue(mockQuery);

      // Act
      const result = await chatService.markAsRead(
        messageId,
        userId2.toString(),
      );

      // Assert
      expect(mockMessageModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(Types.ObjectId),
          to: expect.any(Types.ObjectId),
          isDeleted: false,
        },
        expect.objectContaining({
          $set: expect.objectContaining({
            read: true,
            delivered: true,
          }),
        }),
        { new: true },
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if message not found', async () => {
      // Arrange
      const messageId = new Types.ObjectId().toString();
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockMessageModel.findOneAndUpdate.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(
        chatService.markAsRead(messageId, userId2.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markConversationAsRead', () => {
    it('should mark all messages in conversation as read', async () => {
      // Arrange
      const mockResult = { modifiedCount: 3 };
      mockMessageModel.updateMany.mockResolvedValue(mockResult);

      // Act
      const result = await chatService.markConversationAsRead(
        userId2.toString(),
        userId1.toString(),
      );

      // Assert
      expect(mockMessageModel.updateMany).toHaveBeenCalledWith(
        {
          from: userId1,
          to: userId2,
          read: false,
          isDeleted: false,
        },
        expect.objectContaining({
          $set: expect.objectContaining({
            read: true,
            delivered: true,
          }),
        }),
      );
      expect(result).toBe(3);
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete message', async () => {
      // Arrange
      const messageId = new Types.ObjectId().toString();
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMessage),
      };
      mockMessageModel.findOneAndUpdate.mockReturnValue(mockQuery);

      // Act
      await chatService.deleteMessage(messageId, userId1.toString());

      // Assert
      expect(mockMessageModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(Types.ObjectId),
          $or: [
            { from: expect.any(Types.ObjectId) },
            { to: expect.any(Types.ObjectId) },
          ],
        },
        expect.objectContaining({
          $set: expect.objectContaining({
            isDeleted: true,
          }),
        }),
      );
    });

    it('should throw NotFoundException if message not found', async () => {
      // Arrange
      const messageId = new Types.ObjectId().toString();
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockMessageModel.findOneAndUpdate.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(
        chatService.deleteMessage(messageId, userId1.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getChatList', () => {
    it('should return list of recent conversations', async () => {
      // Arrange
      const mockConversations = [
        {
          userId: userId2,
          username: 'user2',
          email: 'user2@example.com',
          lastMessage: {
            content: 'Hello',
            createdAt: new Date(),
            read: false,
          },
          unreadCount: 2,
        },
      ];
      mockMessageModel.aggregate.mockResolvedValue(mockConversations);

      // Act
      const result = await chatService.getChatList(userId1.toString());

      // Assert
      expect(mockMessageModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockConversations);
    });

    it('should throw BadRequestException for invalid user ID', async () => {
      // Act & Assert
      await expect(chatService.getChatList('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markAsDelivered', () => {
    it('should mark message as delivered', async () => {
      // Arrange
      const messageId = new Types.ObjectId().toString();
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMessage),
      };
      mockMessageModel.findByIdAndUpdate.mockReturnValue(mockQuery);

      // Act
      await chatService.markAsDelivered(messageId);

      // Assert
      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        messageId,
        expect.objectContaining({
          $set: expect.objectContaining({
            delivered: true,
          }),
        }),
      );
    });

    it('should handle invalid message ID gracefully', async () => {
      // Act
      await chatService.markAsDelivered('invalid-id');

      // Assert
      expect(mockMessageModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});
