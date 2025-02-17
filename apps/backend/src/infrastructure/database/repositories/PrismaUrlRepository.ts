import { PrismaClient } from '@prisma/client';
import { IUrlRepository } from '@domain/repositories/IUrlRepository';
import { Url } from '@domain/entities/Url';
import { UrlMapper } from '@infrastructure/database/mappers/UrlMapper';
import { AppError } from '@/shared/errors/AppError';

export class PrismaUrlRepository implements IUrlRepository {
  constructor(private prisma: PrismaClient) {}

  async create(url: Url): Promise<void> {
    try {
      const data = UrlMapper.toPrisma(url);
      await this.prisma.url.create({ data });
    } catch (error) {
      throw new AppError('Erro ao criar URL', 500);
    }
  }

  async findByShortCode(shortCode: string): Promise<Url | null> {
    try {
      const url = await this.prisma.url.findUnique({
        where: { shortCode }
      });
  
      if (!url) return null;
  
      const domainResult = UrlMapper.toDomain(url);
      if (domainResult.isFailure) {
        throw new AppError(domainResult.error, 400);
      }

      return domainResult.getValue();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Erro ao buscar URL', 500);
    }
  }

  async findAll(): Promise<Url[]> {
    try {
      const urls = await this.prisma.url.findMany();
      const domainUrls: Url[] = [];

      for (const url of urls) {
        const domainResult = UrlMapper.toDomain(url);
        if (domainResult.isSuccess) {
          domainUrls.push(domainResult.getValue());
        }
      }

      return domainUrls;
    } catch (error) {
      throw new AppError('Erro ao buscar URLs', 500);
    }
  }

  async save(url: Url): Promise<void> {
    try {
      const data = UrlMapper.toPrisma(url);

      await this.prisma.url.update({
        where: { id: url.getId() },
        data
      });

      // Verificar se a atualização foi bem sucedida
      const updated = await this.prisma.url.findUnique({
        where: { id: url.getId() }
      });

      if (!updated) {
        throw new AppError('URL não encontrada após atualização', 404);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao salvar:', error);
      throw new AppError('Erro ao salvar URL', 500);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.url.delete({
        where: { id }
      });
    } catch (error) {
      throw new AppError('Erro ao deletar URL', 500);
    }
  }

  async exists(shortCode: string): Promise<boolean> {
    try {
      const count = await this.prisma.url.count({
        where: { shortCode }
      });
      return count > 0;
    } catch (error) {
      throw new AppError('Erro ao verificar existência da URL', 500);
    }
  }
}