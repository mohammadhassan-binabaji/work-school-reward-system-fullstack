import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGuidanceCardDto, UpdateGuidanceCardDto } from './dto/guidance.dto';
import { GuidanceCardStatus, Role } from '@prisma/client';

@Injectable()
export class GuidanceService {
  constructor(private prisma: PrismaService) {}

  async createGuidanceCard(dto: CreateGuidanceCardDto) {
    return this.prisma.guidanceCard.create({
      data: {
        title: dto.title,
        description: dto.description,
        logoKey: dto.logoKey,
        pointRangeLabel: dto.pointRangeLabel,
        status: dto.status || GuidanceCardStatus.ACTIVE,
      },
    });
  }

  async findAllGuidanceCards(currentUserRole?: Role) {
    const where = currentUserRole === Role.STUDENT ? { status: GuidanceCardStatus.ACTIVE } : {};
    return this.prisma.guidanceCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findGuidanceCardById(id: string) {
    const card = await this.prisma.guidanceCard.findUnique({ where: { id } });
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
    return this.prisma.guidanceCard.update({
      where: { id },
      data: dto,
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
