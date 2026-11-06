import { BadRequestException } from '@nestjs/common';
import { CreateRewardDto } from './dto/rewards.dto';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

describe('RewardsController image validation', () => {
  const dto: CreateRewardDto = {
    name: 'Reward',
    description: 'Reward description',
    pointPrice: 10,
    requiresApproval: true,
  };
  let service: { createReward: jest.Mock };
  let controller: RewardsController;

  beforeEach(() => {
    service = { createReward: jest.fn().mockResolvedValue({ id: 'reward-1' }) };
    controller = new RewardsController(service as unknown as RewardsService);
  });

  it('rejects a request containing both an uploaded image and an image URL', async () => {
    await expect(
      controller.createReward(
        { ...dto, imageUrl: 'https://example.com/reward.png' },
        {
          buffer: Buffer.from('image'),
          originalname: 'reward.png',
          mimetype: 'image/png',
          size: 5,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(service.createReward).not.toHaveBeenCalled();
  });

  it('rejects unsupported image types', async () => {
    await expect(
      controller.createReward(dto, {
        buffer: Buffer.from('image'),
        originalname: 'reward.gif',
        mimetype: 'image/gif',
        size: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(service.createReward).not.toHaveBeenCalled();
  });

  it('passes a valid uploaded image to the service', async () => {
    const image = {
      buffer: Buffer.from('image'),
      originalname: 'reward.webp',
      mimetype: 'image/webp',
      size: 5,
    };

    await controller.createReward(dto, image);

    expect(service.createReward).toHaveBeenCalledWith(dto, image);
  });
});
