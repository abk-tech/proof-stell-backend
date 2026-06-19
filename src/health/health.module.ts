import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { MailModule } from '../mail/mail.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [TerminusModule, MailModule, BlockchainModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
