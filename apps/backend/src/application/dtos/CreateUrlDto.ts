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
});

export type CreateUrlDto = z.infer<typeof createUrlSchema>;