import { IUrlRepository } from "@/domain/repositories/IUrlRepository";

export class RedirectUrl {
  constructor(private urlRepository: IUrlRepository) {}

  async execute(shortCode: string): Promise<string> {
    const url = await this.urlRepository.findByShortCode(shortCode);
    console.log("minha url",url);
    if (!url) {
      throw new Error('URL not found');
    }
    console.log("verifica a minha url", !url.isValidForRedirect());
    if (!url.isValidForRedirect()) {
      throw new Error('URL is not active or has expired');
    }

    url.incrementVisits();
    await this.urlRepository.save(url);

    return url.getOriginalUrl();
  }
}