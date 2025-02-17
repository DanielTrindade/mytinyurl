import { IUrlRepository } from '@domain/repositories/IUrlRepository';
import { CreateUrlDto } from '@application/dtos/CreateUrlDto';
import { Url } from '@domain/entities/Url';
import { generateShortCode } from '@shared/utils/shortCode';
import { AppError } from '@/shared/errors/AppError';
import { ExpirationDate } from '@/domain/value-objects/ExpirationDate';
import { Result } from '@/shared/core/Result';

export class CreateShortUrl {
  constructor(private urlRepository: IUrlRepository) {}

  async execute(data: CreateUrlDto): Promise<Result<Url>> {
    try {
      // Gera o shortCode e verifica unicidade
      let shortCode: string;
      let attempts = 0;
      const maxAttempts = 3;

      do {
        shortCode = generateShortCode();
        const exists = await this.urlRepository.exists(shortCode);
        if (!exists) break;
        attempts++;
        if (attempts >= maxAttempts) {
          return Result.fail<Url>('Não foi possível gerar um código único após várias tentativas');
        }
      } while (true);

      // Criar ExpirationDate
      const expirationResult = ExpirationDate.create(data.expiresAt);
      if (expirationResult.isFailure) {
        return Result.fail<Url>(expirationResult.error);
      }

      // Criar a URL
      const urlResult = Url.create(
        data.originalUrl,
        shortCode,
        expirationResult.getValue().getValue()
      );

      if (urlResult.isFailure) {
        return Result.fail<Url>(urlResult.error);
      }

      const url = urlResult.getValue();

      // Salvar no repositório
      await this.urlRepository.create(url);

      return Result.ok<Url>(url);
    } catch (error) {
      if (error instanceof AppError) {
        return Result.fail<Url>(error.message);
      }
      return Result.fail<Url>('Erro ao criar URL encurtada');
    }
  }
}