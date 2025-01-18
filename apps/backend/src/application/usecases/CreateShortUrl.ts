import { IUrlRepository } from '@domain/repositories/IUrlRepository';
import { CreateUrlDto } from '@application/dtos/CreateUrlDto';
import { Url } from '@domain/entities/Url';
import { generateShortCode } from '@shared/utils/shortCode';

export class CreateShortUrl {
  constructor(private urlRepository: IUrlRepository) {}

  async execute(data: CreateUrlDto): Promise<Url> {
    const shortCode = generateShortCode();
    
    // Verifica se o código já existe
    const exists = await this.urlRepository.exists(shortCode);
    if (exists) {
      throw new Error('Short code already exists');
    }

    let expiresAt: Date;
    
    if (data.expiresAt) {
      // Usa a data fornecida
      expiresAt = new Date(data.expiresAt);
    } else {
      // Define expiração para 24 horas a partir de agora
      const now = new Date();
      expiresAt = new Date(now.setHours(now.getHours() + 24));
    }

    // Ajusta para o fuso horário de Brasília
    expiresAt = new Date(expiresAt.toLocaleString('en-US', { 
      timeZone: 'America/Sao_Paulo'
    }));
    
    console.log('Data de expiração:', 
      expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    );

    const url = Url.create(
      data.originalUrl,
      shortCode,
      expiresAt
    );

    await this.urlRepository.create(url);

    return url;
  }
}