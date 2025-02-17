import { Url as PrismaUrl } from '@prisma/client';
import { Url } from '@domain/entities/Url';
import { ExpirationDate } from '@domain/value-objects/ExpirationDate';
import { Result } from '@shared/core/Result';

export class UrlMapper {
  static toDomain(raw: PrismaUrl): Result<Url> {
    let expirationDate: ExpirationDate | undefined;
    
    if (raw.expiresAt) {
      const expirationResult = ExpirationDate.create(raw.expiresAt);
      if (expirationResult.isFailure) {
        return Result.fail<Url>('Data de expiração inválida');
      }
      expirationDate = expirationResult.getValue();
    }

    return Url.reconstruct({
      id: raw.id,
      originalUrl: raw.originalUrl,
      shortCode: raw.shortCode,
      visits: raw.visits,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      expiresAt: expirationDate,
      isActive: raw.isActive
    });
  }

  static toPrisma(url: Url): Omit<PrismaUrl, 'clicks'> {
    const data = {
      id: url.getId(),
      originalUrl: url.getOriginalUrl(),
      shortCode: url.getShortCode(),
      visits: url.getVisits(),
      createdAt: url.getCreatedAt(),
      updatedAt: url.getUpdatedAt(),
      expiresAt: url.getExpiresAt() || null,
      isActive: url.isActive()
    };
  
    return data;
  }
}
