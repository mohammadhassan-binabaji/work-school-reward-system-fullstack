import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateGuidanceCardDto,
  UpdateGuidanceCardDto,
  CreateGuidanceCategoryDto,
  UpdateGuidanceCategoryDto,
} from './dto/guidance.dto';

@Injectable()
export class GuidanceService {
  constructor(private prisma: PrismaService) {}

  // ===================== Category Methods =====================

  async createCategory(dto: CreateGuidanceCategoryDto) {
    return this.prisma.guidanceCategory.create({
      data: {
        title: dto.title,
        iconKey: dto.iconKey,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAllCategories() {
    return this.prisma.guidanceCategory.findMany({
      include: {
        cards: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findCategoryById(id: string) {
    const category = await this.prisma.guidanceCategory.findUnique({
      where: { id },
      include: { cards: true },
    });
    if (!category) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'GUIDANCE_CATEGORY_NOT_FOUND',
        message: `Guidance category with ID ${id} not found`,
      });
    }
    return category;
  }

  async updateCategory(id: string, dto: UpdateGuidanceCategoryDto) {
    await this.findCategoryById(id);
    return this.prisma.guidanceCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    await this.findCategoryById(id);
    return this.prisma.guidanceCategory.delete({
      where: { id },
    });
  }

  // ===================== Card Methods =====================

  async createGuidanceCard(dto: CreateGuidanceCardDto) {
    await this.findCategoryById(dto.categoryId);

    return this.prisma.guidanceCard.create({
      data: {
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        logoKey: dto.logoKey,
        pointRangeLabel: dto.pointRangeLabel,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { category: true },
    });
  }

  async findAllGuidanceCards(categoryId?: string) {
    const where: any = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }

    return this.prisma.guidanceCard.findMany({
      where,
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findGuidanceCardById(id: string) {
    const card = await this.prisma.guidanceCard.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!card) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'GUIDANCE_CARD_NOT_FOUND',
        message: `Guidance card with ID ${id} not found`,
      });
    }
    return card;
  }

  async updateGuidanceCard(id: string, dto: UpdateGuidanceCardDto) {
    await this.findGuidanceCardById(id);
    if (dto.categoryId) {
      await this.findCategoryById(dto.categoryId);
    }

    return this.prisma.guidanceCard.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async deleteGuidanceCard(id: string) {
    await this.findGuidanceCardById(id);
    return this.prisma.guidanceCard.delete({
      where: { id },
    });
  }
}
