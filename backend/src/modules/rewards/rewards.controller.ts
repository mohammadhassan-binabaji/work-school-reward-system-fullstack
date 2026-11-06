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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { CreateRewardDto, UpdateRewardMetadataDto } from './dto/rewards.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestWithCorrelation } from '../../common/middleware/correlation.middleware';
import { Role } from '@prisma/client';

interface UploadedRewardImage {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@ApiTags('rewards')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'description', 'pointPrice', 'requiresApproval'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        imageUrl: { type: 'string' },
        image: { type: 'string', format: 'binary' },
        pointPrice: { type: 'integer', minimum: 1 },
        requiresApproval: { type: 'boolean' },
        inventoryQuantity: { type: 'integer', minimum: 0 },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Create new catalog reward (Admin & Vice Principal)' })
  async createReward(
    @Body() dto: CreateRewardDto,
    @UploadedFile() image?: UploadedRewardImage,
  ) {
    this.validateImageSource(dto.imageUrl, image);
    this.validateUploadedImage(image);
    return this.rewardsService.createReward(dto, image);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'VICE_PRINCIPAL')
  @Get()
  @ApiOperation({ summary: 'List all rewards in catalog' })
  async findAllRewards(@Query('includeInactive') includeInactive?: string) {
    const incl = includeInactive === 'true';
    return this.rewardsService.findAllRewards(incl);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'VICE_PRINCIPAL')
  @Get(':id')
  @ApiOperation({ summary: 'Get reward details by ID' })
  async findRewardById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardsService.findRewardById(id);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Patch(':id')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        imageUrl: { type: 'string', description: 'Send an empty string to remove the image.' },
        image: { type: 'string', format: 'binary' },
        inventoryQuantity: { type: 'integer', minimum: 0, nullable: true },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Update reward metadata (price is immutable) (Admin & Vice Principal)' })
  async updateReward(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRewardMetadataDto,
    @UploadedFile() image?: UploadedRewardImage,
  ) {
    this.validateImageSource(dto.imageUrl, image);
    this.validateUploadedImage(image);
    return this.rewardsService.updateRewardMetadata(id, dto, image);
  }

  private validateImageSource(imageUrl?: string | null, image?: UploadedRewardImage): void {
    if (image && imageUrl?.trim()) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'MULTIPLE_REWARD_IMAGE_SOURCES',
        message: 'Provide either an uploaded image or an image URL, not both.',
      });
    }
  }

  private validateUploadedImage(image?: UploadedRewardImage): void {
    if (!image) return;

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(image.mimetype)) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_IMAGE_TYPE',
        message: 'تصویر ارسالی باید با فرمت JPEG، PNG یا WebP باشد.',
      });
    }

    if (image.size > 5 * 1024 * 1024) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'IMAGE_TOO_LARGE',
        message: 'حجم تصویر نباید بیش از ۵ مگابایت باشد.',
      });
    }
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Delete(':id')
  @ApiOperation({ summary: 'Remove reward from catalog with automatic refunds (Admin & Vice Principal)' })
  async removeReward(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role },
    @Req() req: RequestWithCorrelation,
  ) {
    return this.rewardsService.removeReward(
      id,
      user.id,
      req.correlationId || '',
      user.role,
    );
  }
}
