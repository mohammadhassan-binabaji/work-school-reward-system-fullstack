import {
  Controller,
  Get,
  Put,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { RankingsService } from './rankings.service';
import { UpdateTierConfigurationsDto } from './dto/rankings.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('tiers')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/tiers')
export class TiersController {
  constructor(private rankingsService: RankingsService) {}

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get()
  @ApiOperation({ summary: 'Get all 5 student tier configurations' })
  async getTierConfigurations() {
    return this.rankingsService.getTierConfigurations();
  }

  @Roles('ADMIN')
  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update all 5 student tier configurations (Admin only)' })
  async updateTierConfigurations(@Body() dto: UpdateTierConfigurationsDto) {
    return this.rankingsService.updateTierConfigurations(dto);
  }
}
