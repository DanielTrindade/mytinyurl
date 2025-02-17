import { AppError } from "@/shared/errors/AppError";
import { IUrlRepository } from "@domain/repositories/IUrlRepository";

export class RedirectUrl {
  constructor(private urlRepository: IUrlRepository) {}

  async execute(shortCode: string): Promise<string> {
    const url = await this.urlRepository.findByShortCode(shortCode);
    
    if (!url) {
      throw new AppError('URL não encontrada', 404);
    }
  
    if (!url.isValidForRedirect()) {
      throw new AppError('URL expirada ou inativa', 410);
    }
    url.incrementVisits();
    await this.urlRepository.save(url);
  
    return url.getOriginalUrl();
  }
}