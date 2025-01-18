export interface UrlStatsDto {
  shortCode: string;
  originalUrl: string;
  visits: number;
  isActive: boolean;
  createdAt: Date;
  lastAccess?: Date;
  expiresAt?: Date;
}