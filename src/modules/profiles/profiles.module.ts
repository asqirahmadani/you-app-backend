import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';

import { Profile, ProfileSchema } from 'src/schemas/profile.schema';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { UsersModule } from '../users/users.module';

/* 
Profiles Module - manages user profile functionality
*/
@Module({
  imports: [
    // register profile schema with mongoose
    MongooseModule.forFeature([
      {
        name: Profile.name,
        schema: ProfileSchema,
      },
    ]),

    // import UsersModule to access UsersService
    UsersModule,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
