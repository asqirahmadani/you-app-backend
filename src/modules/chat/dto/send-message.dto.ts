import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsMongoId,
} from 'class-validator';

export class SendMessageDto {
  @IsMongoId({ message: 'To must be a valid user ID' })
  @IsNotEmpty({ message: 'Receiver ID is required' })
  to: string;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Message content is required' })
  @MaxLength(5000, {
    message: 'Message content must not exceeded 5000 characters',
  })
  content: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'video', 'file'], {
    message: 'Message type must be text, image, video, or file',
  })
  messageType?: string;

  @IsOptional()
  @IsString({ message: 'Attachment URL must be a string' })
  attachmentUrl?: string;
}
