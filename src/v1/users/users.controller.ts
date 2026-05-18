import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from './schemas/user.schema';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UsersPreferencesService } from './users-preferences.service';

@Controller('users')
export class UsersController {
  constructor(private readonly preferences: UsersPreferencesService) {}

  @Get('me/preferences')
  @UseGuards(AuthGuard('jwt'))
  getPreferences(@CurrentUser() user: UserDocument) {
    return this.preferences.getPreferences(user);
  }

  @Patch('me/preferences')
  @UseGuards(AuthGuard('jwt'))
  updatePreferences(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferences.updatePreferences(user, dto);
  }
}
