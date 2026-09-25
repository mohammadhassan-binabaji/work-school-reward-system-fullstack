import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { CreateRewardDto, UpdateRewardMetadataDto } from './dto/rewards.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestWithCorrelation } from '../../common/middleware/correlation.middleware';

@ApiTags('rewards')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new catalog reward (Admin only)' })
  async createReward(@Body() dto: CreateRewardDto) {
    return this.rewardsService.createReward(dto);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get()
  @ApiOperation({ summary: 'List all rewards in catalog' })
  async findAllRewards(@Query('includeInactive') includeInactive?: string) {
    const incl = includeInactive === 'true';
    return this.rewardsService.findAllRewards(incl);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get(':id')
  @ApiOperation({ summary: 'Get reward details by ID' })
  async findRewardById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardsService.findRewardById(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update reward metadata (price is immutable) (Admin only)' })
  async updateReward(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRewardMetadataDto) {
    return this.rewardsService.updateRewardMetadata(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Remove reward from catalog with automatic refunds (Admin only)' })
  async removeReward(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.rewardsService.removeReward(id, adminId, req.correlationId || '');
  }
}
