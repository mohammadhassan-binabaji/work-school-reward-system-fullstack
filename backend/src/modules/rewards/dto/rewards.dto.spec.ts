import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRewardDto, UpdateRewardMetadataDto } from './rewards.dto';

describe('reward DTO multipart transforms', () => {
  it('converts multipart numeric and boolean fields before validation', async () => {
    const dto = plainToInstance(CreateRewardDto, {
      name: 'Reward',
      description: 'Reward description',
      pointPrice: '25',
      requiresApproval: 'false',
      inventoryQuantity: '3',
    });

    expect(dto.pointPrice).toBe(25);
    expect(dto.requiresApproval).toBe(false);
    expect(dto.inventoryQuantity).toBe(3);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('translates an empty inventory field to null when clearing it on update', async () => {
    const dto = plainToInstance(UpdateRewardMetadataDto, { inventoryQuantity: '' });

    expect(dto.inventoryQuantity).toBeNull();
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
