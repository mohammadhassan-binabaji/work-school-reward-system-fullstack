import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateGuidanceCardDto,
  UpdateGuidanceCardDto,
  CreateGuidanceCategoryDto,
  UpdateGuidanceCategoryDto,
} from './dto/guidance.dto';
import { GuidanceCardStatus, Role } from '@prisma/client';

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
        status: dto.status || GuidanceCardStatus.ACTIVE,
      },
    });
  }

  async findAllCategories(currentUserRole?: Role) {
    const isStudent = currentUserRole === Role.STUDENT;
    const where = isStudent ? { status: GuidanceCardStatus.ACTIVE } : {};

    return this.prisma.guidanceCategory.findMany({
      where,
      include: {
        cards: {
          where: isStudent ? { status: GuidanceCardStatus.ACTIVE } : {},
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
    // Soft-delete category and its cards
    await this.prisma.guidanceCard.updateMany({
      where: { categoryId: id },
      data: { status: GuidanceCardStatus.REMOVED },
    });
    return this.prisma.guidanceCategory.update({
      where: { id },
      data: { status: GuidanceCardStatus.REMOVED },
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
        status: dto.status || GuidanceCardStatus.ACTIVE,
      },
      include: { category: true },
    });
  }

  async findAllGuidanceCards(currentUserRole?: Role, categoryId?: string) {
    const where: any = {};
    if (currentUserRole === Role.STUDENT) {
      where.status = GuidanceCardStatus.ACTIVE;
    }
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
    return this.prisma.guidanceCard.update({
      where: { id },
      data: { status: GuidanceCardStatus.REMOVED },
    });
  }
}
