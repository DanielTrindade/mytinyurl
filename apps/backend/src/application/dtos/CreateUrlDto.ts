import { z } from 'zod';

export const createUrlSchema = z.object({
  originalUrl: z.string()
    .url({ message: 'URL inválida. A URL deve começar com http:// ou https:// e ser um endereço válido' })
    .transform(url => {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Protocolo inválido');
        }
        return parsed.toString();
      } catch {
        throw new Error('URL inválida');
      }
    })
});

export interface CreateUrlDto {
  originalUrl: string;
  expiresAt?: string;
}

export type CreateUrlDtoZod = z.infer<typeof createUrlSchema>;