import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { Injectable } from '@nestjs/common';

import { ChatService } from './chat.service';

/* 
Chat Microservice - handles async message delivery and notifications
*/
@Injectable()
export class ChatMicroservice {
  constructor(private readonly chatService: ChatService) {}

  /* 
  Handle message sent event
  */
  @EventPattern('message.sent')
  async handleMessageSent(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    console.log('RabbitMQ: Received message.sent event');
    console.log('Message ID:', data.messageId);
    console.log('From:', data.from);
    console.log('To:', data.to);
    console.log('Content:', data.content);

    try {
      // simulate async processing delay
      await this.simulateDelay(500);

      // mark message as delivered in db
      await this.chatService.markAsDelivered(data.messageId);
      console.log('Message marked as delivered:', data.messageId);

      // simulate push notification
      await this.sendPushNotification(data);

      // simulate real-time notification via WebSocket
      await this.notifyReceiverViaWebSocker(data);

      // log analytics
      await this.logMessageAnalytics(data);

      // acknowledge message manually
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);

      console.log('Message processing completed:', data.messageId);
    } catch (error) {
      console.error('Error processing messages:', error);

      // In production:
      // 1. Retry with exponential backoff
      // 2. Send to dead letter queue
      // 3. Alert monitoring system

      // acknowledge to prevent infinite retry
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    }
  }

  /* 
  Simulate push notification
  */
  private async sendPushNotification(data: any): Promise<void> {
    console.log('Sending push notification to user:', data.to);
    console.log('Notification title: New Message');
    console.log('Notification body:', data.content.substring(0, 50));

    // simulate FCM/APNS call
    await this.simulateDelay(200);

    // In production:
    // await fcm.send({
    //   token: userDeviceToken,
    //   notification: {
    //     title: 'New Message',
    //     body: data.content
    //   },
    //   data: {
    //     messageId: data.messageId,
    //     from: data.from
    //   }
    // });

    console.log('Push notification sent');
  }

  /* 
  Notify receiver via websocket
  */
  private async notifyReceiverViaWebSocker(data: any): Promise<void> {
    console.log('Emitting WebSocket event to user:', data.to);
    console.log('Event: new_message');

    // Simulate WebSocket emit
    await this.simulateDelay(100);

    // In production:
    // io.to(`user_${data.to}`).emit('new_message', {
    //   messageId: data.messageId,
    //   from: data.from,
    //   content: data.content,
    //   timestamp: data.timestamp
    // });

    console.log('WebSocket event emitted');
  }

  /* 
  Log message analytics
  */
  private async logMessageAnalytics(data: any): Promise<void> {
    console.log('Logging message analytics');

    // In production, log to:
    // - Analytics service (Google Analytics, Mixpanel)
    // - Time-series database (InfluxDB, TimescaleDB)
    // - Data warehouse (BigQuery, Snowflake)

    const analytics = {
      event: 'message_sent',
      messageId: data.messageId,
      from: data.from,
      to: data.to,
      messageType: data.messageType,
      timestamp: data.timestamp,
      processingTime: Date.now() - new Date(data.timestamp).getTime(),
    };

    console.log('Analytics:', JSON.stringify(analytics, null, 2));
    console.log('Analytics logged');
  }

  /* 
  Handle message read event
  */
  @EventPattern('message.read')
  async handleMessageRead(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    console.log('RabbitMQ: Received message.read event');
    console.log('Message ID:', data.messageId);
    console.log('Read by:', data.userId);

    try {
      // notify sender via WebSocket that message was read
      console.log('Notifying sender about read receipt');

      // In production:
      // io.to(`user_${data.senderId}`).emit('message_read', {
      //   messageId: data.messageId,
      //   readAt: new Date()
      // });

      // acknowledge
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);

      console.log('Read receipt processed');
    } catch (error) {
      console.error('Error processing read receipt:', error);

      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    }
  }

  /* 
  Handle typing indicator
  */
  async handleUserTyping(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    console.log('RabbitMQ: User typing event');
    console.log('User:', data.userId);
    console.log('Typing to:', data.recipientId);

    // notify recipient via WebSocket
    console.log('Broadcasting typing indicator');

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
  }

  /* 
 Simulate async delay
 */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
