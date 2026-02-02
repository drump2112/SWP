import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportBatchesService } from './import-batches.service';
import { ImportBatchesController } from './import-batches.controller';
import { ImportBatch } from '../../entities/import-batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ImportBatch])],
  controllers: [ImportBatchesController],
  providers: [ImportBatchesService],
  exports: [ImportBatchesService],
})
export class ImportBatchesModule {}
