import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatService } from './chat.service';

/* 
Chat Controller - handles HTTP requests for chat operations
*/
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /* 
  POST /chat/send
  Send a new message
  */
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(@Request() req, @Body() sendMessageDto: SendMessageDto) {
    const message = await this.chatService.sendMessage(
      req.user.userId,
      sendMessageDto,
    );

    return {
      success: true,
      message: 'Message sent successfully',
      data: { message },
    };
  }

  /* 
  GET /chat/:userId/messages
  Get conversation with specific user
  */
  @Get(':userId/messages')
  @HttpCode(HttpStatus.OK)
  async getConversation(
    @Request() req,
    @Param('userId') userId: string,
    @Query('limit') limit = 50,
    @Query('skip') skip = 0,
  ) {
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit))));
    const skipNum = Math.max(0, parseInt(String(skip)));

    const messages = await this.chatService.getConversation(
      req.user.userId,
      userId,
      limitNum,
      skipNum,
    );

    return {
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        messages,
        count: messages.length,
      },
    };
  }

  /* 
  GET /chat/inbox
  Get all messages sent to current user
  */
  @Get('inbox')
  @HttpCode(HttpStatus.OK)
  async getInbox(
    @Request() req,
    @Query('limit') limit = 50,
    @Query('skip') skip = 0,
  ) {
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit))));
    const skipNum = Math.max(0, parseInt(String(skip)));

    const messages = await this.chatService.getInboxMessages(
      req.user.userId,
      limitNum,
      skipNum,
    );

    return {
      success: true,
      message: 'Inbox messages retrieved successfully',
      data: {
        messages,
        count: messages.length,
      },
    };
  }

  /* 
  GET /chat/unread
  Get unread messages for current user
  */
  @Get('unread')
  @HttpCode(HttpStatus.OK)
  async getUnreadMessages(@Request() req) {
    const messages = await this.chatService.getUnreadMessages(req.user.userId);

    return {
      success: true,
      message: 'Unread messages retrieved successfully',
      data: {
        messages,
        count: messages.length,
      },
    };
  }

  /* 
  GET /chat/unread/count
  Get unread message count
  */
  @Get('unread/count')
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(@Request() req) {
    const count = await this.chatService.getUnreadCount(req.user.userId);

    return {
      success: true,
      message: 'Unread count retrieved successfully',
      data: { count },
    };
  }

  /* 
  PATCH /chat/:messageId/read
  Mark message as read
  */
  @Patch(':messageId/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Request() req, @Param('messageId') messageId: string) {
    const message = await this.chatService.markAsRead(
      messageId,
      req.user.userId,
    );

    return {
      success: true,
      message: 'Message marked as read',
      data: { message },
    };
  }

  /* 
  PATCH /chat/:userId/read-all
  Mark all messages from user as read
  */
  @Patch(':userId/read-all')
  @HttpCode(HttpStatus.OK)
  async markConversationAsRead(
    @Request() req,
    @Param('userId') userId: string,
  ) {
    const count = await this.chatService.markConversationAsRead(
      req.user.userId,
      userId,
    );

    return {
      success: true,
      message: `${count} messages marked as read`,
      data: { count },
    };
  }

  /* 
  DELETE /chat/:messageId
  Delete message (soft delete)
  */
  @Delete(':messageId')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    await this.chatService.deleteMessage(messageId, req.user.userId);

    return {
      success: true,
      message: 'Message deleted successfully',
    };
  }

  /* 
  GET /chat/conversations
  Get list of recent conversations
  */
  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  async getChatList(@Request() req) {
    const conversations = await this.chatService.getChatList(req.user.userId);

    return {
      success: true,
      message: 'Conversations retrieved successfully',
      data: {
        conversations,
        count: conversations.length,
      },
    };
  }
}
