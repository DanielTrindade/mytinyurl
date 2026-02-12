export class Url {
  private constructor(
    private readonly id: string,
    private readonly originalUrl: string,
    private readonly shortCode: string,
    private visits: number,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private readonly expiresAt?: Date,
    private active: boolean = true
  ) { }

  public static create(
    originalUrl: string,
    shortCode: string,
    expiresAt?: Date
  ): Url {
    const now = new Date();
    return new Url(
      crypto.randomUUID(),
      originalUrl,
      shortCode,
      0,
      now,
      now,
      expiresAt
    );
  }

  public static reconstruct(props: {
    id: string;
    originalUrl: string;
    shortCode: string;
    visits: number;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    isActive: boolean;
  }): Url {
    return new Url(
      props.id,
      props.originalUrl,
      props.shortCode,
      props.visits,
      props.createdAt,
      props.updatedAt,
      props.expiresAt,
      props.isActive
    );
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

    if (this.expiresAt) {
      const now = new Date();
      if (this.expiresAt < now) return false;
    }
    return true;
  }

  // Getters
  public getId(): string { return this.id; }
  public getOriginalUrl(): string { return this.originalUrl; }
  public getShortCode(): string { return this.shortCode; }
  public getVisits(): number { return this.visits; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }
  public getExpiresAt(): Date | undefined { return this.expiresAt; }
  public isActive(): boolean { return this.active; }
}