import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreLossConfig } from '../entities/store-loss-config.entity';
import { LossConfigController } from './loss-config.controller';
import { LossConfigService } from './loss-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([StoreLossConfig])],
  controllers: [LossConfigController],
  providers: [LossConfigService],
  exports: [LossConfigService],
})
export class LossConfigModule {}
