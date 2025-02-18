import { Url as PrismaUrl } from '@prisma/client';
import { Url } from '@domain/entities/Url';
import { ExpirationDate } from '@domain/value-objects/ExpirationDate';
import { Result } from '@shared/core/Result';

export class UrlMapper {
  static toDomain(raw: PrismaUrl): Result<Url> {
    // Garantir que temos uma data de expiração
    const expirationDate = raw.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const expirationResult = ExpirationDate.create(expirationDate);
    if (expirationResult.isFailure) {
      return Result.fail<Url>('Data de expiração inválida');
    }

    return Url.reconstruct({
      id: raw.id,
      originalUrl: raw.originalUrl,
      shortCode: raw.shortCode,
      visits: raw.visits,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      expiresAt: expirationResult.getValue(),
      isActive: raw.isActive
    });
  }

  static toPrisma(url: Url): PrismaUrl {
    return {
      id: url.getId(),
      originalUrl: url.getOriginalUrl(),
      shortCode: url.getShortCode(),
      visits: url.getVisits(),
      createdAt: url.getCreatedAt(),
      updatedAt: url.getUpdatedAt(),
      expiresAt: url.getExpiresAt(),
      isActive: url.isActive()
    };
  }
}