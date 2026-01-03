import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PumpsService } from './pumps.service';
import { CreatePumpDto, UpdatePumpDto } from './pumps.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('pumps')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PumpsController {
  constructor(private readonly pumpsService: PumpsService) {}

  @Get()
  @Roles('ADMIN', 'DIRECTOR')
  findAll() {
    return this.pumpsService.findAll();
  }

  @Get('store/:storeId')
  @Roles('ADMIN', 'DIRECTOR', 'STORE')
  findByStore(@Param('storeId') storeId: string) {
    return this.pumpsService.findByStore(+storeId);
  }

  @Get('tank/:tankId')
  @Roles('ADMIN', 'DIRECTOR', 'STORE')
  findByTank(@Param('tankId') tankId: string) {
    return this.pumpsService.findByTank(+tankId);
  }

  @Get(':id')
  @Roles('ADMIN', 'DIRECTOR', 'STORE')
  findOne(@Param('id') id: string) {
    return this.pumpsService.findOne(+id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() createPumpDto: CreatePumpDto) {
    return this.pumpsService.create(createPumpDto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updatePumpDto: UpdatePumpDto) {
    return this.pumpsService.update(+id, updatePumpDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.pumpsService.remove(+id);
  }
}
