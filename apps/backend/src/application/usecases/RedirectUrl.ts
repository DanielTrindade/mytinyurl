import { AppError } from "@/shared/errors/AppError";
import { IUrlRepository } from "@domain/repositories/IUrlRepository";

interface RedirectResult {
  url: string;
  type: 'permanent' | 'temporary';
  cacheDuration: number | null; // alterado para poder ser null quando não deve ter cache
  shouldCache: boolean; // novo campo para controlar se deve ou não fazer cache
}

export class RedirectUrl {
  constructor(private urlRepository: IUrlRepository) {}

  async execute(shortCode: string): Promise<RedirectResult> {
    const url = await this.urlRepository.findByShortCode(shortCode);
    
    if (!url) {
      throw new AppError('URL não encontrada', 404);
    }
  
    if (!url.isValidForRedirect()) {
      throw new AppError('URL expirada ou inativa', 410);
    }

    url.incrementVisits();
    await this.urlRepository.save(url);
  
    const { shouldCache, duration } = this.determineCachePolicy(url);

    return {
      url: url.getOriginalUrl(),
      type: 'temporary', // Todas as URLs são temporárias por padrão
      cacheDuration: duration,
      shouldCache
    };
  }

  private determineCachePolicy(url: any): { shouldCache: boolean; duration: number | null } {
    const expiresAt = url.getExpiresAt();
    if (!expiresAt) {
      return { shouldCache: true, duration: 86400 }; // 24 horas em segundos
    }
    
    const now = new Date();
    const timeUntilExpiration = expiresAt.getTime() - now.getTime();
    const ONE_HOUR = 3600000; // 1 hora em milissegundos

    // Se expira em menos de 1 hora, não faz cache
    if (timeUntilExpiration < ONE_HOUR) {
      return { shouldCache: false, duration: null };
    }
    
    // Cache por no máximo 1 hora
    return { 
      shouldCache: true, 
      duration: Math.min(3600, Math.floor(timeUntilExpiration / 1000))
    };
  }
}