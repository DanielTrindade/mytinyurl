import { IUrlRepository } from '@domain/repositories/IUrlRepository';
import { CreateUrlDto } from '@application/dtos/CreateUrlDto';
import { Url } from '@domain/entities/Url';
import { generateShortCode } from '@shared/utils/shortCode';
import { AppError } from '@shared/errors/AppError';

const MAX_SHORT_CODE_RETRIES = 5;

export class CreateShortUrl {
  constructor(private urlRepository: IUrlRepository) { }

  async execute(data: CreateUrlDto): Promise<Url> {
    // BUG 9 fix: Prevent self-referential URLs
    const appUrl = process.env.APP_URL;
    if (appUrl) {
      try {
        const targetHost = new URL(data.originalUrl).hostname;
        const appHost = new URL(appUrl).hostname;
        if (targetHost === appHost) {
          throw new AppError('Cannot shorten URLs pointing to this service', 400);
        }
      } catch (e) {
        if (e instanceof AppError) throw e;
        // URL parsing failed — will be caught by Zod validation
      }
    }

    // BUG 3 fix: Retry on short code collision
    let shortCode: string;
    let attempts = 0;

    do {
      shortCode = generateShortCode();
      const exists = await this.urlRepository.exists(shortCode);
      if (!exists) break;
      attempts++;
      if (attempts >= MAX_SHORT_CODE_RETRIES) {
        throw new AppError('Failed to generate unique short code, please try again', 409);
      }
    } while (true);

    // BUG 1 fix: Use UTC dates, no more toLocaleString timezone hacks
    let expiresAt: Date;

    if (data.expiresAt) {
      expiresAt = new Date(data.expiresAt);
    } else {
      // Default: 24 hours from now
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const url = Url.create(
      data.originalUrl,
      shortCode,
      expiresAt
    );

    await this.urlRepository.create(url);

    return url;
  }
}