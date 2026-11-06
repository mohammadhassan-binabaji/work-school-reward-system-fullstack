import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditLogService } from '../points/audit-log.service';
import { CreateRewardDto, UpdateRewardMetadataDto } from './dto/rewards.dto';
import { RewardsService } from './rewards.service';

describe('RewardsService image management', () => {
  const uploadedUrl = '/uploads/reward-image.png';
  const image = {
    buffer: Buffer.from('image'),
    originalname: 'reward.png',
    mimetype: 'image/png',
  };
  const createDto: CreateRewardDto = {
    name: 'Reward',
    description: 'Reward description',
    pointPrice: 10,
    requiresApproval: true,
  };

  let prisma: {
    reward: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let storage: { uploadFile: jest.Mock };
  let service: RewardsService;

  beforeEach(() => {
    prisma = {
      reward: {
        create: jest.fn().mockResolvedValue({ id: 'reward-1' }),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'reward-1', imageUrl: uploadedUrl, requiresApproval: true }),
        update: jest.fn().mockResolvedValue({ id: 'reward-1' }),
      },
    };
    storage = { uploadFile: jest.fn().mockResolvedValue(uploadedUrl) };
    service = new RewardsService(
      prisma as unknown as PrismaService,
      {} as AuditLogService,
      {} as EventEmitter2,
      storage as unknown as StorageService,
    );
  });

  it('creates a reward with a URL without uploading a file', async () => {
    const dto = { ...createDto, imageUrl: 'https://example.com/reward.png' };

    await service.createReward(dto);

    expect(storage.uploadFile).not.toHaveBeenCalled();
    expect(prisma.reward.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: dto.imageUrl }),
      }),
    );
  });

  it('stores an uploaded image and saves its storage URL', async () => {
    await service.createReward(createDto, image);

    expect(storage.uploadFile).toHaveBeenCalledWith(
      image.buffer,
      image.originalname,
      image.mimetype,
    );
    expect(prisma.reward.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: uploadedUrl }),
      }),
    );
  });

  it('updates the reward image from an uploaded file', async () => {
    const dto: UpdateRewardMetadataDto = { name: 'Updated reward' };

    await service.updateRewardMetadata('reward-1', dto, image);

    expect(prisma.reward.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'reward-1' },
        data: expect.objectContaining({
          name: 'Updated reward',
          imageUrl: uploadedUrl,
        }),
      }),
    );
  });

  it('removes the image when the update URL is empty', async () => {
    await service.updateRewardMetadata('reward-1', { imageUrl: '' });

    expect(prisma.reward.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: null }),
      }),
    );
  });

  it('requires finite inventory when editing a reward without approval', async () => {
    prisma.reward.findUnique.mockResolvedValue({
      id: 'reward-1',
      imageUrl: uploadedUrl,
      requiresApproval: false,
    });

    await expect(
      service.updateRewardMetadata('reward-1', { inventoryQuantity: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.reward.update).not.toHaveBeenCalled();
  });
});
