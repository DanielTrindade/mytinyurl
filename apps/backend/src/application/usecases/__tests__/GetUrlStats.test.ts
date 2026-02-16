import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUrlStats } from '@application/usecases/GetUrlStats';
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

describe('GetUrlStats UseCase', () => {
    let useCase: GetUrlStats;
    let mockRepo: IUrlRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRepo = createMockRepository();
        useCase = new GetUrlStats(mockRepo);
    });

    it('should return stats DTO for an existing URL', async () => {
        const createdAt = new Date('2024-01-01');
        const updatedAt = new Date('2024-06-01');
        const expiresAt = new Date('2025-01-01');

        const url = Url.reconstruct({
            id: 'test-id',
            originalUrl: 'https://example.com',
            shortCode: 'abc123',
            visits: 42,
            createdAt,
            updatedAt,
            expiresAt,
            isActive: true,
        });

        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(url);

        const stats = await useCase.execute('abc123');

        expect(stats).toEqual({
            shortCode: 'abc123',
            originalUrl: 'https://example.com',
            visits: 42,
            isActive: true,
            createdAt,
            lastAccess: updatedAt,
            expiresAt,
        });
    });

    it('should return stats without expiresAt when URL has no expiration', async () => {
        const url = Url.reconstruct({
            id: 'test-id',
            originalUrl: 'https://example.com',
            shortCode: 'abc123',
            visits: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
        });

        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(url);

        const stats = await useCase.execute('abc123');

        expect(stats.expiresAt).toBeUndefined();
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

    it('should call findByShortCode with the correct short code', async () => {
        const url = Url.reconstruct({
            id: 'test-id',
            originalUrl: 'https://example.com',
            shortCode: 'xyz789',
            visits: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
        });
        (mockRepo.findByShortCode as ReturnType<typeof vi.fn>).mockResolvedValue(url);

        await useCase.execute('xyz789');

        expect(mockRepo.findByShortCode).toHaveBeenCalledWith('xyz789');
    });
});
