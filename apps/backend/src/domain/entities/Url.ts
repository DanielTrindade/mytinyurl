import { Result } from "@/shared/core/Result";
import { ExpirationDate } from "../value-objects/ExpirationDate";

interface UrlProps {
  id: string;
  originalUrl: string;
  shortCode: string;
  visits: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: ExpirationDate;
  isActive: boolean;
}

interface CreateUrlProps {
  originalUrl: string;
  shortCode: string;
  expiresAt?: Date;
}

export class Url {
  private constructor(
    private readonly id: string,
    private readonly originalUrl: string,
    private readonly shortCode: string,
    private visits: number,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private readonly expiresAt: ExpirationDate,
    private active: boolean = true
  ) {}

  public static create(props: CreateUrlProps): Result<Url> {
    const expirationResult = ExpirationDate.create(props.expiresAt);
    
    if (expirationResult.isFailure) {
      return Result.fail<Url>(expirationResult.error);
    }

    return Result.ok<Url>(new Url(
      crypto.randomUUID(),
      props.originalUrl,
      props.shortCode,
      0,
      new Date(),
      new Date(),
      expirationResult.getValue(),
      true
    ));
  }

  public static reconstruct(props: UrlProps): Result<Url> {
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

  public getExpiresAt(): Date {
    return this.expiresAt.getValue();
  }

  public isActive(): boolean {
    return this.active;
  }

  public incrementVisits(): void {
    this.visits++;
    this.updatedAt = new Date();
  }

  public deactivate(): void {
    this.active = false;
    this.updatedAt = new Date();
  }

  public isValidForRedirect(): boolean {
    if (!this.active) return false;
    return !this.expiresAt.isPast();
  }
}