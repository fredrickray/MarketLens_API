import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

@Controller('alerts')
@UseGuards(AuthGuard('jwt'))
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateAlertDto) {
    return this.alerts.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: UserDocument) {
    return this.alerts.list(user);
  }

  @Get(':id')
  getOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.alerts.getOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.alerts.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.alerts.remove(user, id);
  }
}
