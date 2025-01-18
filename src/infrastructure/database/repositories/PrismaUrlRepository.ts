import { PrismaClient } from '@prisma/client';
import { IUrlRepository } from '@domain/repositories/IUrlRepository';
import { Url } from '@domain/entities/Url';
import { UrlMapper } from '@infrastructure/database/mappers/UrlMapper';

export class PrismaUrlRepository implements IUrlRepository {
  constructor(private prisma: PrismaClient) {}

  async create(url: Url): Promise<void> {
    const data = UrlMapper.toPrisma(url);
    await this.prisma.url.create({ data });
  }

  async findByShortCode(shortCode: string): Promise<Url | null> {
    const url = await this.prisma.url.findUnique({
      where: { shortCode }
    });

    if (!url) return null;

    return UrlMapper.toDomain(url);
  }

  async findAll(): Promise<Url[]> {
    const urls = await this.prisma.url.findMany();
    return urls.map(UrlMapper.toDomain);
  }

  async save(url: Url): Promise<void> {
    const data = UrlMapper.toPrisma(url);
    await this.prisma.url.update({
      where: { id: url.getId() },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.url.delete({
      where: { id }
    });
  }

  async exists(shortCode: string): Promise<boolean> {
    const count = await this.prisma.url.count({
      where: { shortCode }
    });
    return count > 0;
  }
}
