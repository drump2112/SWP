import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TanksController } from './tanks.controller';
import { TanksService } from './tanks.service';
import { Tank } from '../entities/tank.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tank])],
  controllers: [TanksController],
  providers: [TanksService],
  exports: [TanksService],
})
export class TanksModule {}
