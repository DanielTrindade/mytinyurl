import { PrismaUrlRepository } from '@infrastructure/database/repositories/PrismaUrlRepository';
import { CreateShortUrl } from '@application/usecases/CreateShortUrl';
import { RedirectUrl } from '@application/usecases/RedirectUrl';
import { GetUrlStats } from '@application/usecases/GetUrlStats';
import { UrlController } from '@infrastructure/http/controllers/UrlController';
import { InMemoryUrlCache } from '@infrastructure/cache/InMemoryUrlCache';
import { prismaClient } from '@/infrastructure/database/prisma-client';

// Instância do Prisma
const prisma = prismaClient;

// Cache
const urlCache = new InMemoryUrlCache({
  maxEntries: 10_000,
  ttlMs: 5 * 60 * 1000, // 5 minutes
});

// Repositories
const urlRepository = new PrismaUrlRepository(prisma);

// Use Cases
const createShortUrl = new CreateShortUrl(urlRepository);
const redirectUrl = new RedirectUrl(urlRepository, urlCache);
const getUrlStats = new GetUrlStats(urlRepository);

// Controllers
const urlController = new UrlController(
  createShortUrl,
  redirectUrl,
  getUrlStats
);

export const container = {
  prisma,
  urlCache,
  urlRepository,
  createShortUrl,
  redirectUrl,
  getUrlStats,
  urlController,
};