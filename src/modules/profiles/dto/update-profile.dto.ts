import { CreateProfileDto } from './create-profile.dto';
import { PartialType } from '@nestjs/mapped-types';

/* 
Update Profile DTO
Extends CreateProfileDto but makes all fields optional
*/
export class UpdateProfileDto extends PartialType(CreateProfileDto) {}
