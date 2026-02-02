import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommercialCustomersService } from './commercial-customers.service';
import { CommercialCustomersController } from './commercial-customers.controller';
import { CommercialCustomer } from '../../entities/commercial-customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommercialCustomer])],
  controllers: [CommercialCustomersController],
  providers: [CommercialCustomersService],
  exports: [CommercialCustomersService],
})
export class CommercialCustomersModule {}
