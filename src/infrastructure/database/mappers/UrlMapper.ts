import { Url as PrismaUrl } from '@prisma/client';
import { Url } from '@domain/entities/Url';

export class UrlMapper {
  static toDomain(raw: PrismaUrl): Url {
    return Url.reconstruct({
      id: raw.id,
      originalUrl: raw.originalUrl,
      shortCode: raw.shortCode,
      visits: raw.visits,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      expiresAt: raw.expiresAt || undefined,
      isActive: raw.isActive
    });
  }

  static toPrisma(url: Url): Omit<PrismaUrl, 'clicks'> {
    return {
      id: url.getId(),
      originalUrl: url.getOriginalUrl(),
      shortCode: url.getShortCode(),
      visits: url.getVisits(),
      createdAt: url.getCreatedAt(),
      updatedAt: url.getUpdatedAt(),
      expiresAt: url.getExpiresAt() ?? null,
      isActive: url.isActive()
    };
  }
}