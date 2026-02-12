import { Url } from '@domain/entities/Url';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IUrlRepository {
  create(url: Url): Promise<void>;
  findByShortCode(shortCode: string): Promise<Url | null>;
  findAll(page?: number, limit?: number): Promise<PaginatedResult<Url>>;
  save(url: Url): Promise<void>;
  delete(id: string): Promise<void>;
  exists(shortCode: string): Promise<boolean>;
  recordClick(urlId: string): Promise<void>;
}