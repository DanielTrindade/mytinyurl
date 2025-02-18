import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateShortUrl } from '@/application/usecases/CreateShortUrl';
import { RedirectUrl } from '@application/usecases/RedirectUrl';
import { GetUrlStats } from '@application/usecases/GetUrlStats';
import { createUrlSchema } from '@application/dtos/CreateUrlDto';
import { AppError } from '@/shared/errors/AppError';

export class UrlController {
  constructor(
    private createShortUrl: CreateShortUrl,
    private redirectUrl: RedirectUrl,
    private getUrlStats: GetUrlStats
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createUrlSchema.parse(request.body);
    
    const urlResult = await this.createShortUrl.execute(input);
    
    if (urlResult.isFailure) {
      throw new AppError(urlResult.error, 400);
    }
  
    const url = urlResult.getValue();
    
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
    const result = await this.redirectUrl.execute(shortCode);

    // Define os headers de segurança
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Define os headers de cache baseado na política de cache
    if (result.shouldCache && result.cacheDuration) {
      reply.header('Cache-Control', `public, max-age=${result.cacheDuration}`);
      const expiresDate = new Date(Date.now() + result.cacheDuration * 1000);
      reply.header('Expires', expiresDate.toUTCString());
    } else {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }

    return reply.status(302)
      .header('Location', result.url)
      .send();
  }

  async getStats(request: FastifyRequest<{
    Params: { shortCode: string }
  }>, reply: FastifyReply) {
    const { shortCode } = request.params;
    
    const stats = await this.getUrlStats.execute(shortCode);
    
    return reply.send(stats);
  }
}