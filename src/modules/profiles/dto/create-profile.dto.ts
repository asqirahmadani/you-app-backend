import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
  Max,
  ArrayMaxSize,
  Matches,
} from 'class-validator';

export class CreateProfileDto {
  @IsString({ message: 'Display name must be a string' })
  @IsNotEmpty({ message: 'Display name is required' })
  @MaxLength(100, { message: 'Display name must not exceed 100 characters' })
  displayName: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'], {
    message: 'Gender must be male, female, or other',
  })
  gender?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Birthday must be a valid date string (YYYY-MM-DD)' },
  )
  birthday?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Height must be a number' })
  @Min(0, { message: 'Height must be at least 0 cm' })
  @Max(300, { message: 'Height must not exceeded 300 cm' })
  height?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Height must be a number' })
  @Min(0, { message: 'Weight must be at least 0 kg' })
  @Max(500, { message: 'Weight must not exceeded 500 kg' })
  weight?: number;

  @IsOptional()
  @IsString({ message: 'About must be a string' })
  about?: string;

  @IsOptional()
  @IsArray({ message: 'Interests must be an array' })
  @IsString({ each: true, message: 'Each interest must be a string' })
  @ArrayMaxSize(10, { message: 'Maximum 10 interests allowed' })
  interests?: string[];

  @IsOptional()
  @IsArray({ message: 'Images must be an array' })
  @IsString({ each: true, message: 'Each images must be a string URL' })
  @ArrayMaxSize(6, { message: 'Maximum 6 images allowed' })
  images?: string[];

  @IsOptional()
  @IsString({ message: 'Avatar must be a string URL' })
  avatar?: string;

  @IsOptional()
  @IsString({ message: 'Handle must be a string' })
  @Matches(/^@[a-zA-Z0-9_]{3,30}$/, {
    message:
      'Handle must start with @ and contain 3-30 alphanumeric characters or underscores',
  })
  handle?: string;
}
