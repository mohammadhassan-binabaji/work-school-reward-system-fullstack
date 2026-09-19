import { prisma } from '../../core/prisma.js';
import { NotFoundError } from '../../core/errors.js';
import { CreateGuidanceCardInput, UpdateGuidanceCardInput } from './guidance.schemas.js';

export class GuidanceService {
  async listCards() {
    return prisma.pointEarningGuidanceCard.findMany({
      where: { status: 'Active' },
      orderBy: { createdAt: 'asc' }
    });
  }

  async createCard(input: CreateGuidanceCardInput) {
    return prisma.pointEarningGuidanceCard.create({
      data: {
        title: input.title,
        description: input.description,
        logoId: input.logoId,
        suggestedPointsText: input.suggestedPointsText,
        status: 'Active'
      }
    });
  }

  async updateCard(id: string, input: UpdateGuidanceCardInput) {
    const existing = await prisma.pointEarningGuidanceCard.findUnique({
      where: { id }
    });

    if (!existing || existing.status === 'Removed') {
      throw new NotFoundError('Guidance card not found');
    }

    return prisma.pointEarningGuidanceCard.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.logoId !== undefined ? { logoId: input.logoId } : {}),
        ...(input.suggestedPointsText !== undefined ? { suggestedPointsText: input.suggestedPointsText } : {})
      }
    });
  }

  async removeCard(id: string) {
    const existing = await prisma.pointEarningGuidanceCard.findUnique({
      where: { id }
    });

    if (!existing || existing.status === 'Removed') {
      throw new NotFoundError('Guidance card not found');
    }

    await prisma.pointEarningGuidanceCard.update({
      where: { id },
      data: { status: 'Removed' }
    });
  }
}
