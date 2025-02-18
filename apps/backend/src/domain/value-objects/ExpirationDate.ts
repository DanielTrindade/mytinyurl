// src/domain/value-objects/ExpirationDate.ts
import { Result } from '@shared/core/Result';

export class ExpirationDate {
  private constructor(private readonly value: Date) {}

  public static create(date?: string | Date): Result<ExpirationDate> {
    // Se não forneceu data, cria com 24h a partir de agora
    if (!date) {
      const future = new Date();
      future.setHours(future.getHours() + 24);
      return Result.ok(new ExpirationDate(future));
    }

    // Converte para Date se for string
    const expirationDate = typeof date === 'string' ? new Date(date) : date;

    // Verifica se é uma data válida
    if (isNaN(expirationDate.getTime())) {
      return Result.fail('Data de expiração inválida');
    }

    // Verifica se é futura
    if (expirationDate <= new Date()) {
      return Result.fail('A data de expiração deve ser futura');
    }

    return Result.ok(new ExpirationDate(expirationDate));
  }

  public getValue(): Date {
    return this.value;
  }

  public isPast(): boolean {
    return this.value < new Date();
  }

  public isNearExpiration(): boolean {
    const now = new Date();
    const timeUntilExpiration = this.value.getTime() - now.getTime();
    const ONE_HOUR = 3600000; // 1 hora em milissegundos
    return timeUntilExpiration < ONE_HOUR;
  }
}