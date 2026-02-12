import { IUrlRepository } from "@domain/repositories/IUrlRepository";
import { AppError } from "@shared/errors/AppError";
import { InMemoryUrlCache } from "@infrastructure/cache/InMemoryUrlCache";

export class RedirectUrl {
  constructor(
    private urlRepository: IUrlRepository,
    private cache?: InMemoryUrlCache
  ) { }

  async execute(shortCode: string): Promise<string> {
    // Check cache first
    if (this.cache) {
      const cached = this.cache.get(shortCode);
      if (cached) {
        // Fire-and-forget: still record click and increment visits
        this.urlRepository.findByShortCode(shortCode).then(url => {
          if (url) {
            url.incrementVisits();
            this.urlRepository.save(url);
            this.urlRepository.recordClick(url.getId());
          }
        });
        return cached;
      }
    }

    const url = await this.urlRepository.findByShortCode(shortCode);

    if (!url) {
      throw new AppError('URL not found', 404);
    }

    if (!url.isValidForRedirect()) {
      throw new AppError('URL is not active or has expired', 410);
    }

    url.incrementVisits();
    await this.urlRepository.save(url);

    // Record click for analytics
    await this.urlRepository.recordClick(url.getId());

    // Populate cache for next request
    if (this.cache) {
      this.cache.set(shortCode, url.getOriginalUrl());
    }

    return url.getOriginalUrl();
  }
}