// src/infrastructure/container/index.ts
import { PrismaClient } from '@prisma/client';
import { PrismaUrlRepository } from '../database/repositories/PrismaUrlRepository';
import { CreateShortUrl } from '../../application/usecases/CreateShortUrl';
import { RedirectUrl } from '../../application/usecases/RedirectUrl';
import { GetUrlStats } from '../../application/usecases/GetUrlStats';
import { UrlController } from '../http/controllers/UrlController';

// Instância do Prisma
const prisma = new PrismaClient();

// Repositories
const urlRepository = new PrismaUrlRepository(prisma);

// Use Cases
const createShortUrl = new CreateShortUrl(urlRepository);
const redirectUrl = new RedirectUrl(urlRepository);
const getUrlStats = new GetUrlStats(urlRepository);

// Controllers
const urlController = new UrlController(
  createShortUrl,
  redirectUrl,
  getUrlStats
);

export const container = {
  prisma,
  urlRepository,
  createShortUrl,
  redirectUrl,
  getUrlStats,
  urlController,
};