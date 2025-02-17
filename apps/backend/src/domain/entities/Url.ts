import { Result } from "@/shared/core/Result";
import { ExpirationDate } from "../value-objects/ExpirationDate";

interface UrlProps {
  id: string;
  originalUrl: string;
  shortCode: string;
  visits: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: ExpirationDate;
  isActive: boolean;
}

export class Url {
  private constructor(
    private readonly id: string,
    private readonly originalUrl: string,
    private readonly shortCode: string,
    private visits: number,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private readonly expiresAt?: ExpirationDate,
    private active: boolean = true
  ) {}

  private static getBrasiliaTime(): Date {
    const date = new Date();
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  }

  public static create(
    originalUrl: string,
    shortCode: string,
    expiresAt: Date
  ): Result<Url> {
    const expirationResult = ExpirationDate.create(expiresAt);
    if (expirationResult.isFailure) {
      return Result.fail<Url>(expirationResult.error);
    }

    return Result.ok<Url>(new Url(
      crypto.randomUUID(),
      originalUrl,
      shortCode,
      0,
      new Date(),
      new Date(),
      expirationResult.getValue(),
      true
    ));
  }

  public static reconstruct(props: UrlProps): Result<Url> {
    if (!props.id) {
      return Result.fail<Url>('ID é obrigatório');
    }

    if (!props.originalUrl) {
      return Result.fail<Url>('URL original é obrigatória');
    }

    if (!props.shortCode) {
      return Result.fail<Url>('Short code é obrigatório');
    }

    if (props.visits < 0) {
      return Result.fail<Url>('Número de visitas não pode ser negativo');
    }

    if (!props.createdAt) {
      return Result.fail<Url>('Data de criação é obrigatória');
    }

    if (!props.updatedAt) {
      return Result.fail<Url>('Data de atualização é obrigatória');
    }

    return Result.ok<Url>(new Url(
      props.id,
      props.originalUrl,
      props.shortCode,
      props.visits,
      props.createdAt,
      props.updatedAt,
      props.expiresAt,
      props.isActive
    ));
  }

  public incrementVisits(): void {
    this.visits++;
    this.updatedAt = Url.getBrasiliaTime();
  }

  public deactivate(): void {
    this.active = false;
    this.updatedAt = Url.getBrasiliaTime();
  }

  public isValidForRedirect(): boolean {
    if (!this.active) return false;
    
    if (this.expiresAt) {
      return !this.expiresAt.isPast();
    }

    return true;
  }

  public getId(): string {
    return this.id;
  }

  public getOriginalUrl(): string {
    return this.originalUrl;
  }

  public getShortCode(): string {
    return this.shortCode;
  }

  public getVisits(): number {
    return this.visits;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public getExpiresAt(): Date | undefined {
    return this.expiresAt?.getValue();
  }

  public isActive(): boolean {
    return this.active;
  }
}