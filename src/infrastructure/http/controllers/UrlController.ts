import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateShortUrl } from '@application/usecases/CreateShortUrl';
import { RedirectUrl } from '@application/usecases/RedirectUrl';
import { GetUrlStats } from '@application/usecases/GetUrlStats';
import { createUrlSchema } from '@application/dtos/CreateUrlDto';

export class UrlController {
  constructor(
    private createShortUrl: CreateShortUrl,
    private redirectUrl: RedirectUrl,
    private getUrlStats: GetUrlStats
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createUrlSchema.parse(request.body);
    
    const url = await this.createShortUrl.execute(input);
    
    return reply.status(201).send({
      shortCode: url.getShortCode(),
      shortUrl: `${process.env.APP_URL}/${url.getShortCode()}`,
      originalUrl: url.getOriginalUrl(),
      expiresAt: url.getExpiresAt()
    });
  }

  async redirect(request: FastifyRequest<{
    Params: { shortCode: string }
  }>, reply: FastifyReply) {
    const { shortCode } = request.params;
    const originalUrl = await this.redirectUrl.execute(shortCode);
    return reply.status(301).redirect(originalUrl);
  }

  async getStats(request: FastifyRequest<{
    Params: { shortCode: string }
  }>, reply: FastifyReply) {
    const { shortCode } = request.params;
    
    const stats = await this.getUrlStats.execute(shortCode);
    
    return reply.send(stats);
  }
}