import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserController } from './controllers/users.controller';
import { UserService } from './providers/users.service';
import { AvatarController } from './avatar/avatar.controller';
import { AvatarService } from './avatar/avatar.service';
import { HashingService } from '../auth/providers/hashing.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController, AvatarController],
  providers: [UserService, AvatarService, HashingService],
  exports: [UserService, HashingService],
})
export class UserModule {}
