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
import { TanksService } from './tanks.service';
import { CreateTankDto, UpdateTankDto } from './tanks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tanks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TanksController {
  constructor(private readonly tanksService: TanksService) {}

  @Get()
  @Roles('ADMIN', 'DIRECTOR')
  findAll() {
    return this.tanksService.findAll();
  }

  @Get('store/:storeId')
  @Roles('ADMIN', 'DIRECTOR', 'STORE')
  findByStore(@Param('storeId') storeId: string) {
    return this.tanksService.findByStore(+storeId);
  }

  @Get(':id')
  @Roles('ADMIN', 'DIRECTOR', 'STORE')
  findOne(@Param('id') id: string) {
    return this.tanksService.findOne(+id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() createTankDto: CreateTankDto) {
    return this.tanksService.create(createTankDto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateTankDto: UpdateTankDto) {
    return this.tanksService.update(+id, updateTankDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.tanksService.remove(+id);
  }
}
