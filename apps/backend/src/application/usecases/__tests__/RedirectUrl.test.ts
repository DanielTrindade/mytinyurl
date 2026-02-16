import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedirectUrl } from '@application/usecases/RedirectUrl';
import { IUrlRepository } from '@domain/repositories/IUrlRepository';
import { Url } from '@domain/entities/Url';
import { AppError } from '@shared/errors/AppError';

function createMockRepository(): IUrlRepository {
    return {
        create: vi.fn().mockResolvedValue(undefined),
        findByShortCode: vi.fn().mockResolvedValue(null),
        findAll: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue(false),
        recordClick: vi.fn().mockResolvedValue(undefined),
    };
}

function createActiveUrl(overrides?: { expiresAt?: Date; active?: boolean }): Url {
    const expiresAt = overrides?.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000);
    const url = Url.reconstruct({
        id: 'test-id-123',
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        visits: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
        expiresAt,
        isActive: overrides?.active ?? true,
    });
    return url;
}

describe('RedirectUrl UseCase', () => {
    let useCase: RedirectUrl;
    let mockRepo: IUrlRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRepo = createMockRepository();
        useCase = new RedirectUrl(mockRepo);
    });

    it('should return the original URL for a valid short code', async () => {
        const url = createActiveUrl();
        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(url);

        const result = await useCase.execute('abc123');

        expect(result).toBe('https://example.com');
    });

    it('should increment the visit counter', async () => {
        const url = createActiveUrl();
        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(url);

        await useCase.execute('abc123');

        expect(url.getVisits()).toBe(6); // was 5, now 6
        expect(mockRepo.save).toHaveBeenCalledWith(url);
    });

    it('should record a click for analytics', async () => {
        const url = createActiveUrl();
        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(url);

        await useCase.execute('abc123');

        expect(mockRepo.recordClick).toHaveBeenCalledWith('test-id-123');
    });

    it('should throw AppError 404 when URL is not found', async () => {
        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        await expect(useCase.execute('notfound'))
            .rejects.toThrow(AppError);

        try {
            await useCase.execute('notfound');
        } catch (e) {
            expect(e).toBeInstanceOf(AppError);
            expect((e as AppError).statusCode).toBe(404);
            expect((e as AppError).message).toBe('URL not found');
        }
    });

    it('should throw AppError 410 when URL is expired', async () => {
        const expiredUrl = createActiveUrl({
            expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        });
        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(expiredUrl);

        try {
            await useCase.execute('abc123');
            expect.fail('Should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(AppError);
            expect((e as AppError).statusCode).toBe(410);
        }
    });

    it('should throw AppError 410 when URL is deactivated', async () => {
        const deactivatedUrl = createActiveUrl({ active: false });
        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(deactivatedUrl);

        try {
            await useCase.execute('abc123');
            expect.fail('Should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(AppError);
            expect((e as AppError).statusCode).toBe(410);
        }
    });

    it('should not save or record click when URL is not found', async () => {
        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        try {
            await useCase.execute('notfound');
        } catch {
            // expected
        }

        expect(mockRepo.save).not.toHaveBeenCalled();
        expect(mockRepo.recordClick).not.toHaveBeenCalled();
    });
});
