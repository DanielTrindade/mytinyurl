import { Url } from '@domain/entities/Url';

export interface IUrlRepository {
  create(url: Url): Promise<void>;
  findByShortCode(shortCode: string): Promise<Url | null>;
  findAll(): Promise<Url[]>;
  save(url: Url): Promise<void>;
  delete(id: string): Promise<void>;
  exists(shortCode: string): Promise<boolean>;
}