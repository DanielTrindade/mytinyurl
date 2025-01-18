import { z } from 'zod';

export const createUrlSchema = z.object({
  originalUrl: z.string()
    .url({ message: 'URL inválida. A URL deve começar com http:// ou https:// e ser um endereço válido' })
    .transform(url => {
      try {
        return new URL(url).toString();
      } catch {
        return url;
      }
    }),
  expiresAt: z.string()
    .datetime({ message: 'Data de expiração inválida. Use o formato ISO 8601 (ex: 2024-01-20T00:00:00Z)' })
    .optional()
});

export type CreateUrlDto = z.infer<typeof createUrlSchema>;