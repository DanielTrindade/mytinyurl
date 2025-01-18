import { IUrlRepository } from '@domain/repositories/IUrlRepository';
import { UrlStatsDto } from '@application/dtos/UrlStatsDto';
import { AppError } from '@shared/errors/AppError';

export class GetUrlStats {
  constructor(private urlRepository: IUrlRepository) {}

  async execute(shortCode: string): Promise<UrlStatsDto> {
    const url = await this.urlRepository.findByShortCode(shortCode);

    if (!url) {
      throw new AppError('URL not found', 404);
    }

    return {
      shortCode: url.getShortCode(),
      originalUrl: url.getOriginalUrl(),
      visits: url.getVisits(),
      isActive: url.isActive(),
      createdAt: url.getCreatedAt(),
      lastAccess: url.getUpdatedAt(),
      expiresAt: url.getExpiresAt()
    };
  }
}