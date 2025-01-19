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
  ) {}

  private static getBrasiliaTime(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  }

  public static create(
    originalUrl: string,
    shortCode: string,
    expiresAt?: Date
  ): Url {
    const brasiliaTime = this.getBrasiliaTime();
    return new Url(
      crypto.randomUUID(),
      originalUrl,
      shortCode,
      0,
      brasiliaTime,
      brasiliaTime,
      expiresAt // expiresAt já deve vir ajustado do caso de uso
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
    this.updatedAt = Url.getBrasiliaTime();
  }

  public deactivate(): void {
    this.active = false;
    this.updatedAt = Url.getBrasiliaTime();
  }

  public isValidForRedirect(): boolean {
    if (!this.active) return false;
    
    if (this.expiresAt) {
      const brasiliaTime = Url.getBrasiliaTime();
      
      console.log("Horário de Expiração:", this.expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
      console.log("Horário Atual (Brasília):", brasiliaTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
      console.log("comparacao", this.expiresAt < brasiliaTime);
      
      if (this.expiresAt < brasiliaTime) return false;
    }
    return true;
  }

  // Getters permanecem os mesmos
  public getId(): string { return this.id; }
  public getOriginalUrl(): string { return this.originalUrl; }
  public getShortCode(): string { return this.shortCode; }
  public getVisits(): number { return this.visits; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }
  public getExpiresAt(): Date | undefined { return this.expiresAt; }
  public isActive(): boolean { return this.active; }
}